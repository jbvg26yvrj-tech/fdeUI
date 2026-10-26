package ru.spasibo.bilt.fdeapi.domain.model;

import java.util.UUID;

/**
 * Доменная модель данных пользователя, необходимых для операций аутентификации.
 * Отвязывает сервис аутентификации от слоя JPA-сущностей.
 */
public record AuthUserData(
        UUID id,
        String login,
        String passwordHash,
        boolean activated,
        boolean passwordChangeRequired,
        String authSource
) {
    public AuthUserData(UUID id, String login, String passwordHash, boolean activated, boolean passwordChangeRequired) {
        this(id, login, passwordHash, activated, passwordChangeRequired, "LOCAL");
    }
}
