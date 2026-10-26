package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: пользователь по указанному идентификатору не найден.
 */
public class UserNotFoundException extends ApiException {

    public UserNotFoundException(String message) {
        super(message);
    }
}