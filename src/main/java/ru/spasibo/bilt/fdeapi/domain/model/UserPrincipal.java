package ru.spasibo.bilt.fdeapi.domain.model;

import java.util.UUID;

/**
 * Доменная модель principal аутентифицированного пользователя.
 * Независима от фреймворка: без импортов Spring Security.
 */
public record UserPrincipal(
        UUID id,
        String login,
        boolean activated,
        boolean passwordChangeRequired
) {
}