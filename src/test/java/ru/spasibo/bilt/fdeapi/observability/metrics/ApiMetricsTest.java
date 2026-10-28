package ru.spasibo.bilt.fdeapi.observability.metrics;

import io.micrometer.prometheusmetrics.PrometheusConfig;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import org.junit.jupiter.api.Test;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ApiMetricsTest {
    @Test void currentPipelineCountDoesNotCollideWithCreationCounterInPrometheus() {
        var repository = mock(PipelineRepository.class);
        when(repository.count()).thenReturn(7L);
        var registry = new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
        try {
            var metrics = new ApiMetrics(registry, repository);
            metrics.refreshPipelineCount();
            metrics.incrementPipelineCreated();
            String exported = registry.scrape();
            assertThat(exported).contains("# TYPE fde_api_pipelines_current gauge\n")
                    .contains("fde_api_pipelines_current 7.0\n")
                    .contains("fde_api_pipeline_create_operations_total 1.0\n");
            verify(repository, times(1)).count();
        } finally { registry.close(); }
    }
}
