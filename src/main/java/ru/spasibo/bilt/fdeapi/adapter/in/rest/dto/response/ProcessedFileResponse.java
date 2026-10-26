package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO ответа с данными одного обработанного файла в рамках сессии задачи.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProcessedFileResponse {

    private String fileName;
    private String sourceFileName;
    private Long fileSize;
    private String status;
    private String errorMessage;
    private LocalDateTime createdAt;
}
