package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.SessionPageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.SessionResponse;
import ru.spasibo.bilt.fdeapi.application.service.SessionService;

import java.util.UUID;

/**
 * REST-контроллер для доступа только на чтение к сессиям выполнения конвейеров.
 */
@RestController
@RequestMapping("/api/v1/sessions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Сессии", description = "Просмотр сессий выполнения конвейеров (только чтение)")
public class SessionController {

    private final SessionService sessionService;

    /**
     * Возвращает постраничный список сессий конвейеров с опциональными фильтрами.
     */
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasPermission('api.sessions.list')")
    @Operation(summary = "Список сессий",
            description = "Возвращает постраничный список сессий выполнения конвейеров с опциональными фильтрами по идентификатору, конвейеру, статусу и датам")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список сессий успешно получен"),
            @ApiResponse(responseCode = "400", description = "Некорректные параметры запроса"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра сессий")
    })
    public ResponseEntity<PagedResponse<SessionPageResponse>> getAll(
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы (от 1 до 100)") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(required = false) String sort,
            @Parameter(description = "Фильтр по идентификатору сессии") @RequestParam(required = false) UUID id,
            @Parameter(description = "Фильтр по идентификатору конвейера") @RequestParam(required = false) UUID pipelineId,
            @Parameter(description = "Фильтр по статусу сессии") @RequestParam(required = false) String status,
            @Parameter(description = "Фильтр по дате старта") @RequestParam(required = false) String startDt,
            @Parameter(description = "Фильтр по дате создания") @RequestParam(required = false) String createdAt,
            @Parameter(description = "Фильтр по дате обновления") @RequestParam(required = false) String updatedAt,
            @Parameter(description = "Оператор сравнения для даты старта") @RequestParam(required = false) String startDtOperator,
            @Parameter(description = "Оператор сравнения для даты создания") @RequestParam(required = false) String createdAtOperator,
            @Parameter(description = "Оператор сравнения для даты обновления") @RequestParam(required = false) String updatedAtOperator
    ) {
        if (page < 0) page = 0;
        if (size < 1) size = 1;
        if (size > 100) size = 100;
        log.debug("GET /api/v1/sessions - page={}, size={}, sort={}, pipelineId={}, status={}",
                page, size, sort, pipelineId, status);
        PagedResponse<SessionPageResponse> response =
                sessionService.getAll(page, size, sort, id, pipelineId, status, startDt, createdAt, updatedAt,
                startDtOperator, createdAtOperator, updatedAtOperator);
        return ResponseEntity.ok(response);
    }

    /**
     * Возвращает одну сессию по идентификатору, включая её сессии задач.
     */
    @GetMapping("/{sessionId}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.sessions.get')")
    @Operation(summary = "Получить сессию по идентификатору",
            description = "Возвращает сессию выполнения конвейера по идентификатору, включая входящие в неё сессии задач")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Сессия найдена"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра сессии"),
            @ApiResponse(responseCode = "404", description = "Сессия не найдена")
    })
    public ResponseEntity<SessionResponse> getById(
            @Parameter(description = "Идентификатор сессии") @PathVariable UUID sessionId) {
        log.debug("GET /api/v1/sessions/{}", sessionId);
        SessionResponse response = sessionService.getById(sessionId);
        return ResponseEntity.ok(response);
    }
}