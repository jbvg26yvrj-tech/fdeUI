package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * DTO ответа с данными pipeline для постраничного списка (без детализации задач).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelinePageResponse {

    private UUID id;
    private String pipelineName;
    private String clientFrom;
    private String clientTo;
    private String primaryDatacenter;
    private boolean allOrNothing;
    private int tasksCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}