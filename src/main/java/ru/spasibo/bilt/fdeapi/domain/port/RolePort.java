package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.RoleData;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Порт операций персистентности ролей.
 * Абстрагирует слой адаптеров, чтобы сервисы приложения не зависели от JPA-сущностей.
 */
public interface RolePort {

    /**
     * Находит роль по идентификатору.
     *
     * @param id UUID роли
     * @return данные роли, если найдена
     */
    Optional<RoleData> findById(UUID id);

    /**
     * Находит роль по коду.
     *
     * @param code уникальный код роли
     * @return данные роли, если найдена
     */
    Optional<RoleData> findByCode(String code);

    /**
     * Проверяет, существует ли роль с указанным кодом.
     *
     * @param code код роли для проверки
     * @return true, если роль существует
     */
    boolean existsByCode(String code);

    /**
     * Проверяет, существует ли роль с указанным идентификатором.
     *
     * @param id UUID роли
     * @return true, если роль существует
     */
    boolean existsById(UUID id);

    /**
     * Возвращает все роли.
     *
     * @return список всех ролей
     */
    List<RoleData> findAll();

    /**
     * Создаёт новую роль.
     *
     * @param code        уникальный код роли
     * @param name        отображаемое имя
     * @param description необязательное описание
     * @param isSystem    является ли роль системной
     * @return сохранённые данные роли
     */
    RoleData save(String code, String name, String description, boolean isSystem);

    /**
     * Обновляет имя и/или описание роли.
     *
     * @param id          UUID роли
     * @param name        новое имя (null — оставить текущее)
     * @param description новое описание (null — оставить текущее)
     * @return обновлённые данные роли
     */
    RoleData update(UUID id, String name, String description);

    /**
     * Удаляет роль по идентификатору.
     *
     * @param id UUID роли
     */
    void delete(UUID id);

    /**
     * Проверяет, является ли роль системной.
     *
     * @param id UUID роли
     * @return true, если роль системная
     */
    boolean isSystemRole(UUID id);

    /**
     * Назначает ресурс роли.
     *
     * @param roleId     UUID роли
     * @param resourceId UUID ресурса
     */
    void assignResource(UUID roleId, UUID resourceId);

    /**
     * Удаляет ресурс из роли.
     *
     * @param roleId     UUID роли
     * @param resourceId UUID ресурса
     */
    void removeResource(UUID roleId, UUID resourceId);

    /**
     * Проверяет, назначен ли ресурс роли.
     *
     * @param roleId     UUID роли
     * @param resourceId UUID ресурса
     * @return true, если назначение существует
     */
    boolean isResourceAssignedToRole(UUID roleId, UUID resourceId);

    /**
     * Назначает пользователя роли.
     *
     * @param roleId UUID роли
     * @param userId UUID пользователя
     */
    void assignUser(UUID roleId, UUID userId);

    /**
     * Удаляет пользователя из роли.
     *
     * @param roleId UUID роли
     * @param userId UUID пользователя
     */
    void removeUser(UUID roleId, UUID userId);

    /**
     * Проверяет, назначен ли пользователь роли.
     *
     * @param roleId UUID роли
     * @param userId UUID пользователя
     * @return true, если назначение существует
     */
    boolean isUserAssignedToRole(UUID roleId, UUID userId);

    /**
     * Возвращает все идентификаторы пользователей, назначенных роли.
     *
     * @param roleId UUID роли
     * @return список UUID пользователей
     */
    List<UUID> findUserIdsByRoleId(UUID roleId);

    /**
     * Возвращает набор идентификаторов ролей, назначенных пользователю.
     * Используется для пакетных запросов прав.
     *
     * @param userId UUID пользователя
     * @return набор UUID ролей
     */
    java.util.Set<UUID> findRoleIdsByUserId(UUID userId);

    /**
     * Возвращает набор кодов ролей, назначенных пользователю, одним запросом.
     *
     * @param userId UUID пользователя
     * @return набор кодов ролей
     */
    java.util.Set<String> findRoleCodesByUserId(UUID userId);
}