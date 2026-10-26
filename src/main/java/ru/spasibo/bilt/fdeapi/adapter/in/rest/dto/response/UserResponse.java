package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * DTO ответа с данными пользователя в контексте аутентификации.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String login;
    private boolean activated;
    private boolean passwordChangeRequired;
}