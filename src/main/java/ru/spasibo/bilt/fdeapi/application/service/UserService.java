package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.exception.RoleNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.UserAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.exception.UserNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import ru.spasibo.bilt.fdeapi.domain.port.UserManagementPort;
import ru.spasibo.bilt.fdeapi.util.datetime.SpecificationHelper;
import ru.spasibo.bilt.fdeapi.util.pagination.PaginationUtils;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Сервис приложения для операций управления пользователями (CRUD).
 * Аутентификация остаётся в {@link AuthService} — этот сервис обрабатывает
 * административные операции, такие как просмотр списка, активация и удаление пользователей.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

     /** Разрешённые поля сортировки для списка пользователей. */
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "login", "activated",  "passwordChangeRequired", "createdAt", "updatedAt"
    );

    private final UserRepository userRepository;
    private final UserManagementPort userManagementPort;
    private final AuthUserPort authUserPort;
    private final TokenPort tokenPort;
    private final RolePort rolePort;
    private final PasswordEncoder passwordEncoder;

    /**
     * Возвращает постраничный список всех пользователей.
     *
     * @param page номер страницы (начиная с нуля)
     * @param size размер страницы
     * @param sort поле сортировки и необязательное направление (например, "login" или "createdAt,desc")
     * @return постраничный ответ с данными пользователей
     * @throws ValidationException если поле сортировки отсутствует в списке разрешённых
     */
    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> getAll(int page, int size, String sort, String login,
                                     Boolean activated, Boolean passwordChangeRequired ) {
        Sort sortOrder = parseSort(sort);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        Specification<UserEntity> spec = Specification.allOf();
        if (login != null) {
            spec = spec.and(UserSpecifications.loginLike(login));
        }

        if (activated != null) {
            spec = spec.and(UserSpecifications.activatedEquals(activated));
        }

        if (passwordChangeRequired != null) {
            spec = spec.and(UserSpecifications.passwordChangeRequiredEquals (passwordChangeRequired));
        }

        Page<UserEntity> pageResult = userRepository.findAll(spec, pageRequest);

        List<UserResponse> content = pageResult.getContent().stream()
                .map(this::toPageResponse)
                .collect(Collectors.toList());

        return PagedResponse.<UserResponse>builder()
                .content(content)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .build();
    }

    /// /-->
    /**
     * Возвращает постраничный список пользователей, назначенных указанной роли.
     *
     * @param roleId идентификатор роли
     * @param page   номер страницы (начиная с нуля)
     * @param size   размер страницы
     * @param sort   поле сортировки и необязательное направление
     * @param login  фильтр по логину (nullable)
     * @return постраничный ответ с данными пользователей роли
     * @throws RoleNotFoundException если роль не найдена
     */
    public PagedResponse<UserResponse> getAllByRoleId(UUID roleId, int page, int size, String sort, String login) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }

        Set<String> userCodes = userManagementPort.findUserCodesByRoleIds(Set.of(roleId));
        if (userCodes.isEmpty()) {
            return new PagedResponse<>(List.of(), 0, 0, 0, 0);
        }

        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        Specification<UserEntity> spec = Specification.allOf();

        if (login != null) {
            spec = spec.and(UserSpecifications.loginLike(login));
        }

        spec = spec.and(UserSpecifications.loginIn (userCodes));

        Page<UserEntity> pageResult = userRepository.findAll(spec, pageRequest);
        return PaginationUtils.toPagedResponse(pageResult, this::toPageResponse);
    }

    /// / <--
    /**
     * Возвращает пользователя по идентификатору.
     *
     * @param id идентификатор пользователя (UUID)
     * @return данные пользователя
     * @throws UserNotFoundException если пользователь не найден
     */
    @Transactional(readOnly = true)
    public AuthUserData getById(UUID id) {
        return userManagementPort.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
    }

    /**
     * Создаёт нового пользователя (административная операция).
     * В отличие от регистрации, администратор может сразу установить activated=true.
     *
     * Проверка прав перенесена в контроллер (@PreAuthorize).
     *
     * @param principal аутентифицированный пользователь, выполняющий операцию
     * @param login     логин пользователя
     * @param password  пароль пользователя
     * @param activated признак активации пользователя
     * @return данные созданного пользователя
     * @throws UserAlreadyExistsException если логин уже занят
     */
    @Transactional
    public AuthUserData create(UserPrincipal principal, String login, String password, boolean activated) {
        if (authUserPort.existsByLogin(login)) {
            throw new UserAlreadyExistsException("User with login '" + login + "' already exists");
        }

        String hashedPassword = passwordEncoder.encode(password);
        AuthUserData savedUser = userManagementPort.save(login, hashedPassword, activated);

        log.info("Администратор '{}' создал пользователя: {} (id={}, activated={})",
                principal.login(), savedUser.login(), savedUser.id(), activated);
        return savedUser;
    }

    /**
     * Обновляет свойства пользователя (активацию, passwordChangeRequired).
     * Применяются только не-null значения из запроса.
     *
     * Проверка прав перенесена в контроллер (@PreAuthorize).
     *
     * @param principal              аутентифицированный пользователь, выполняющий операцию
     * @param userId                 идентификатор пользователя (UUID)
     * @param activated              новый статус активации (nullable)
     * @param passwordChangeRequired новое значение флага (nullable)
     * @return обновлённые данные пользователя
     * @throws ValidationException если оба поля равны null
     * @throws UserNotFoundException если пользователь не найден
     */
    @Transactional
    public AuthUserData update(UserPrincipal principal, UUID userId,
                               Boolean activated, Boolean passwordChangeRequired) {
        // Отклоняем пустые запросы на обновление
        if (activated == null && passwordChangeRequired == null) {
            throw new ValidationException("At least one field must be provided");
        }

        // Нет проверки существования на уровне сервиса — адаптер выбрасывает UserNotFoundException
        AuthUserData updated = userManagementPort.update(userId, activated, passwordChangeRequired);

        log.info("Администратор '{}' обновил пользователя {} (activated={}, passwordChangeRequired={})",
                principal.login(), userId, activated, passwordChangeRequired);
        return updated;
    }

    /**
     * Удаляет пользователя. Нельзя удалить самого себя.
     * При удалении отзывает refresh-токены.
     *
     * Проверка прав перенесена в контроллер (@PreAuthorize).
     *
     * @param principal     аутентифицированный пользователь, выполняющий операцию
     * @param userId        идентификатор удаляемого пользователя
     * @throws ValidationException   при попытке удалить самого себя
     * @throws UserNotFoundException если пользователь не найден
     */
    @Transactional
    public void delete(UserPrincipal principal, UUID userId) {
        if (userId.equals(principal.id())) {
            throw new ValidationException("Cannot delete your own account");
        }

        AuthUserData user = userManagementPort.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        tokenPort.revokeRefreshToken(userId);
        userManagementPort.delete(userId);

        log.info("Администратор '{}' удалил пользователя: {} (id={})", principal.login(), user.login(), userId);
    }

    /**
     * Возвращает информацию о текущем аутентифицированном пользователе в виде доменного объекта.
     *
     * @param principal принципал аутентифицированного пользователя
     * @return данные пользователя
     */
    public AuthUserData getCurrentUser(UserPrincipal principal) {
        return new AuthUserData(
                principal.id(),
                principal.login(),
                null, // хеш пароля не раскрывается
                principal.activated(),
                principal.passwordChangeRequired()
        );
    }

    /**
     * Разбирает и валидирует параметр сортировки.
     *
     * @param sort строка сортировки (например, "login" или "createdAt,desc")
     * @return разобранный объект Sort
     * @throws ValidationException если поле сортировки не разрешено
     */
    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.ASC, "login");
        }

        String[] parts = sort.split(",");
        String field = parts[0].trim();

        if (!ALLOWED_SORT_FIELDS.contains(field)) {
            throw new ValidationException(
                    "Invalid sort field: '" + field + "'. Allowed: " + ALLOWED_SORT_FIELDS);
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())) {
            direction = Sort.Direction.DESC;
        }
        return Sort.by(direction, field);
    }

    private UserResponse toPageResponse(UserEntity entity) {
        return UserResponse.builder()
                .id(entity.getId())
                .login(entity.getLogin())
                .activated(entity.isActivated())
                .passwordChangeRequired(entity.isPasswordChangeRequired())
                .build();
    }

}