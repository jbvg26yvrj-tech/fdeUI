package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO запроса на обновление pipeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdatePipelineRequest {

    @Size(max = 255)
    private String pipelineName;

    @Size(max = 100)
    private String clientFrom;

    @Size(max = 100)
    private String clientTo;

    @Size(max = 10)
    private String primaryDatacenter;

    @jakarta.validation.constraints.Min(0)
    @jakarta.validation.constraints.Max(9007199254740991L)
    private Long agreedVolumeBytes;

    @jakarta.validation.constraints.Pattern(regexp = "RUN|DAY|MONTH")
    private String agreedVolumePeriod;

    private Boolean allOrNothing;

    @Valid
    private List<TaskRequest> tasks;
}