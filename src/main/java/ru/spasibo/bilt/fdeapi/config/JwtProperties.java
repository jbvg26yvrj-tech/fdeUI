package ru.spasibo.bilt.fdeapi.config;

import jakarta.annotation.PostConstruct;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Параметры конфигурации JWT для access- и refresh-токенов.
 */
@ConfigurationProperties(prefix = "app.jwt")
@Validated
@Getter
@Setter
public class JwtProperties {

    /** Секретный ключ для подписи access-токенов (минимум 32 символа). */
    @NotBlank
    @Size(min = 32, message = "JWT access secret must be at least 32 characters")
    private String accessSecret;

    /** Секретный ключ для подписи refresh-токенов (минимум 32 символа). */
    @NotBlank
    @Size(min = 32, message = "JWT refresh secret must be at least 32 characters")
    private String refreshSecret;

    /** Время жизни access-токена в миллисекундах. */
    @Positive
    private long accessExpiration;

    /** Время жизни refresh-токена в миллисекундах. */
    @Positive
    private long refreshExpiration;

    /**
     * Отклоняет секреты, содержащие слово "default", чтобы исключить
     * случайное использование плейсхолдеров в продуктивной среде.
     */
    @PostConstruct
    void validateSecrets() {
        if (accessSecret.toLowerCase().contains("default")) {
            throw new IllegalStateException(
                    "JWT access secret must not contain the word 'default'. "
                            + "Set JWT_ACCESS_SECRET environment variable.");
        }
        if (refreshSecret.toLowerCase().contains("default")) {
            throw new IllegalStateException(
                    "JWT refresh secret must not contain the word 'default'. "
                            + "Set JWT_REFRESH_SECRET environment variable.");
        }
    }
}