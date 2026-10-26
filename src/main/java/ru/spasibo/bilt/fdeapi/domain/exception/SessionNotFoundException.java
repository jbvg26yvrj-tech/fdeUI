package ru.spasibo.bilt.fdeapi.domain.exception;

import java.util.UUID;

/**
 * Исключение: сессия пайплайна с указанным идентификатором не существует.
 */
public class SessionNotFoundException extends ApiException {

    public SessionNotFoundException(UUID id) {
        super("Session not found: " + id);
    }
}