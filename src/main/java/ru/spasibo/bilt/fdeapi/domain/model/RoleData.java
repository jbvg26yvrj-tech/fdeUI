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
        LocalDateTime createdAt,
        java.util.Set<String> clientCodes
) {
    public RoleData(UUID id, String code, String name, String description, boolean isSystem, LocalDateTime createdAt) {
        this(id, code, name, description, isSystem, createdAt, java.util.Set.of());
    }
    public RoleData { clientCodes = clientCodes == null ? java.util.Set.of() : java.util.Set.copyOf(clientCodes); }
}