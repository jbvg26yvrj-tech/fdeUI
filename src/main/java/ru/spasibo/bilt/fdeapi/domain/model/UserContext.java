package ru.spasibo.bilt.fdeapi.domain.model;

import java.util.Map;

/**
 * Доменная модель, агрегирующая данные пользователя, настройки, права и RLS для контекста фронтенда.
 */
public record UserContext(
        AuthUserData user,
        Map<String, String> settings,
        UserPermissions permissions,
        UserRls rls
) {
}