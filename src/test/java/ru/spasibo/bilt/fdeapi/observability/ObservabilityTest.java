package ru.spasibo.bilt.fdeapi.observability;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.boot.actuate.health.Health;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import ru.spasibo.bilt.fdeapi.observability.tracing.CorrelationIdFilter;
import ru.spasibo.bilt.fdeapi.observability.metrics.DependencyMetrics;
import ru.spasibo.bilt.fdeapi.observability.health.DispatcherHealthIndicator;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ObservabilityTest {
    @Test void rejectsLongAndInvalidCorrelationIdsAndCleansThreadState() throws Exception {
        for (String unsafe : new String[]{"x".repeat(65), "name\r\nsecret", "a/b", ""}) {
            var request = new MockHttpServletRequest("GET", "/api/v1/pipelines");
            request.addHeader("X-Correlation-ID", unsafe);
            var response = new MockHttpServletResponse();
            new CorrelationIdFilter().doFilter(request, response, (req, res) -> {
                assertThat(MDC.get("correlationId")).matches("[0-9a-f-]{36}");
                assertThat(MDC.get("correlationId")).isEqualTo(response.getHeader("X-Correlation-ID"));
            });
            assertThat(MDC.get("correlationId")).isNull();
        }
    }
    @Test void preservesSafeIdAndRestoresMdcEvenOnFailure() {
        var request = new MockHttpServletRequest("POST", "/api/v1/pipelines");
        request.addHeader("X-Correlation-ID", "trace-123.abc");
        var response = new MockHttpServletResponse();
        MDC.put("correlationId", "outer");
        try {
            assertThatThrownBy(() -> new CorrelationIdFilter().doFilter(request,response,(req,res)-> {
                assertThat(MDC.get("correlationId")).isEqualTo("trace-123.abc");
                throw new IllegalStateException("test");
            })).isInstanceOf(IllegalStateException.class);
            assertThat(MDC.get("correlationId")).isEqualTo("outer");
        } finally { MDC.clear(); }
    }
    @Test void dependencyScrapesAreCachedAndFailureIsObservable() {
        var registry = new SimpleMeterRegistry();
        var health = mock(DispatcherHealthIndicator.class);
        var metrics = new DependencyMetrics(registry, health);
        var up = registry.get("fde_dependency_up").gauge();
        assertThat(up.value()).isNaN(); verifyNoInteractions(health);
        when(health.health()).thenReturn(Health.up().build()); metrics.probe();
        assertThat(up.value()).isEqualTo(1); assertThat(up.value()).isEqualTo(1);
        verify(health,times(1)).health();
        when(health.health()).thenThrow(new IllegalStateException()); metrics.probe();
        assertThat(up.value()).isZero();
        assertThat(registry.get("fde_dependency_checked_timestamp_seconds").gauge().value()).isPositive();
    }
    @Test void completionLogContainsTemplateNotQueryOrBody() throws Exception {
        var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger("fde.http");
        var events = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        events.start(); logger.addAppender(events);
        try {
            var request = new MockHttpServletRequest("POST", "/api/v1/pipelines/secret-path");
            request.setQueryString("password=secret-query"); request.setContent("secret-body".getBytes());
            request.setAttribute(org.springframework.web.servlet.HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE, "/api/v1/pipelines/{id}");
            new CorrelationIdFilter().doFilter(request, new MockHttpServletResponse(), (req,res)->{});
            assertThat(events.list).hasSize(1);
            String logged = events.list.get(0).getFormattedMessage() + events.list.get(0).getKeyValuePairs();
            assertThat(logged).contains("/api/v1/pipelines/{id}").doesNotContain("secret-path", "secret-query", "secret-body");
        } finally { logger.detachAppender(events); events.stop(); }
    }
    @Test void errorLogsDoNotExposeExceptionMessageOrCause() {
        var logger = (ch.qos.logback.classic.Logger) org.slf4j.LoggerFactory.getLogger(ru.spasibo.bilt.fdeapi.adapter.in.rest.GlobalExceptionHandler.class);
        var events = new ch.qos.logback.core.read.ListAppender<ch.qos.logback.classic.spi.ILoggingEvent>();
        events.start(); logger.addAppender(events);
        try {
            var handler = new ru.spasibo.bilt.fdeapi.adapter.in.rest.GlobalExceptionHandler();
            handler.handleGeneral(new IllegalStateException("secret-token",new RuntimeException("secret-password")));
            handler.handleIllegalArgument(new IllegalArgumentException("secret-token"));
            assertThat(events.list).hasSize(2);
            for (var event:events.list) {
                assertThat(event.getFormattedMessage()).doesNotContain("secret-token", "secret-password");
                assertThat(event.getThrowableProxy()).isNull();
            }
        } finally { logger.detachAppender(events); events.stop(); }
    }

}
