package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO ответа с детальными данными сессии, включая сессии задач.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {

    private UUID id;
    private UUID pipelineId;
    private String pipelineName;
    private String replicaId;
    private LocalDateTime startDt;
    private String status;
    private String errorMessage;
    private List<TaskSessionResponse> tasks;
    private int totalFiles;
    private long totalBytes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}