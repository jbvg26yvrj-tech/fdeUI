package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO ответа с данными сессии для постраничного списка (без детализации задач).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionPageResponse {

    private UUID id;
    private UUID pipelineId;
    private String pipelineName;
    private String replicaId;
    private LocalDateTime startDt;
    private String status;
    private String errorMessage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}