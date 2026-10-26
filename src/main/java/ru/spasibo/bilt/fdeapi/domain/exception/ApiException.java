package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Базовое исключение для всех ошибок API на уровне домена.
 */
public abstract class ApiException extends RuntimeException {

    protected ApiException(String message) {
        super(message);
    }
}