package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.RoleResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.exception.*;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;
import ru.spasibo.bilt.fdeapi.domain.model.RoleData;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;
import ru.spasibo.bilt.fdeapi.util.datetime.SpecificationHelper;
import ru.spasibo.bilt.fdeapi.util.pagination.PaginationUtils;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Сервис приложения для операций управления ролями.
 * Обрабатывает CRUD ролей, привязку ресурсов к ролям и пользователей к ролям.
 * Переработан для использования доменных портов вместо JPA-репозиториев.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RoleService {

    private final RolePort rolePort;
    private final ResourcePort resourcePort;
    private final RoleRepository roleRepository;
    private final AuthUserPort authUserPort;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "code", "name", "description", "createdAt");

    /**
     * Возвращает список всех ролей.
     *
     * @return список данных ролей
     */
    @Transactional(readOnly = true)
    public List<RoleData> getAllRoles() {
        return rolePort.findAll();
    }

    /**
     * Возвращает постраничный список ролей с фильтрацией.
     */
    @Transactional(readOnly = true)
    public PagedResponse<RoleResponse> getAllPaged(int page, int size, String sort, String code, String name,
                                                   String description, String createdAt, String createdAtOperator) {
        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        Specification<RoleEntity> spec = buildSpecification(code, name, description, createdAt, createdAtOperator);
        Page<RoleEntity> pageResult = roleRepository.findAll(spec, pageRequest);

        return PaginationUtils.toPagedResponse(pageResult, this::toPageResponse);
    }

    /**
     * Строит спецификацию для фильтрации ролей.
     */
    private Specification<RoleEntity> buildSpecification(String code, String name, String description,
                                                         String createdAt, String createdAtOperator) {
        Specification<RoleEntity> spec = Specification.allOf();

        if (code != null) {
            spec = spec.and(RoleSpecifications.codeLike(code));
        }
        if (name != null) {
            spec = spec.and(RoleSpecifications.nameLike(name));
        }
        if (description != null) {
            spec = spec.and(RoleSpecifications.descriptionLike(description));
        }

        spec = SpecificationHelper.withDateFilter(spec, createdAt, createdAtOperator, RoleSpecifications::createdAtCondition);
        return spec;
    }

    /**
     * Возвращает роль по идентификатору.
     *
     * @param id идентификатор роли (UUID)
     * @return данные роли
     * @throws RoleNotFoundException если роль не найдена
     */
    @Transactional(readOnly = true)
    public RoleData getById(UUID id) {
        return rolePort.findById(id)
                .orElseThrow(() -> new RoleNotFoundException("Role not found: " + id));
    }

    /**
     * Создаёт новую роль.
     *
     * @param code        уникальный код роли
     * @param name        отображаемое имя
     * @param description необязательное описание
     * @return данные созданной роли
     * @throws ValidationException если код роли уже существует
     */
    @Transactional
    public RoleData create(String code, String name, String description) { return create(code, name, description, Set.of()); }

    @Transactional
    public RoleData create(String code, String name, String description, Set<String> clientCodes) {
        if (rolePort.existsByCode(code)) {
            throw new ValidationException("Role with code '" + code + "' already exists");
        }

        RoleData saved = rolePort.save(code, name, description, false);
        if (clientCodes != null) saved = rolePort.updateClientCodes(saved.id(), clientCodes);
        log.info("Создана роль: {} (code={})", saved.id(), saved.code());
        return saved;
    }

    /**
     * Обновляет имя и описание роли.
     *
     * @param id          идентификатор роли (UUID)
     * @param name        новое имя (nullable — при null сохраняется текущее)
     * @param description новое описание (nullable — при null сохраняется текущее)
     * @return обновлённые данные роли
     * @throws RoleNotFoundException если роль не найдена
     */
    @Transactional
    public RoleData update(UUID id, String name, String description) { return update(id, name, description, null); }

    @Transactional
    public RoleData update(UUID id, String name, String description, Set<String> clientCodes) {
        if (rolePort.findById(id).isEmpty()) {
            throw new RoleNotFoundException("Role not found: " + id);
        }

        RoleData updated = rolePort.update(id, name, description);
        if (clientCodes != null) updated = rolePort.updateClientCodes(id, clientCodes);
        log.info("Обновлена роль: {} (code={})", updated.id(), updated.code());
        return updated;
    }

    /**
     * Удаляет роль. Системные роли удалить нельзя.
     *
     * @param id идентификатор роли (UUID)
     * @throws RoleNotFoundException если роль не найдена
     * @throws ValidationException   если роль является системной
     */
    @Transactional
    public void delete(UUID id) {
        RoleData role = rolePort.findById(id)
                .orElseThrow(() -> new RoleNotFoundException("Role not found: " + id));

        if (role.isSystem()) {
            throw new ValidationException("Cannot delete system role: " + role.code());
        }

        rolePort.delete(id);
        log.info("Удалена роль: {} (code={})", id, role.code());
    }

    // ---- Управление связью роль-ресурс ----

    /**
     * Возвращает все ресурсы, назначенные роли.
     *
     * @param roleId идентификатор роли (UUID)
     * @return список данных ресурсов
     * @throws RoleNotFoundException если роль не найдена
     */
    @Transactional(readOnly = true)
    public List<ResourceData> getResourcesForRole(UUID roleId) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }

        Set<String> resourceCodes = resourcePort.findResourceCodesByRoleIds(Set.of(roleId));
        if (resourceCodes.isEmpty()) {
            return List.of();
        }

        return resourcePort.findAll().stream()
                .filter(r -> resourceCodes.contains(r.code()))
                .toList();
    }

    /**
     * Назначает ресурс роли.
     *
     * @param roleId     идентификатор роли (UUID)
     * @param resourceId идентификатор ресурса (UUID)
     * @throws RoleNotFoundException     если роль не найдена
     * @throws ResourceNotFoundException если ресурс не найден
     * @throws ValidationException       если назначение уже существует
     */
    @Transactional
    public void assignResource(UUID roleId, UUID resourceId) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }
        if (!resourcePort.existsById(resourceId)) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }
        if (rolePort.isResourceAssignedToRole(roleId, resourceId)) {
            throw new ValidationException("Resource is already assigned to this role");
        }

        rolePort.assignResource(roleId, resourceId);
        log.info("Назначен ресурс {} роли {}", resourceId, roleId);
    }

    /**
     * Удаляет ресурс из роли.
     *
     * @param roleId     идентификатор роли (UUID)
     * @param resourceId идентификатор ресурса (UUID)
     * @throws ValidationException если назначение не существует
     */
    @Transactional
    public void removeResource(UUID roleId, UUID resourceId) {
        if (!rolePort.isResourceAssignedToRole(roleId, resourceId)) {
            throw new ValidationException("Resource is not assigned to this role");
        }

        rolePort.removeResource(roleId, resourceId);
        log.info("Снят ресурс {} с роли {}", resourceId, roleId);
    }

    // ---- Управление связью роль-пользователь ----

    /**
     * Возвращает всех пользователей, назначенных роли.
     * Использует пакетный запрос вместо N+1 одиночных выборок.
     *
     * @param roleId идентификатор роли (UUID)
     * @return список данных пользователей
     * @throws RoleNotFoundException если роль не найдена
     */
    @Transactional(readOnly = true)
    public List<AuthUserData> getUsersForRole(UUID roleId) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }

        List<UUID> userIds = rolePort.findUserIdsByRoleId(roleId);
        if (userIds.isEmpty()) {
            return List.of();
        }

        return authUserPort.findByIds(userIds);
    }

    /**
     * Назначает пользователя роли.
     *
     * @param roleId идентификатор роли (UUID)
     * @param userId идентификатор пользователя (UUID)
     * @throws RoleNotFoundException если роль не найдена
     * @throws UserNotFoundException если пользователь не найден
     * @throws ValidationException   если назначение уже существует
     */
    @Transactional
    public void assignUser(UUID roleId, UUID userId) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }
        authUserPort.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        if (rolePort.isUserAssignedToRole(roleId, userId)) {
            throw new ValidationException("User is already assigned to this role");
        }

        rolePort.assignUser(roleId, userId);
        log.info("Назначен пользователь {} роли {}", userId, roleId);
    }

    /**
     * Удаляет пользователя из роли.
     *
     * @param roleId идентификатор роли (UUID)
     * @param userId идентификатор пользователя (UUID)
     * @throws ValidationException если назначение не существует
     */
    @Transactional
    public void removeUser(UUID roleId, UUID userId) {
        if (!rolePort.isUserAssignedToRole(roleId, userId)) {
            throw new ValidationException("User is not assigned to this role");
        }

        rolePort.removeUser(roleId, userId);
        log.info("Снят пользователь {} с роли {}", userId, roleId);
    }

    private RoleResponse toPageResponse(RoleEntity entity) {
        return RoleResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .isSystem(entity.isSystem())
                .name(entity.getName())
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .clientCodes(entity.getClientCodes())
                .build();
    }
}