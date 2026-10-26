package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO запроса на создание pipeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreatePipelineRequest {

    @NotBlank(message = "Pipeline name is required")
    @Size(max = 255)
    private String pipelineName;

    @NotBlank(message = "Client from is required")
    @Size(max = 100)
    private String clientFrom;

    @NotBlank(message = "Client to is required")
    @Size(max = 100)
    private String clientTo;

    @Size(max = 10)
    private String primaryDatacenter;

    @Builder.Default
    private Boolean allOrNothing = true;

    @NotEmpty(message = "At least one task is required")
    @Valid
    private List<TaskRequest> tasks;
}