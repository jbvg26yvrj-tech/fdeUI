package ru.spasibo.bilt.fdeapi.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Свойства конфигурации CORS.
 */
@ConfigurationProperties(prefix = "app.cors")
@Getter
@Setter
public class CorsProperties {

    /** Список разрешённых источников (origins), например http://localhost:3000. */
    private List<String> allowedOrigins;

    /** Список разрешённых HTTP-методов. */
    private List<String> allowedMethods;

    /** Список разрешённых заголовков запроса. */
    private List<String> allowedHeaders;

    /** Список заголовков, доступных браузеру. По умолчанию: все (*). */
    private List<String> exposedHeaders;

    /** Максимальное время кэширования preflight-запроса в секундах. */
    private long maxAge;

    /** Разрешены ли учётные данные (cookies, заголовки авторизации). */
    private boolean allowCredentials;
}