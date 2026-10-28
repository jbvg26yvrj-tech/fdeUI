package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.ChangePasswordRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.LoginRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.RegistrationRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.AuthResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.application.service.AuthService;
import ru.spasibo.bilt.fdeapi.config.JwtProperties;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthResult;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;

import java.util.Map;
import java.util.UUID;

/**
 * REST-контроллер аутентификации: регистрация, вход, выход,
 * обновление токена, смена пароля и валидация токена.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Validated
@Tag(name = "Аутентификация", description = "Регистрация, вход, выход, обновление токена, смена пароля и валидация токена")
public class AuthController {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";
    private static final String REFRESH_TOKEN_COOKIE_PREFIX = "refreshToken_";

    /** Ограничиваем путь cookie только эндпоинтами аутентификации. */
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;
    private final JwtProperties jwtProperties;
    private final TokenPort tokenPort;
    private final ru.spasibo.bilt.fdeapi.ldap.LdapLoginService ldapLoginService;
    private final ru.spasibo.bilt.fdeapi.ldap.LdapSettingsService ldapSettingsService;
    private final ru.spasibo.bilt.fdeapi.application.service.RegistrationSettingsService registrationSettings;

    @GetMapping("/providers")
    public Map<String, Boolean> providers() { return Map.of("ldapEnabled", ldapSettingsService.enabled(), "registrationEnabled", registrationSettings.enabled()); }

    /**
     * Регистрирует нового пользователя.
     * Возвращает только данные пользователя (201 Created), без токенов; пользователь может сразу выполнить вход.
     *
     * @param request данные для регистрации
     * @return данные пользователя (201 Created)
     */
    @PostMapping("/registration")
    @Operation(summary = "Регистрация пользователя",
            description = "Создаёт активного пользователя без ролей, если самостоятельная регистрация включена. Для получения токенов выполните вход.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Пользователь успешно зарегистрирован"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные регистрации или пользователь уже существует")
    })
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegistrationRequest request) {
        UserPrincipal user = authService.register(
                request.getLogin(),
                request.getPassword(),
                request.getConfirmPassword()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toUserResponse(user));
    }

    /**
     * Аутентифицирует пользователя по логину и паролю.
     *
     * @param request учётные данные для входа
     * @return access-токен и данные пользователя (200 OK)
     */
    @PostMapping("/login")
    @Operation(summary = "Вход в систему",
            description = "Аутентифицирует пользователя по логину и паролю. Возвращает access-токен и устанавливает refresh-токен в httpOnly cookie.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Успешный вход, токен выдан"),
            @ApiResponse(responseCode = "400", description = "Некорректные учётные данные"),
            @ApiResponse(responseCode = "403", description = "Учётная запись не активирована или заблокирована")
    })
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResult result = request.getProvider() == LoginRequest.Provider.LDAP
                ? ldapLoginService.login(request.getLogin(), request.getPassword())
                : authService.login(request.getLogin(), request.getPassword());

        ResponseCookie refreshCookie = createRefreshTokenCookie(
                result.tokenPair().refreshToken(), result.user().id());

        return ResponseEntity.ok()
                .header("Set-Cookie", refreshCookie.toString())
                .body(toAuthResponse(result));
    }

    /**
     * Обновляет пару токенов, используя истёкший access-токен из заголовка Authorization
     * и refresh-токен из httpOnly cookie.
     * Разбирает UserPrincipal в контроллере и передаёт его в сервис.
     *
     * @param httpRequest HTTP-запрос с заголовком Authorization и cookies
     * @return новый access-токен и данные пользователя (200 OK)
     */
    @PostMapping("/refresh")
    @Operation(summary = "Обновление токена",
            description = "Обновляет пару токенов по истёкшему access-токену из заголовка Authorization и refresh-токену из httpOnly cookie.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Токен успешно обновлён"),
            @ApiResponse(responseCode = "400", description = "Отсутствует заголовок Authorization или refresh-токен"),
            @ApiResponse(responseCode = "403", description = "Недействительный или отозванный refresh-токен")
    })
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest httpRequest) {
        String accessToken = extractBearerToken(httpRequest);
        if (accessToken == null) {
            throw new AuthenticationException("Authorization header with Bearer token is required");
        }

        // Разбираем пользователя из (возможно истёкшего) access-токена в контроллере
        UserPrincipal principal = tokenPort.parseUserFromToken(accessToken);
        if (principal == null) {
            throw new AuthenticationException("Unable to parse user from access token");
        }

        String refreshToken = extractRefreshTokenCookie(httpRequest, principal.id());
        if (refreshToken == null) {
            throw new AuthenticationException("Refresh token cookie not found");
        }

        // Передаём разобранный principal вместо строки access-токена
        AuthResult result = authService.refresh(principal, refreshToken);

        ResponseCookie refreshCookie = createRefreshTokenCookie(
                result.tokenPair().refreshToken(), result.user().id());

        return ResponseEntity.ok()
                .header("Set-Cookie", refreshCookie.toString())
                .body(toAuthResponse(result));
    }

    /**
     * Выполняет выход аутентифицированного пользователя: отзывает refresh-токен и очищает cookie.
     *
     * @param principal аутентифицированный пользователь
     * @return 204 No Content
     */
    @PostMapping("/logout")
    @Operation(summary = "Выход из системы",
            description = "Отзывает refresh-токен текущего пользователя и очищает соответствующую cookie.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Выход выполнен успешно"),
            @ApiResponse(responseCode = "403", description = "Пользователь не аутентифицирован")
    })
    public ResponseEntity<Void> logout(@AuthenticationPrincipal UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }

        UUID userId = principal.getPrincipal().id();
        authService.logout(userId);

        ResponseCookie clearCookie = clearRefreshTokenCookie(userId);

        return ResponseEntity.noContent()
                .header("Set-Cookie", clearCookie.toString())
                .build();
    }

    /**
     * Меняет пароль аутентифицированного пользователя.
     * Очищает refresh-токен cookie после смены пароля
     * (AuthService уже отзывает токен в БД).
     *
     * @param principal аутентифицированный пользователь
     * @param request   данные для смены пароля
     * @return 200 OK с сообщением об успехе и очищенной refresh-cookie
     */
    @PostMapping("/change-password")
    @Operation(summary = "Смена пароля",
            description = "Меняет пароль текущего пользователя и принудительно завершает сессию, очищая refresh-токен.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пароль успешно изменён"),
            @ApiResponse(responseCode = "400", description = "Некорректный текущий пароль или новый пароль не прошёл валидацию"),
            @ApiResponse(responseCode = "403", description = "Пользователь не аутентифицирован")
    })
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal UserPrincipalDetails principal,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }

        UUID userId = principal.getPrincipal().id();

        authService.changePassword(
                userId,
                request.getCurrentPassword(),
                request.getNewPassword(),
                request.getConfirmNewPassword()
        );

        // Очищаем refresh-токен cookie, чтобы принудить к повторному входу
        ResponseCookie clearCookie = clearRefreshTokenCookie(userId);

        return ResponseEntity.ok()
                .header("Set-Cookie", clearCookie.toString())
                .body(Map.of("message", "Password changed successfully"));
    }

    /**
     * Проверяет текущий access-токен и возвращает данные пользователя.
     *
     * @param principal аутентифицированный пользователь (внедряется Spring Security)
     * @return данные пользователя (200 OK)
     */
    @GetMapping("/validate")
    @Operation(summary = "Валидация токена",
            description = "Проверяет действительность текущего access-токена и возвращает данные аутентифицированного пользователя.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Токен действителен, возвращены данные пользователя"),
            @ApiResponse(responseCode = "403", description = "Токен недействителен или пользователь не аутентифицирован")
    })
    public ResponseEntity<UserResponse> validate(@AuthenticationPrincipal UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }

        UserPrincipal user = authService.validate(principal.getPrincipal());
        return ResponseEntity.ok(toUserResponse(user));
    }

    // ---- Приватные вспомогательные методы ----

    private AuthResponse toAuthResponse(AuthResult result) {
        return AuthResponse.builder()
                .accessToken(result.tokenPair().accessToken())
                .user(toUserResponse(result.user()))
                .build();
    }

    private UserResponse toUserResponse(UserPrincipal user) {
        return UserResponse.builder()
                .id(user.id())
                .login(user.login())
                .activated(user.activated())
                .passwordChangeRequired(user.passwordChangeRequired())
                .build();
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader(AUTHORIZATION_HEADER);
        if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
            String token = authHeader.substring(BEARER_PREFIX.length()).trim();
            return token.isEmpty() ? null : token;
        }
        return null;
    }

    private String extractRefreshTokenCookie(HttpServletRequest request, UUID userId) {
        String cookieName = REFRESH_TOKEN_COOKIE_PREFIX + userId.toString();
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals(cookieName)) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    /** Путь cookie ограничен значением /api/v1/auth. */
    private ResponseCookie createRefreshTokenCookie(String refreshToken, UUID userId) {
        long maxAgeSeconds = jwtProperties.getRefreshExpiration() / 1000;
        String cookieName = REFRESH_TOKEN_COOKIE_PREFIX + userId.toString();

        return ResponseCookie.from(cookieName, refreshToken)
                .path(COOKIE_PATH)
                .httpOnly(true)
                .secure(true)
                .maxAge(maxAgeSeconds)
                .sameSite("Strict")
                .build();
    }

    /** Путь cookie ограничен значением /api/v1/auth. */
    private ResponseCookie clearRefreshTokenCookie(UUID userId) {
        String cookieName = REFRESH_TOKEN_COOKIE_PREFIX + userId.toString();

        return ResponseCookie.from(cookieName, "")
                .path(COOKIE_PATH)
                .httpOnly(true)
                .secure(true)
                .maxAge(0)
                .sameSite("Strict")
                .build();
    }
}
