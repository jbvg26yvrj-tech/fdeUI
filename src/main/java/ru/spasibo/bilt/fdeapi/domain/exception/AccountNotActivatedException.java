package ru.spasibo.bilt.fdeapi.domain.exception;

/**
 * Исключение: пользователь пытается войти, но его учётная запись ещё не активирована.
 * Отображается на HTTP 403 Forbidden.
 */
public class AccountNotActivatedException extends ApiException {

    public AccountNotActivatedException(String message) {
        super(message);
    }
}
