package ru.spasibo.bilt.fdeapi.observability.metrics;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.actuate.health.Status;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ru.spasibo.bilt.fdeapi.observability.health.DispatcherHealthIndicator;

/** Cached probes: scraping never performs an outbound network request. Values are per replica. */
@Component
public class DependencyMetrics {
    private final DispatcherHealthIndicator dispatcher;
    private volatile double available = Double.NaN;
    private volatile double checkedAt;
    public DependencyMetrics(MeterRegistry registry, DispatcherHealthIndicator dispatcher) {
        this.dispatcher = dispatcher;
        Gauge.builder("fde_dependency_up", this, m -> m.available).tag("dependency", "dispatcher").register(registry);
        Gauge.builder("fde_dependency_checked_timestamp_seconds", this, m -> m.checkedAt)
                .tag("dependency", "dispatcher").register(registry);
    }
    @Scheduled(fixedDelayString = "${fde.monitoring.probe-delay-ms:30000}", initialDelayString = "${fde.monitoring.probe-initial-delay-ms:10000}")
    public void probe() {
        try { available = Status.UP.equals(dispatcher.health().getStatus()) ? 1 : 0; }
        catch (RuntimeException ex) { available = 0; }
        finally { checkedAt = System.currentTimeMillis() / 1000.0; }
    }
}
