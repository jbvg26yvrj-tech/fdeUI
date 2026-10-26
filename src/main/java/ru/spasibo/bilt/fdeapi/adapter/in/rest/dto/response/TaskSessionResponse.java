package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO ответа с данными сессии задачи. Примечание: поле props намеренно исключено,
 * так как содержит внутренние ссылки на учётные данные.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TaskSessionResponse {

    private Long id;
    private Short taskOrder;
    private String typeCode;
    private Boolean isDone;
    private List<ProcessedFileResponse> processedFiles;
    private int totalFiles;
    private long totalBytes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}