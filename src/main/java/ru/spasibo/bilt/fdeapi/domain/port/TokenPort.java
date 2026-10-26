package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.TokenPair;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;

import java.util.UUID;

/**
 * Порт операций с JWT-токенами (генерация, валидация, разбор)
 * и персистентности refresh-токенов (сохранение, отзыв, проверка).
 */
public interface TokenPort {

    /**
     * Генерирует новую пару access/refresh токенов для указанного пользователя.
     *
     * @param principal аутентифицированный пользователь
     * @return пара токенов, содержащая access и refresh токены
     */
    TokenPair generateTokenPair(UserPrincipal principal);

    /**
     * Проверяет подпись и срок действия access-токена.
     *
     * @param token JWT access-токен
     * @return true, если токен валиден
     */
    boolean validateAccessToken(String token);

    /**
     * Проверяет подпись и срок действия refresh-токена.
     *
     * @param token JWT refresh-токен
     * @return true, если токен валиден
     */
    boolean validateRefreshToken(String token);

    /**
     * Извлекает информацию о пользователе из access-токена без строгой проверки срока действия.
     * Используется в процессе обновления, когда access-токен может быть уже просрочен.
     *
     * @param token JWT access-токен (возможно просроченный)
     * @return principal пользователя, извлечённый из claims
     */
    UserPrincipal parseUserFromToken(String token);

    /**
     * Извлекает {@link UserPrincipal} из валидного access-токена.
     * Используется JWT-фильтром после успешной валидации.
     *
     * @param token проверенный access-токен
     * @return principal пользователя или null, если извлечение не удалось
     */
    UserPrincipal extractUserFromAccessToken(String token);

    /**
     * Сохраняет (или обновляет) refresh-токен указанного пользователя в постоянном хранилище.
     *
     * @param userId       идентификатор пользователя
     * @param refreshToken строка refresh-токена
     */
    void saveRefreshToken(UUID userId, String refreshToken);

    /**
     * Отзывает (удаляет) сохранённый refresh-токен указанного пользователя.
     *
     * @param userId идентификатор пользователя
     */
    void revokeRefreshToken(UUID userId);

    /**
     * Проверяет, совпадает ли указанный refresh-токен с сохранённым для пользователя.
     *
     * @param userId       идентификатор пользователя
     * @param refreshToken refresh-токен для проверки
     * @return true, если токен существует и совпадает
     */
    boolean isRefreshTokenValid(UUID userId, String refreshToken);

    /**
     * Атомарно проверяет и удаляет refresh-токен указанного пользователя.
     * Используется при ротации токенов для предотвращения гонок TOCTOU.
     * Если токен совпадает, он удаляется одной атомарной операцией.
     *
     * @param userId       идентификатор пользователя
     * @param refreshToken refresh-токен для проверки и использования
     * @return true, если токен был найден и удалён (валиден); false, если не найден (уже использован или невалиден)
     */
    boolean atomicReplaceRefreshToken(UUID userId, String refreshToken);

    /**
     * Возвращает конкретную причину невалидности access-токена.
     * Используется JWT-фильтром для установки описательного атрибута ошибки в запросе.
     *
     * @param token JWT access-токен
     * @return "token_expired", если просрочен; "token_invalid" при других ошибках; null, если валиден
     */
    String getAccessTokenError(String token);
}