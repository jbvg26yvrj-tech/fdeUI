package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: сервис fde-dispatcher недоступен или не отвечает.
 */
public class DispatcherUnavailableException extends ApiException {

    public DispatcherUnavailableException(String message) {
        super(message);
    }
}