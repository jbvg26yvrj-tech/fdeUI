package ru.spasibo.bilt.fdeapi.domain.model;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Доменная модель ресурса (права доступа) в системе RBAC.
 */
public record ResourceData(
        UUID id,
        String code,
        String name,
        String description,
        String type,
        LocalDateTime createdAt
) {
}