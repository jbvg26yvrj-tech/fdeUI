package ru.spasibo.bilt.fdeapi.config;

import io.netty.channel.ChannelOption;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import org.slf4j.MDC;
import org.springframework.web.reactive.function.client.ClientRequest;

import java.time.Duration;

/**
 * Конфигурация WebClient для исходящих HTTP-вызовов к fde-dispatcher.
 */
@Configuration
@Slf4j
public class WebClientConfig {

    @Bean
    public WebClient dispatcherWebClient(
            @Value("${fde.dispatcher.url}") String baseUrl,
            @Value("${fde.dispatcher.connect-timeout}") Duration connectTimeout,
            @Value("${fde.dispatcher.response-timeout}") Duration responseTimeout) {

        log.debug("Настройка WebClient для dispatcher: baseUrl={}, connectTimeout={}, responseTimeout={}",
                baseUrl, connectTimeout, responseTimeout);

        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, (int) connectTimeout.toMillis())
                .responseTimeout(responseTimeout);

        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .filter((request, next) -> {
                    String correlationId = MDC.get("correlationId");
                    if (correlationId != null) {
                        return next.exchange(ClientRequest.from(request)
                                .header("X-Correlation-ID", correlationId)
                                .build());
                    }
                    return next.exchange(request);
                })
                .build();
    }
}