package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: попытка создать пользователя с уже существующим логином.
 */
public class UserAlreadyExistsException extends ApiException {

    public UserAlreadyExistsException(String message) {
        super(message);
    }
}