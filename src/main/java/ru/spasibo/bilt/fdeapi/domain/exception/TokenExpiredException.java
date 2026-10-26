package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: срок действия JWT-токена истёк.
 */
public class TokenExpiredException extends ApiException {

    public TokenExpiredException(String message) {
        super(message);
    }
}