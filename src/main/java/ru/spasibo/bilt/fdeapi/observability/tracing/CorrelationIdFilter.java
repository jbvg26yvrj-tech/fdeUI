package ru.spasibo.bilt.fdeapi.observability.tracing;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;
import java.io.IOException;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

/** One bounded ID across request, audit and downstream dispatcher; no bodies/query strings. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
    private static final Pattern SAFE_ID = Pattern.compile("[A-Za-z0-9._-]{1,64}");
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String supplied = request.getHeader("X-Correlation-ID");
        String id = supplied != null && SAFE_ID.matcher(supplied).matches() ? supplied : UUID.randomUUID().toString();
        String previous = MDC.get("correlationId");
        MDC.put("correlationId", id);
        response.setHeader("X-Correlation-ID", id);
        long start = System.nanoTime();
        boolean failed = false;
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException ex) {
            failed = true;
            throw ex;
        } finally {
            if (request.getRequestURI().startsWith("/api/")) {
                Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
                // Only route templates (never raw paths, query strings or exception messages).
                LoggerFactory.getLogger("fde.http").atInfo()
                        .addKeyValue("event", "http_request")
                        .addKeyValue("method", safeMethod(request.getMethod()))
                        .addKeyValue("route", route == null ? "UNMATCHED" : route.toString())
                        .addKeyValue("status", failed ? 500 : response.getStatus())
                        .addKeyValue("durationMs", TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - start))
                        .log("HTTP request completed");
            }
            if (previous == null) MDC.remove("correlationId"); else MDC.put("correlationId", previous);
        }
    }
    private static String safeMethod(String method) {
        return switch (method) {
            case "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS" -> method;
            default -> "OTHER";
        };
    }
}
