package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO запроса на вход пользователя.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    public enum Provider { LOCAL, LDAP }
    @Builder.Default
    private Provider provider = Provider.LOCAL;

    public LoginRequest(String login, String password) { this.login = login; this.password = password; }

    @NotBlank(message = "Login is required")
    private String login;

    @NotBlank(message = "Password is required")
    private String password;
}
