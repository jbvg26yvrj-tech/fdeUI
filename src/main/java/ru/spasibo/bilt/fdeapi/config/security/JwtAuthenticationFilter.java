package ru.spasibo.bilt.fdeapi.config.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;

import java.io.IOException;
import java.util.Set;

/**
 * Servlet-фильтр, извлекающий и проверяющий JWT Bearer-токены из заголовка Authorization.
 * При успешной проверке помещает аутентифицированный {@link UserPrincipalDetails} в SecurityContext.
 *
 * <p>Если Bearer-токен присутствует, но недействителен или просрочен, в атрибут запроса {@code auth.error}
 * записывается конкретный тип ошибки ("token_expired" или "token_invalid"), чтобы точка входа
 * аутентификации могла вернуть клиенту понятное сообщение об ошибке.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_PREFIX = "Bearer ";

    /** Эндпоинты аутентификации, не требующие JWT-аутентификации (публичные). */
    private static final Set<String> PUBLIC_AUTH_PATHS = Set.of(
            "/api/v1/auth/login",
            "/api/v1/auth/registration",
            "/api/v1/auth/providers",
            "/api/v1/auth/refresh"
    );

    /** Ключ атрибута запроса для типа ошибки аутентификации. */
    public static final String AUTH_ERROR_ATTRIBUTE = "auth.error";

    private final TokenPort tokenService;
    private final ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort users;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String authHeader = request.getHeader(AUTHORIZATION_HEADER);

            if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
                String token = authHeader.substring(BEARER_PREFIX.length()).trim();

                if (!token.isEmpty()) {
                    if (tokenService.validateAccessToken(token)) {
                        UserPrincipal principal = tokenService.extractUserFromAccessToken(token);

                        var currentUser = principal == null ? null : users.findById(principal.id()).orElse(null);
                        if (currentUser != null && currentUser.activated()) {
                            principal = new UserPrincipal(currentUser.id(), currentUser.login(), true, currentUser.passwordChangeRequired());
                            UserPrincipalDetails details = new UserPrincipalDetails(principal);
                            UsernamePasswordAuthenticationToken authentication =
                                    new UsernamePasswordAuthenticationToken(
                                            details, null, details.getAuthorities());
                            SecurityContextHolder.getContext().setAuthentication(authentication);

                            log.debug("Аутентифицирован пользователь: {} для URI: {}",
                                    principal.login(), request.getRequestURI());
                        }
                    } else {
                        // Устанавливаем конкретный тип ошибки, чтобы точка входа могла их различать
                        String errorType = tokenService.getAccessTokenError(token);
                        request.setAttribute(AUTH_ERROR_ATTRIBUTE, errorType);
                        log.debug("Проверка токена не пройдена ({}): URI: {}",
                                errorType, request.getRequestURI());
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            // Всегда очищаем SecurityContext, чтобы предотвратить утечки между запросами
            SecurityContextHolder.clearContext();
        }
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return PUBLIC_AUTH_PATHS.contains(path)
                || path.startsWith("/swagger-ui/")
                || path.startsWith("/v3/api-docs/")
                || path.startsWith("/actuator/");
    }
}
