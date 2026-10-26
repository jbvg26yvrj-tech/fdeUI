package ru.spasibo.bilt.fdeapi.domain.model;

/**
 * Неизменяемая пара JWT-токенов: access и refresh.
 */
public record TokenPair(String accessToken, String refreshToken) {
}