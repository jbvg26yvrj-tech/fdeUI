package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * DTO запроса на массовую смену дата-центра для набора pipeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkDatacenterRequest {

    @NotBlank(message = "Datacenter is required")
    private String datacenter;

    @NotEmpty(message = "Pipeline IDs list must not be empty")
    private List<UUID> pipelineIds;
}
