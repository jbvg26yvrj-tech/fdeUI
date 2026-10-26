package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.port.DispatcherPort;

import java.util.UUID;

/**
 * Прозрачный proxy-контроллер для операций запуска/остановки.
 * Перед проксированием ручного запуска проверяет существование пайплайна
 * и затем перенаправляет запрос в fde-dispatcher.
 */
@RestController
@RequestMapping("/api/v1/triggers")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Запуск пайплайнов (proxy)", description = "Проксирование API запуска/остановки в fde-dispatcher")
public class TriggerProxyController {

    private static final String DISPATCHER_TRIGGERS_PATH = "/api/v1/triggers";

    private final DispatcherPort dispatcherPort;
    private final PipelineRepository pipelineRepository;
    private final ru.spasibo.bilt.fdeapi.application.service.SessionService sessionService;
    private final ObjectMapper objectMapper;
    private final ru.spasibo.bilt.fdeapi.application.service.AccessScopeService accessScopeService;

    @PostMapping(value = "/manual", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("@permissionService.currentUserHasPermission('api.triggers.manual')")
    @Operation(summary = "Ручной запуск пайплайна",
            description = "Проверяет существование пайплайна и проксирует запрос в dispatcher")
    public ResponseEntity<String> manualTrigger(@RequestBody String body) {
        UUID pipelineId = extractPipelineId(body);
        log.info("Ручной запуск пайплайна: {}", pipelineId);

        validatePipelineExists(pipelineId);

        return dispatcherPort.proxyPost(DISPATCHER_TRIGGERS_PATH + "/manual", body);
    }

    @PostMapping(value = "/stop", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("@permissionService.currentUserHasPermission('api.triggers.stop')")
    @Operation(summary = "Остановка выполнения",
            description = "Проксирует запрос остановки в dispatcher без предварительной проверки")
    public ResponseEntity<String> stopTrigger(@RequestBody String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            if (!node.hasNonNull("sessionId")) throw new IllegalArgumentException("sessionId is required");
            sessionService.getById(UUID.fromString(node.get("sessionId").asText()));
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalArgumentException("Invalid request body"); }
        log.info("Запрос на остановку выполнения пайплайна");

        return dispatcherPort.proxyPost(DISPATCHER_TRIGGERS_PATH + "/stop", body);
    }

    /**
     * Извлекает pipelineId из тела JSON-запроса для проверки перед проксированием.
     */
    private UUID extractPipelineId(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            JsonNode pipelineIdNode = node.get("pipelineId");
            if (pipelineIdNode == null || pipelineIdNode.isNull()) {
                throw new IllegalArgumentException("pipelineId is required");
            }
            return UUID.fromString(pipelineIdNode.asText());
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid request body: unable to extract pipelineId");
        }
    }

    private void validatePipelineExists(UUID pipelineId) {
        accessScopeService.requirePipeline(pipelineId);
    }
}