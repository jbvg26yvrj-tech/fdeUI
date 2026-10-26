package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: попытка создать или переименовать пайплайн в уже существующее имя.
 */
public class PipelineAlreadyExistsException extends ApiException {

    public PipelineAlreadyExistsException(String name) {
        super("Pipeline with name '" + name + "' already exists");
    }
}