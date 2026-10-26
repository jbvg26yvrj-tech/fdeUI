package ru.spasibo.bilt.fdeapi.domain.model;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Доменная модель роли в системе RBAC.
 */
public record RoleData(
        UUID id,
        String code,
        String name,
        String description,
        boolean isSystem,
        LocalDateTime createdAt
) {
}