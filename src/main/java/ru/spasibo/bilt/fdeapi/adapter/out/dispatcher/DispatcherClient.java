package ru.spasibo.bilt.fdeapi.adapter.out.dispatcher;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import ru.spasibo.bilt.fdeapi.domain.exception.DispatcherUnavailableException;
import ru.spasibo.bilt.fdeapi.domain.port.DispatcherPort;
import ru.spasibo.bilt.fdeapi.observability.metrics.ApiMetrics;

/**
 * Прозрачный проксирующий клиент, перенаправляющий запросы в fde-dispatcher.
 * Сохраняет HTTP-статусы и тела ответов от нижестоящего сервиса.
 * Защищён механизмами circuit breaker и retry из Resilience4j.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DispatcherClient implements DispatcherPort {

    private static final String DOWNSTREAM_UNAVAILABLE_MESSAGE = "Downstream service is temporarily unavailable";

    private final WebClient dispatcherWebClient;
    private final ApiMetrics apiMetrics;

    @Override
    @Retry(name = "dispatcher")
    @CircuitBreaker(name = "dispatcher", fallbackMethod = "fallbackGet")
    public ResponseEntity<String> proxyGet(String path) {
        log.debug("Проксирование GET-запроса в dispatcher: {}", path);
        apiMetrics.incrementProxyRequests();
        try {
            ResponseEntity<String> response = dispatcherWebClient.get()
                    .uri(path)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .toEntity(String.class)
                    .block();
            if (response == null) {
                return ResponseEntity.noContent().build();
            }
            return sanitizeResponse(response);
        } catch (WebClientResponseException ex) {
            return handleResponseException(ex);
        } catch (WebClientRequestException ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        } catch (Exception ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        }
    }

    @Override
    @Retry(name = "dispatcher")
    @CircuitBreaker(name = "dispatcher", fallbackMethod = "fallbackWithBody")
    public ResponseEntity<String> proxyPost(String path, String body) {
        log.debug("Проксирование POST-запроса в dispatcher: {}", path);
        apiMetrics.incrementProxyRequests();
        try {
            ResponseEntity<String> response = dispatcherWebClient.post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .toEntity(String.class)
                    .block();
            if (response == null) {
                return ResponseEntity.noContent().build();
            }
            return sanitizeResponse(response);
        } catch (WebClientResponseException ex) {
            return handleResponseException(ex);
        } catch (WebClientRequestException ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        } catch (Exception ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        }
    }

    @Override
    @Retry(name = "dispatcher")
    @CircuitBreaker(name = "dispatcher", fallbackMethod = "fallbackWithBody")
    public ResponseEntity<String> proxyPut(String path, String body) {
        log.debug("Проксирование PUT-запроса в dispatcher: {}", path);
        apiMetrics.incrementProxyRequests();
        try {
            ResponseEntity<String> response = dispatcherWebClient.put()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .toEntity(String.class)
                    .block();
            if (response == null) {
                return ResponseEntity.noContent().build();
            }
            return sanitizeResponse(response);
        } catch (WebClientResponseException ex) {
            return handleResponseException(ex);
        } catch (WebClientRequestException ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        } catch (Exception ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        }
    }

    @Override
    @Retry(name = "dispatcher")
    @CircuitBreaker(name = "dispatcher", fallbackMethod = "fallbackGet")
    public ResponseEntity<String> proxyDelete(String path) {
        log.debug("Проксирование DELETE-запроса в dispatcher: {}", path);
        apiMetrics.incrementProxyRequests();
        try {
            ResponseEntity<String> response = dispatcherWebClient.delete()
                    .uri(path)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .toEntity(String.class)
                    .block();
            if (response == null) {
                return ResponseEntity.noContent().build();
            }
            return sanitizeResponse(response);
        } catch (WebClientResponseException ex) {
            return handleResponseException(ex);
        } catch (WebClientRequestException ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        } catch (Exception ex) {
            apiMetrics.incrementProxyErrors();
            log.error("Не удалось соединиться с dispatcher: {}", ex.getClass().getSimpleName());
            throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
        }
    }

    /**
     * Удаляет hop-by-hop заголовки (Transfer-Encoding, Content-Length) из
     * ответа вышестоящего сервиса, чтобы избежать дублирования заголовков
     * при повторном кодировании Spring.
     */
    private ResponseEntity<String> sanitizeResponse(ResponseEntity<String> response) {
        HttpHeaders cleanHeaders = new HttpHeaders();
        response.getHeaders().forEach((name, values) -> {
            if (!HttpHeaders.TRANSFER_ENCODING.equalsIgnoreCase(name)
                    && !HttpHeaders.CONTENT_LENGTH.equalsIgnoreCase(name)
                    && !"X-Correlation-ID".equalsIgnoreCase(name)) {
                cleanHeaders.addAll(name, values);
            }
        });
        return ResponseEntity.status(response.getStatusCode())
                .headers(cleanHeaders)
                .body(response.getBody());
    }

    /**
     * Преобразует WebClientResponseException (4xx/5xx от dispatcher) в
     * ResponseEntity, сохраняя исходный статус-код и тело ответа.
     */
    private ResponseEntity<String> handleResponseException(WebClientResponseException ex) {
        HttpStatusCode status = ex.getStatusCode();
        String body = ex.getResponseBodyAsString();
        log.warn("Dispatcher вернул ошибку: {} {}", status, ex.getClass().getSimpleName());

        return ResponseEntity.status(status)
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .body(body);
    }

    /**
     * Fallback для методов с сигнатурой только из пути (GET, DELETE).
     */
    private ResponseEntity<String> fallbackGet(String path, Exception e) {
        log.error("Circuit breaker dispatcher разомкнут или исчерпаны повторы: {}", e.getClass().getSimpleName());
        throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
    }

    /**
     * Fallback для методов с сигнатурой из пути и тела (POST, PUT).
     */
    private ResponseEntity<String> fallbackWithBody(String path, String body, Exception e) {
        log.error("Circuit breaker dispatcher разомкнут или исчерпаны повторы: {}", e.getClass().getSimpleName());
        throw new DispatcherUnavailableException(DOWNSTREAM_UNAVAILABLE_MESSAGE);
    }
}