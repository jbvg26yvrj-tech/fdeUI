package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO ответа для операций аутентификации (вход, регистрация, обновление токена).
 * Содержит access-токен и данные пользователя.
 * Refresh-токен передаётся через httpOnly cookie, а не в теле ответа.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private String accessToken;
    private UserResponse user;
}