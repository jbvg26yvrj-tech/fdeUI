package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO ответа с полными данными pipeline, включая список задач.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineResponse {

    private UUID id;
    private String pipelineName;
    private String clientFrom;
    private String clientTo;
    private String primaryDatacenter;
    private boolean allOrNothing;
    private List<TaskResponse> tasks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}