package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
 * Прозрачный proxy-контроллер для управления расписаниями.
 * Перед проксированием запроса создания проверяет существование пайплайна
 * и затем перенаправляет запрос в fde-dispatcher.
 */
@RestController
@RequestMapping("/api/v1/schedules")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Расписания (proxy)", description = "Проксирование API управления расписаниями в fde-dispatcher")
public class ScheduleProxyController {

    private static final String DISPATCHER_SCHEDULES_PATH = "/api/v1/schedules";

    private final DispatcherPort dispatcherPort;
    private final PipelineRepository pipelineRepository;
    private final ObjectMapper objectMapper;
    private final ru.spasibo.bilt.fdeapi.application.service.AccessScopeService accessScopeService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("@permissionService.currentUserHasPermission('api.schedules.create')")
    @Operation(summary = "Создать расписание",
            description = "Проверяет существование пайплайна и проксирует запрос в dispatcher")
    public ResponseEntity<String> createSchedule(@RequestBody String body) {
        UUID pipelineId = extractPipelineId(body);
        log.info("Создание расписания для пайплайна: {}", pipelineId);

        validatePipelineExists(pipelineId);

        return dispatcherPort.proxyPost(DISPATCHER_SCHEDULES_PATH, body);
    }

    @GetMapping("/{pipelineId}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.schedules.get')")
    @Operation(summary = "Получить расписание", description = "Проксирует GET-запрос в dispatcher")
    public ResponseEntity<String> getSchedule(
            @Parameter(description = "Идентификатор пайплайна") @PathVariable UUID pipelineId) {
        log.debug("Получение расписания для пайплайна: {}", pipelineId);

        accessScopeService.requirePipeline(pipelineId);
        return dispatcherPort.proxyGet(DISPATCHER_SCHEDULES_PATH + "/" + pipelineId);
    }

    @PutMapping(value = "/{pipelineId}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("@permissionService.currentUserHasPermission('api.schedules.update')")
    @Operation(summary = "Обновить расписание", description = "Проксирует PUT-запрос в dispatcher")
    public ResponseEntity<String> updateSchedule(
            @Parameter(description = "Идентификатор пайплайна") @PathVariable UUID pipelineId,
            @RequestBody String body) {
        log.info("Обновление расписания для пайплайна: {}", pipelineId);

        accessScopeService.requirePipeline(pipelineId);
        try {
            JsonNode target = objectMapper.readTree(body).get("pipelineId");
            if (target != null && !target.isNull()) accessScopeService.requirePipeline(UUID.fromString(target.asText()));
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalArgumentException("Invalid request body"); }
        return dispatcherPort.proxyPut(DISPATCHER_SCHEDULES_PATH + "/" + pipelineId, body);
    }

    @DeleteMapping("/{pipelineId}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.schedules.delete')")
    @Operation(summary = "Удалить расписание", description = "Проксирует DELETE-запрос в dispatcher")
    public ResponseEntity<String> deleteSchedule(
            @Parameter(description = "Идентификатор пайплайна") @PathVariable UUID pipelineId) {
        log.info("Удаление расписания для пайплайна: {}", pipelineId);

        accessScopeService.requirePipeline(pipelineId);
        return dispatcherPort.proxyDelete(DISPATCHER_SCHEDULES_PATH + "/" + pipelineId);
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