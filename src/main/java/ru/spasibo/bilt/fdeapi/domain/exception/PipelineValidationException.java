package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: данные пайплайна не прошли бизнес-валидацию.
 */
public class PipelineValidationException extends ApiException {

    public PipelineValidationException(String message) {
        super(message);
    }
}