package ru.spasibo.bilt.fdeapi.observability.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;

/**
 * Prometheus-метрики уровня приложения для сервиса FDE API.
 * Отслеживает CRUD-операции с пайплайнами и статистику проксируемых запросов.
 */
@Component
@Slf4j
public class ApiMetrics {

    private final PipelineRepository pipelineRepository;
    private volatile double cachedPipelineCount = Double.NaN;
    private volatile double countCheckedAt;
    private final Counter pipelineCreatedCounter;
    private final Counter pipelineDeletedCounter;
    private final Counter proxyRequestsCounter;
    private final Counter proxyErrorsCounter;

    @SuppressWarnings("unused") // Gauge регистрируется в registry и отслеживается по ссылке
    private final Gauge pipelinesTotal;

    public ApiMetrics(MeterRegistry registry, PipelineRepository pipelineRepository) {
        this.pipelineRepository = pipelineRepository;
        Gauge.builder("fde_api_pipelines_count_checked_timestamp_seconds", this, m -> m.countCheckedAt).register(registry);
        this.pipelineCreatedCounter = Counter.builder("fde_api_pipelines_created_total")
                .description("Total pipelines created")
                .register(registry);

        this.pipelineDeletedCounter = Counter.builder("fde_api_pipelines_deleted_total")
                .description("Total pipelines deleted")
                .register(registry);

        this.proxyRequestsCounter = Counter.builder("fde_api_proxy_requests_total")
                .description("Total proxy requests to dispatcher")
                .tag("target", "dispatcher")
                .register(registry);

        this.proxyErrorsCounter = Counter.builder("fde_api_proxy_errors_total")
                .description("Total proxy errors")
                .tag("target", "dispatcher")
                .register(registry);

        this.pipelinesTotal = Gauge.builder("fde_api_pipelines_total", this, m -> m.cachedPipelineCount)
                .description("Current number of pipelines")
                .register(registry);

        log.debug("Метрики FDE API зарегистрированы");
    }

    @Scheduled(fixedDelayString = "${fde.monitoring.count-delay-ms:60000}", initialDelay = 15000)
    public void refreshPipelineCount() {
        try {
            cachedPipelineCount = pipelineRepository.count();
            countCheckedAt = System.currentTimeMillis() / 1000.0;
        } catch (RuntimeException ex) {
            cachedPipelineCount = Double.NaN;
            log.warn("Pipeline count refresh failed: {}", ex.getClass().getSimpleName());
        }
    }

    public void incrementPipelineCreated() {
        pipelineCreatedCounter.increment();
    }

    public void incrementPipelineDeleted() {
        pipelineDeletedCounter.increment();
    }

    public void incrementProxyRequests() {
        proxyRequestsCounter.increment();
    }

    public void incrementProxyErrors() {
        proxyErrorsCounter.increment();
    }
}