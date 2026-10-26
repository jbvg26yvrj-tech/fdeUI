package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.UserPermissions;

import java.util.Set;
import java.util.UUID;

/**
 * Порт запроса прав пользователя в системе RBAC.
 * Используется сервисами приложения для проверки авторизации
 * без прямой зависимости от слоя персистентности.
 */
public interface PermissionPort {

    /**
     * Возвращает агрегированные права (коды ролей + коды ресурсов) пользователя.
     *
     * @param userId UUID пользователя
     * @return права пользователя
     */
    UserPermissions getUserPermissions(UUID userId);

    /**
     * Проверяет, имеет ли пользователь доступ к конкретному ресурсу.
     *
     * @param userId       UUID пользователя
     * @param resourceCode код ресурса для проверки
     * @return true, если у пользователя есть данное право
     */
    boolean hasPermission(UUID userId, String resourceCode);

    /**
     * Возвращает набор кодов ролей, назначенных пользователю.
     *
     * @param userId UUID пользователя
     * @return набор кодов ролей
     */
    Set<String> getUserRoleCodes(UUID userId);
}