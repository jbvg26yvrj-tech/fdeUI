package ru.spasibo.bilt.fdeapi.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Конфигурация OpenAPI/Swagger для fde-api.
 * Объявляет схему безопасности bearer JWT, чтобы защищённые эндпоинты
 * в Swagger UI отображались как требующие access-токен и позволяли
 * авторизоваться кнопкой "Authorize".
 */
@Configuration
public class OpenApiConfig {

    /** Имя схемы безопасности bearer JWT. */
    private static final String SECURITY_SCHEME_NAME = "bearerAuth";

    /**
     * Формирует описание OpenAPI с глобальным требованием bearer-токена.
     *
     * @return объект {@link OpenAPI} с метаданными и схемой безопасности
     */
    @Bean
    public OpenAPI fdeApiOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("FDE 2.0 — API Gateway (fde-api)")
                        .description("BFF/API-gateway для UI: JWT-аутентификация, RBAC/RLS, "
                                + "CRUD пайплайнов и проксирование запросов в fde-dispatcher.")
                        .version("2.0.0"))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components().addSecuritySchemes(SECURITY_SCHEME_NAME,
                        new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Передайте access-токен в формате: Bearer <token>")));
    }
}
