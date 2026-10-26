package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO ответа с данными ресурса (права доступа).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResourceResponse {

    private UUID id;
    private String code;
    private String name;
    private String description;
    private String type;
    private LocalDateTime createdAt;
}