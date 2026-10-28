package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.exception.AccountNotActivatedException;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.exception.UserAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.exception.UserNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthResult;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.TokenPair;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;

import java.util.UUID;

/**
 * Сервис приложения для операций аутентификации: регистрация, вход,
 * обновление токенов, смена пароля и выход.
 * Содержит всю бизнес-логику — контроллеры делегируют выполнение этому сервису.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    /**
     * Фиктивный bcrypt-хеш для выравнивания времени выполнения.
     * Когда пользователь не найден, мы всё равно выполняем passwordEncoder.matches() против этого хеша,
     * чтобы предотвратить перебор имён пользователей через тайминговый сторонний канал (CWE-208).
     */
    private static final String DUMMY_HASH =
            "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";

    private final AuthUserPort authUserPort;
    private final TokenPort tokenPort;
    private final PasswordEncoder passwordEncoder;
    private final RegistrationSettingsService registrationSettings;

    /**
     * Регистрирует нового пользователя с указанными учётными данными.
     * Пользователь создаётся активным без ролей и без обязательной смены своего пароля.
     * Токены выдаются при последующем входе.
     *
     * @param login           желаемый логин
     * @param password        пароль
     * @param confirmPassword подтверждение пароля
     * @return созданный principal пользователя (без токенов)
     */
    @Transactional
    public UserPrincipal register(String login, String password, String confirmPassword) {
        registrationSettings.requireEnabled();
        if (!password.equals(confirmPassword)) {
            throw new ValidationException("Password and confirmation do not match");
        }

        if (authUserPort.existsByLogin(login)) {
            throw new UserAlreadyExistsException("User with login '" + login + "' already exists");
        }

        String hashedPassword = passwordEncoder.encode(password);
        AuthUserData savedUser = authUserPort.save(login, hashedPassword);

        log.info("Зарегистрирован новый пользователь: {} (id={})", savedUser.login(), savedUser.id());
        return toUserPrincipal(savedUser);
    }

    /**
     * Аутентифицирует пользователя по логину и паролю.
     * Случаи "пользователь не найден" и "неверный пароль" возвращают одно и то же сообщение,
     * чтобы предотвратить перебор имён пользователей. Неактивированный аккаунт возвращает отдельную ошибку HTTP 403.
     *
     * @param login    логин пользователя
     * @param password пароль пользователя
     * @return результат аутентификации с токенами и информацией о пользователе
     * @throws AuthenticationException если логин или пароль неверны (HTTP 401)
     * @throws AccountNotActivatedException если аккаунт не активирован (HTTP 403)
     */
    @Transactional
    public AuthResult login(String login, String password) {
        AuthUserData user = authUserPort.findByLogin(login)
                .orElse(null);

        if (user == null) {
            passwordEncoder.matches(password, DUMMY_HASH); // выравнивание времени выполнения
            log.warn("Неуспешный вход: пользователь с логином '{}' не найден", login);
            throw new AuthenticationException("Неверный логин или пароль");
        }

        if (!"LOCAL".equals(user.authSource()) || !passwordEncoder.matches(password, user.passwordHash())) {
            log.warn("Неуспешный вход: неверный пароль для пользователя '{}'", login);
            throw new AuthenticationException("Неверный логин или пароль");
        }

        if (!user.activated()) {
            log.warn("Неуспешный вход: пользователь '{}' не активирован", login);
            throw new AccountNotActivatedException("Аккаунт не активирован. Обратитесь к администратору");
        }

        UserPrincipal principal = toUserPrincipal(user);
        TokenPair tokenPair = tokenPort.generateTokenPair(principal);
        tokenPort.saveRefreshToken(user.id(), tokenPair.refreshToken());

        log.debug("Пользователь вошёл в систему: {}", login);
        return new AuthResult(tokenPair, principal);
    }

    /**
     * Обновляет пару токенов, используя уже разобранный principal пользователя и валидный refresh-токен.
     * Принимает UserPrincipal (разобранный в контроллере) вместо сырой строки access-токена.
     * Использует атомарную операцию compare-and-delete для предотвращения гонки TOCTOU при ротации токенов.
     *
     * @param principal    principal пользователя, разобранный из (возможно, истёкшего) access-токена
     * @param refreshToken refresh-токен из httpOnly cookie
     * @return результат аутентификации с новыми токенами и информацией о пользователе
     */
    @Transactional
    public AuthResult refresh(UserPrincipal principal, String refreshToken) {
        if (!tokenPort.validateRefreshToken(refreshToken)) {
            throw new AuthenticationException("Refresh token has expired");
        }

        // Атомарный compare-and-delete. Если возвращает false, токен уже был использован.
        if (!tokenPort.atomicReplaceRefreshToken(principal.id(), refreshToken)) {
            throw new AuthenticationException("Refresh token is not recognized or already used");
        }

        // Перечитываем пользователя из БД, чтобы получить актуальное состояние
        AuthUserData user = authUserPort.findById(principal.id())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (!user.activated()) {
            throw new AccountNotActivatedException("Аккаунт не активирован. Обратитесь к администратору");
        }

        UserPrincipal freshPrincipal = toUserPrincipal(user);
        TokenPair newTokenPair = tokenPort.generateTokenPair(freshPrincipal);
        tokenPort.saveRefreshToken(user.id(), newTokenPair.refreshToken());

        log.info("Токены обновлены для пользователя: {}", freshPrincipal.login());
        return new AuthResult(newTokenPair, freshPrincipal);
    }

    /**
     * Изменяет пароль для указанного пользователя.
     * Аннулирует refresh-токены после смены пароля, чтобы принудить к повторному входу.
     *
     * @param userId          идентификатор пользователя (из аутентифицированного principal)
     * @param currentPassword текущий пароль для проверки
     * @param newPassword     новый пароль
     * @param confirmNew      подтверждение нового пароля
     */
    @Transactional
    public void changePassword(UUID userId, String currentPassword,
                               String newPassword, String confirmNew) {
        AuthUserData user = authUserPort.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (!"LOCAL".equals(user.authSource())) {
            throw new ValidationException("Доменный пароль изменяется в каталоге организации");
        }

        if (!passwordEncoder.matches(currentPassword, user.passwordHash())) {
            throw new AuthenticationException("Current password is incorrect");
        }

        if (!newPassword.equals(confirmNew)) {
            throw new ValidationException("New password and confirmation do not match");
        }

        authUserPort.updatePassword(userId, passwordEncoder.encode(newPassword), false);

        // Аннулируем refresh-токен, чтобы принудить к повторному входу после смены пароля
        tokenPort.revokeRefreshToken(userId);

        log.info("Пароль изменён для пользователя: {} (токены отозваны)", user.login());
    }

    /**
     * Выполняет выход пользователя, аннулируя его refresh-токен.
     *
     * @param userId идентификатор пользователя
     */
    @Transactional
    public void logout(UUID userId) {
        tokenPort.revokeRefreshToken(userId);
        log.info("Пользователь вышел из системы: {}", userId);
    }

    /**
     * Проверяет access-токен текущего пользователя и возвращает информацию о нём.
     *
     * @param principal аутентифицированный principal пользователя
     * @return principal пользователя (подтверждённая личность)
     */
    public UserPrincipal validate(UserPrincipal principal) {
        return principal;
    }

    private UserPrincipal toUserPrincipal(AuthUserData userData) {
        return new UserPrincipal(
                userData.id(),
                userData.login(),
                userData.activated(),
                userData.passwordChangeRequired()
        );
    }
}
