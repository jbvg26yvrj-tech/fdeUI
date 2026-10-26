package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: ошибка аутентификации (неверные учётные данные, отсутствие токена и т. п.).
 */
public class AuthenticationException extends ApiException {

    public AuthenticationException(String message) {
        super(message);
    }
}