package ru.spasibo.bilt.fdeapi.observability.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;

/**
 * Пользовательский health-индикатор, проверяющий доступность сервиса fde-dispatcher.
 * Возвращает UP, когда actuator health-эндпоинт диспетчера отвечает успешно,
 * и DOWN в противном случае (с деталями ошибки).
 */
@Component
@Slf4j
public class DispatcherHealthIndicator implements HealthIndicator {

    private static final Duration HEALTH_CHECK_TIMEOUT = Duration.ofSeconds(3);

    private final WebClient dispatcherWebClient;

    public DispatcherHealthIndicator(WebClient dispatcherWebClient) {
        this.dispatcherWebClient = dispatcherWebClient;
    }

    @Override
    public Health health() {
        try {
            dispatcherWebClient.get()
                    .uri("/actuator/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .block(HEALTH_CHECK_TIMEOUT);

            return Health.up()
                    .withDetail("dispatcher", "available")
                    .build();
        } catch (Exception e) {
            log.warn("Проверка доступности dispatcher не пройдена: {}", e.getClass().getSimpleName());
            return Health.down()
                    .withDetail("dispatcher", "unavailable")
                    .withDetail("error", e.getClass().getSimpleName())
                    .build();
        }
    }
}