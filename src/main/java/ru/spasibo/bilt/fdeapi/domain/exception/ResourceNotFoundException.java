package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: запрошенный ресурс (право доступа) не существует.
 */
public class ResourceNotFoundException extends ApiException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}