package ru.spasibo.bilt.fdeapi.domain.model;

import java.util.Set;

/**
 * Доменная модель агрегированных прав пользователя.
 * Содержит набор кодов ролей и кодов ресурсов, назначенных через эти роли.
 */
public record UserPermissions(
        Set<String> roleCodes,
        Set<String> resourceCodes
) {
}