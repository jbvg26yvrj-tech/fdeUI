package ru.spasibo.bilt.fdeapi.observability.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;

/**
 * Prometheus-метрики уровня приложения для сервиса FDE API.
 * Отслеживает CRUD-операции с пайплайнами и статистику проксируемых запросов.
 */
@Component
@Slf4j
public class ApiMetrics {

    private final Counter pipelineCreatedCounter;
    private final Counter pipelineDeletedCounter;
    private final Counter proxyRequestsCounter;
    private final Counter proxyErrorsCounter;

    @SuppressWarnings("unused") // Gauge регистрируется в registry и отслеживается по ссылке
    private final Gauge pipelinesTotal;

    public ApiMetrics(MeterRegistry registry, PipelineRepository pipelineRepository) {
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

        this.pipelinesTotal = Gauge.builder("fde_api_pipelines_total", pipelineRepository, repo -> repo.count())
                .description("Current number of pipelines")
                .register(registry);

        log.debug("Метрики FDE API зарегистрированы");
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