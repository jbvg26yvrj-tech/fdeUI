package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO ответа с данными одной привязки RLS-фильтра.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RlsFilterResponse {
    private UUID id;
    private UUID roleId;
    private UUID resourceId;
    private String resourceCode;
    private String resourceName;
    private String filter;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}