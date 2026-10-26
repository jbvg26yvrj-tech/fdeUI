package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: некорректные входные параметры запроса.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(final String message) {
        super("Неверные входные параметры: " + message);
    }
}

