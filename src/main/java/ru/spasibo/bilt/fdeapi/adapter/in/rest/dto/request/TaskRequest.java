package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO запроса на описание задачи в составе pipeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskRequest {

    @NotNull(message = "Task order is required")
    @Min(value = 1, message = "Task order must be >= 1")
    private Short taskOrder;

    @NotBlank(message = "Type code is required")
    @Size(max = 50)
    private String typeCode;

    @NotNull(message = "Props is required")
    private Map<String, String> props;
}