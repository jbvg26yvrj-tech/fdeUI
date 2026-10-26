package ru.spasibo.bilt.fdeapi.domain.model;

/**
 * Доменная модель результата операции аутентификации.
 * Содержит пару токенов и principal аутентифицированного пользователя.
 */
public record AuthResult(TokenPair tokenPair, UserPrincipal user) {
}