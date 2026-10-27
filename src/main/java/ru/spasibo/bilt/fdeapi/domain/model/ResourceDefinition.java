package ru.spasibo.bilt.fdeapi.domain.model;

import java.util.Arrays;

/**
 * Описывает все системные ресурсы RBAC для FDE 2.0.
 * Каждый элемент автоматически синхронизируется с таблицей {@code auth.resources} при старте.
 */
public enum ResourceDefinition {

    // ==================== Таблицы для RLS ====================
    TABLE_PIPELINES("table.pipelines", "Pipelines table", ResourceType.TABLE),
    TABLE_SESSIONS("table.sessions", "Sessions table", ResourceType.TABLE),

    // ==================== Пайплайны ====================
    API_PIPELINES_LIST("api.pipelines.list", "List pipelines", ResourceType.API),
    API_PIPELINES_GET("api.pipelines.get", "Get pipeline", ResourceType.API),
    API_PIPELINES_CREATE("api.pipelines.create", "Create pipeline", ResourceType.API),
    API_PIPELINES_UPDATE("api.pipelines.update", "Update pipeline", ResourceType.API),
    API_PIPELINES_DELETE("api.pipelines.delete", "Delete pipeline", ResourceType.API),

    // ==================== Сессии ====================
    API_SESSIONS_LIST("api.sessions.list", "List sessions", ResourceType.API),
    API_SESSIONS_GET("api.sessions.get", "Get session", ResourceType.API),

    API_ANALYTICS_READ("api.analytics.read", "Read pipeline analytics", ResourceType.API),
    API_LOGS_READ("api.logs.read", "Read session logs", ResourceType.API),

    // ==================== Расписания ====================
    API_SCHEDULES_CREATE("api.schedules.create", "Create schedule", ResourceType.API),
    API_SCHEDULES_GET("api.schedules.get", "Get schedule", ResourceType.API),
    API_SCHEDULES_UPDATE("api.schedules.update", "Update schedule", ResourceType.API),
    API_SCHEDULES_DELETE("api.schedules.delete", "Delete schedule", ResourceType.API),

    // ==================== Триггеры ====================
    API_TRIGGERS_MANUAL("api.triggers.manual", "Manual trigger", ResourceType.API),
    API_TRIGGERS_STOP("api.triggers.stop", "Stop execution", ResourceType.API),

    // ==================== Пользователи ====================
    API_USERS_LIST("api.users.list", "List users", ResourceType.API),
    API_USERS_GET("api.users.get", "Get user", ResourceType.API),
    API_USERS_CREATE("api.users.create", "Create user", ResourceType.API),
    API_USERS_UPDATE("api.users.update", "Update user", ResourceType.API),
    API_USERS_DELETE("api.users.delete", "Delete user", ResourceType.API),

    // ==================== Роли и права ====================
    API_ROLES_MANAGE("api.roles.manage", "Manage roles", ResourceType.API),
    API_PERMISSIONS_VIEW("api.permissions.view", "View permissions", ResourceType.API),

    // ==================== Контекст пользователя ====================
    API_USER_CONTEXT("api.user-context.get", "Get user context", ResourceType.API),
    API_USER_SETTINGS("api.user-settings.manage", "Manage user settings", ResourceType.API),

    // ==================== Страницы UI ====================
    PAGE_PIPELINES("page.pipelines", "Pipelines page", ResourceType.PAGE),
    PAGE_SESSIONS("page.sessions", "Sessions page", ResourceType.PAGE),
    PAGE_ANALYTICS("page.analytics", "Analytics page", ResourceType.PAGE),
    PAGE_LOGS("page.logs", "Logs page", ResourceType.PAGE),
    PAGE_USERS("page.users", "Users page", ResourceType.PAGE),
    PAGE_PERMISSIONS("page.permissions", "Permissions page", ResourceType.PAGE);



    private final String code;
    private final String name;
    private final ResourceType type;

    ResourceDefinition(String code, String name, ResourceType type) {
        this.code = code;
        this.name = name;
        this.type = type;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public ResourceType getType() {
        return type;
    }

    /**
     * Проверяет, определён ли ресурс с указанным кодом.
     *
     * @param code код ресурса для поиска
     * @return true, если соответствующее определение ресурса существует
     */
    public static boolean exists(String code) {
        return Arrays.stream(values()).anyMatch(r -> r.code.equals(code));
    }

    /**
     * Возвращает определение ресурса, соответствующее указанному коду.
     *
     * @param code код ресурса
     * @return соответствующее определение
     * @throws IllegalArgumentException если ни одно определение не соответствует
     */
    public static ResourceDefinition fromCode(String code) {
        return Arrays.stream(values())
                .filter(r -> r.code.equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown resource code: " + code));
    }
}