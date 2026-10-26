package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: запрошенная роль не существует.
 */
public class RoleNotFoundException extends ApiException {

    public RoleNotFoundException(String message) {
        super(message);
    }
}