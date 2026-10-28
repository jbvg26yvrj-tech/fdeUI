package ru.spasibo.bilt.fdeapi.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ErrorResponse;
import ru.spasibo.bilt.fdeapi.config.security.JwtAuthenticationFilter;

import java.time.LocalDateTime;

/**
 * Конфигурация Spring Security с stateless-аутентификацией по JWT.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties({JwtProperties.class, CorsProperties.class})
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsProperties corsProperties;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private ru.spasibo.bilt.fdeapi.audit.AuditService auditService;

    private void auditDenied(jakarta.servlet.http.HttpServletRequest request, String result) {
        if (auditService != null && (java.util.Set.of("POST", "PUT", "PATCH", "DELETE").contains(request.getMethod()) || request.getRequestURI().startsWith("/api/v1/audit")))
            auditService.record("security.access", "security", null, result);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(authz -> {
                    authz.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll();
                    // Публичные эндпоинты аутентификации (токен не требуется)
                    authz.requestMatchers(
                            "/api/v1/auth/login",
                            "/api/v1/auth/registration",
                            "/api/v1/auth/providers",
                            "/api/v1/auth/refresh"
                    ).permitAll();
                    // Защищённые эндпоинты аутентификации требуют авторизации
                    authz.requestMatchers(
                            "/api/v1/auth/logout",
                            "/api/v1/auth/change-password",
                            "/api/v1/auth/validate"
                    ).authenticated();
                    authz.requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll();
                    authz.requestMatchers("/actuator", "/actuator/**").denyAll();
                    authz.requestMatchers(HttpMethod.GET, "/livez", "/readyz").permitAll();
                    authz.requestMatchers("/api/**").authenticated();
                    authz.anyRequest().permitAll();
                })
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            // проверяем конкретную ошибку аутентификации,
                            // выставленную JwtAuthenticationFilter
                            auditDenied(request, "FAILURE");
                            String authError = (String) request.getAttribute(
                                    JwtAuthenticationFilter.AUTH_ERROR_ATTRIBUTE);

                            String message;
                            if ("token_expired".equals(authError)) {
                                message = "Срок действия access-токена истёк";
                            } else if ("token_invalid".equals(authError)) {
                                message = "Некорректный access-токен";
                            } else {
                                message = "Требуется аутентификация";
                            }

                            writeErrorResponse(response, HttpServletResponse.SC_UNAUTHORIZED,
                                    "Unauthorized", message);
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            auditDenied(request, "FORBIDDEN");
                            writeErrorResponse(response, HttpServletResponse.SC_FORBIDDEN, "Forbidden", "Access denied");
                        })
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(corsProperties.getAllowedOrigins());
        config.setAllowedMethods(corsProperties.getAllowedMethods());
        config.setAllowedHeaders(corsProperties.getAllowedHeaders());
        config.setExposedHeaders(corsProperties.getExposedHeaders());
        config.setAllowCredentials(corsProperties.isAllowCredentials());
        config.setMaxAge(corsProperties.getMaxAge());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(10);
    }

    private void writeErrorResponse(HttpServletResponse response, int status,
                                    String error, String message) throws java.io.IOException {
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(status);

        ErrorResponse errorResponse = ErrorResponse.builder()
                .status(status)
                .error(error)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();

        response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
    }
}
