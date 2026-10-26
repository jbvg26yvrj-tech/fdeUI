package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Универсальный DTO запроса на назначение целевой сущности (пользователя или ресурса) роли.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignRequest {

    @NotNull(message = "targetId is required")
    private UUID targetId;
}