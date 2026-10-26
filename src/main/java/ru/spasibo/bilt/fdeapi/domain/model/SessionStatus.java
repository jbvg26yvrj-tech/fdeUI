package ru.spasibo.bilt.fdeapi.domain.model;

/**
 * Допустимые статусы сессий выполнения пайплайна.
 */
public enum SessionStatus {
    PREPARE,
    ACTIVE,
    SUCCESS,
    FAILED,
    ABORTED
}