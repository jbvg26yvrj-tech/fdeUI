package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: ошибка бизнес-валидации (например, несовпадение паролей).
 */
public class ValidationException extends ApiException {

    public ValidationException(String message) {
        super(message);
    }
}