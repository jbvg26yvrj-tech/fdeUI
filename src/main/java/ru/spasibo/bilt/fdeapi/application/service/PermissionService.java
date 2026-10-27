package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import ru.spasibo.bilt.fdeapi.domain.model.UserPermissions;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.CurrentUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.PermissionPort;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;

import java.util.Set;
import java.util.UUID;

/**
 * Сервис приложения, реализующий проверку прав доступа для системы RBAC.
 * Реализует {@link PermissionPort}, чтобы другие сервисы могли проверять права
 * без зависимости от слоя персистентности.
 * <p>
 * Переработан для использования доменных портов вместо JPA-репозиториев.
 * Добавлен метод {@link #requireAdmin(UserPrincipal)} для авторизации администратора.
 * Обобщённые сообщения об ошибках (без утечки UUID).
 * Использует {@link CurrentUserPort} вместо прямого обращения к SecurityContextHolder.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionService implements PermissionPort {

    private static final Set<String> OWN_RESOURCES = Set.of("api.user-settings.manage", "api.user-context.get");
    private static final Set<String> CLIENT_READ_RESOURCES = Set.of(
            "page.pipelines", "page.sessions", "page.analytics", "table.pipelines", "table.sessions",
            "api.pipelines.list", "api.pipelines.get", "api.sessions.list", "api.sessions.get",
            "api.schedules.get", "api.analytics.read");

    private final RolePort rolePort;
    private final ResourcePort resourcePort;
    private final CurrentUserPort currentUserPort;

    /**
     * Возвращает права доступа пользователя (роли и ресурсы).
         *
     * @param userId UUID пользователя
     * @return права доступа пользователя: коды ролей и коды ресурсов
     */
    @Override
    public UserPermissions getUserPermissions(UUID userId) {
        Set<String> roleCodes = rolePort.findRoleCodesByUserId(userId);
        if (roleCodes.contains("ADMIN")) {
            Set<String> resources = new java.util.HashSet<>(resourcePort.findAllCodes());
            resources.addAll(CLIENT_READ_RESOURCES);
            resources.addAll(OWN_RESOURCES);
            return new UserPermissions(roleCodes, Set.copyOf(resources));
        }
        // Legacy resource grants never elevate a client role above scoped read-only access.
        boolean scoped = rolePort.findRoleIdsByUserId(userId).stream()
                .map(rolePort::findById).flatMap(java.util.Optional::stream)
                .flatMap(role -> role.clientCodes().stream())
                .anyMatch(code -> !AccessScopeService.normalize(code).isEmpty());
        Set<String> resources = new java.util.HashSet<>(OWN_RESOURCES);
        if (scoped) resources.addAll(CLIENT_READ_RESOURCES);
        return new UserPermissions(roleCodes, Set.copyOf(resources));
    }

    /**
     * Проверяет, есть ли у пользователя право на указанный ресурс.
     *
     * @param userId       UUID пользователя
     * @param resourceCode код проверяемого ресурса
     * @return {@code true}, если у пользователя есть право на ресурс
     */
    @Override
    public boolean hasPermission(UUID userId, String resourceCode) {
        return getUserPermissions(userId).resourceCodes().contains(resourceCode);
    }

    /**
     * Возвращает коды ролей пользователя.
     *
     * @param userId UUID пользователя
     * @return множество кодов ролей пользователя
     */
    @Override
    public Set<String> getUserRoleCodes(UUID userId) {
        return rolePort.findRoleCodesByUserId(userId);
    }

    /**
     * Проверяет право доступа и выбрасывает {@link AccessDeniedException}, если оно отсутствует.
     * Использует обобщённое сообщение об ошибке; детали логирует на уровне WARN.
     *
     * @param userId       UUID пользователя
     * @param resourceCode код проверяемого ресурса
     * @throws AccessDeniedException если у пользователя нет данного права
     */
    public void checkPermission(UUID userId, String resourceCode) {
        if (!hasPermission(userId, resourceCode)) {
            log.warn("Отказ в доступе: у пользователя {} нет доступа к ресурсу '{}'", userId, resourceCode);
            throw new AccessDeniedException("Access denied: insufficient permissions");
        }
    }

    /**
     * Проверяет, есть ли у текущего аутентифицированного пользователя указанное право.
     *
     * @param resourceCode код проверяемого ресурса
     * @return {@code true}, если у текущего пользователя есть данное право
     */
    public boolean currentUserHasPermission(String resourceCode) {
        return currentUserPort.getCurrentUserId()
                .map(userId -> hasPermission(userId, resourceCode))
                .orElse(false);
    }

    /**
     * Проверяет, есть ли у текущего аутентифицированного пользователя указанная роль.
     *
     * @param roleCode код проверяемой роли (например, "ADMIN")
     * @return {@code true}, если у текущего пользователя есть данная роль
     */
    public boolean currentUserHasRole(String roleCode) {
        return currentUserPort.getCurrentUserId()
                .map(userId -> getUserRoleCodes(userId).contains(roleCode))
                .orElse(false);
    }

    /**
     * Проверяет, обладает ли пользователь правами администратора для управления ролями/правами.
     * Удалён жёстко заданный фолбэк по логину администратора; используется чистая проверка RBAC.
     *
     * @param principal аутентифицированный пользователь
     * @throws AccessDeniedException если у пользователя нет права api.roles.manage
     */
    public void requireAdmin(UserPrincipal principal) {
        if (!getUserRoleCodes(principal.id()).contains("ADMIN")) {
            log.warn("Отказ в административном доступе для пользователя '{}' (id={})", principal.login(), principal.id());
            throw new AccessDeniedException("Admin access required");
        }
    }
}