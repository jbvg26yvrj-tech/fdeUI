package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO ответа с данными RLS-фильтра, привязанного к роли.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleRlsDto {
    private UUID id;
    private UUID roleId;
    private String roleCode;
    private UUID resourceId;
    private String resourceCode;
    private JsonNode filter; // Используем JsonNode вместо String

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
}