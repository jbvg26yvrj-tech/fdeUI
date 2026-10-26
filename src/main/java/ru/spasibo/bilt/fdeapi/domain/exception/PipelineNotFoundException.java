package ru.spasibo.bilt.fdeapi.domain.exception;

import java.util.UUID;

/**
 * Исключение: пайплайн с указанным идентификатором не существует.
 */
public class PipelineNotFoundException extends ApiException {

    public PipelineNotFoundException(UUID id) {
        super("Pipeline not found: " + id);
    }
}