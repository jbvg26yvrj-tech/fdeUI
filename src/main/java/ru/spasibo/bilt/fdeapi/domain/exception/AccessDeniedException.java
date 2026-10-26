package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: пользователь пытается выполнить операцию, на которую у него нет прав.
 */
public class AccessDeniedException extends ApiException {

    public AccessDeniedException(String message) {
        super(message);
    }
}