package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.BulkDatacenterRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.CreatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.UpdatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.BulkDatacenterResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelinePageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelineResponse;
import ru.spasibo.bilt.fdeapi.application.service.PipelineService;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

import ru.spasibo.bilt.fdeapi.domain.model.TaskPropsDefinition;

/**
 * REST-контроллер управления пайплайнами обмена файлами.
 * Предоставляет CRUD-операции, массовую смену ЦОД и получение описания свойств задач.
 */
@RestController
@RequestMapping("/api/v1/pipelines")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Пайплайны", description = "Управление пайплайнами обмена файлами: создание, чтение, изменение, удаление")
public class PipelineController {

    private final PipelineService pipelineService;

    /**
     * Создаёт новый пайплайн.
     *
     * @param request данные для создания пайплайна
     * @return созданный пайплайн (201 Created)
     */
    @PostMapping
    @PreAuthorize("@permissionService.currentUserHasPermission('api.pipelines.create')")
    @Operation(summary = "Создать пайплайн", description = "Создаёт новый пайплайн обмена файлами на основе переданных данных.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Пайплайн успешно создан"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные пайплайна"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для создания пайплайна")
    })
    public ResponseEntity<PipelineResponse> create(@Valid @RequestBody CreatePipelineRequest request) {
        log.debug("POST /api/v1/pipelines - создание пайплайна: имя='{}'", request.getPipelineName());
        PipelineResponse response = pipelineService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Массово меняет основной ЦОД для группы пайплайнов.
     *
     * @param request данные с целевым ЦОД и списком пайплайнов
     * @return результат массового изменения (200 OK)
     */
    @PatchMapping("/datacenter")
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "Массовая смена ЦОД",
            description = "Массово изменяет основной центр обработки данных для группы пайплайнов. Требует роли ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "ЦОД успешно изменён для пайплайнов"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные запроса"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуется роль ADMIN)")
    })
    public ResponseEntity<BulkDatacenterResponse> bulkChangeDatacenter(
            @Valid @RequestBody BulkDatacenterRequest request) {
        log.debug("PATCH /api/v1/pipelines/datacenter - целевой ЦОД={}", request.getDatacenter());
        BulkDatacenterResponse response = pipelineService.bulkUpdateDatacenter(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Возвращает постраничный список пайплайнов с фильтрацией и сортировкой.
     *
     * @return страница пайплайнов (200 OK)
     */
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasPermission('api.pipelines.list')")
    @Operation(summary = "Список пайплайнов",
            description = "Возвращает постраничный список пайплайнов с поддержкой фильтрации по полям и сортировки.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Страница пайплайнов успешно получена"),
            @ApiResponse(responseCode = "400", description = "Некорректные параметры пагинации или фильтрации"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра списка")
    })
    public ResponseEntity<PagedResponse<PipelinePageResponse>> getAll(
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы (1..100)") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(required = false) String sort,
            @Parameter(description = "Фильтр по идентификатору пайплайна") @RequestParam(required = false) UUID id,
            @Parameter(description = "Фильтр по имени пайплайна") @RequestParam(required = false) String pipelineName,
            @Parameter(description = "Фильтр по системе-источнику") @RequestParam(required = false) String clientFrom,
            @Parameter(description = "Фильтр по системе-получателю") @RequestParam(required = false) String clientTo,
            @Parameter(description = "Фильтр по основному ЦОД") @RequestParam(required = false) String primaryDatacenter,
            @Parameter(description = "Фильтр по признаку \"всё или ничего\"") @RequestParam(required = false) Boolean allOrNothing,
            @Parameter(description = "Фильтр по дате создания") @RequestParam(required = false) String createdAt,
            @Parameter(description = "Фильтр по дате обновления") @RequestParam(required = false) String updatedAt,
            @Parameter(description = "Оператор сравнения для даты создания") @RequestParam(required = false) String createdAtOperator,
            @Parameter(description = "Оператор сравнения для даты обновления") @RequestParam(required = false) String updatedAtOperator
            ) {
        if (page < 0) page = 0;
        if (size < 1) size = 1;
        if (size > 100) size = 100;
        log.debug("GET /api/v1/pipelines - page={}, size={}, sort={}", page, size, sort);
        PagedResponse<PipelinePageResponse> response =
                pipelineService.getAll(page, size, sort, id, pipelineName, clientFrom, clientTo,
                                        primaryDatacenter, allOrNothing, createdAt, updatedAt, createdAtOperator, updatedAtOperator  );
        return ResponseEntity.ok(response);
    }

    /**
     * Возвращает пайплайн по его идентификатору.
     *
     * @param pipelineId идентификатор пайплайна
     * @return данные пайплайна (200 OK)
     */
    @GetMapping("/{pipelineId}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.pipelines.get')")
    @Operation(summary = "Получить пайплайн", description = "Возвращает данные пайплайна по его идентификатору.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пайплайн найден"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра"),
            @ApiResponse(responseCode = "404", description = "Пайплайн не найден")
    })
    public ResponseEntity<PipelineResponse> getById(
            @Parameter(description = "Идентификатор пайплайна") @PathVariable UUID pipelineId) {
        log.debug("GET /api/v1/pipelines/{}", pipelineId);
        PipelineResponse response = pipelineService.getById(pipelineId);
        return ResponseEntity.ok(response);
    }

    /**
     * Обновляет существующий пайплайн.
     *
     * @param pipelineId идентификатор пайплайна
     * @param request    новые данные пайплайна
     * @return обновлённый пайплайн (200 OK)
     */
    @PutMapping("/{pipelineId}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.pipelines.update')")
    @Operation(summary = "Обновить пайплайн", description = "Полностью обновляет существующий пайплайн по его идентификатору.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пайплайн успешно обновлён"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные пайплайна"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для обновления"),
            @ApiResponse(responseCode = "404", description = "Пайплайн не найден")
    })
    public ResponseEntity<PipelineResponse> update(
            @Parameter(description = "Идентификатор пайплайна") @PathVariable UUID pipelineId,
            @Valid @RequestBody UpdatePipelineRequest request) {
        log.debug("PUT /api/v1/pipelines/{}", pipelineId);
        PipelineResponse response = pipelineService.update(pipelineId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Возвращает описание обязательных и опциональных свойств для типа задачи.
     *
     * @param typeCode код типа задачи
     * @return карта со списками обязательных и опциональных свойств (200 OK)
     */
    @GetMapping("/task-props/{typeCode}")
    @Operation(summary = "Свойства типа задачи",
            description = "Возвращает наборы обязательных и опциональных свойств для указанного кода типа задачи.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Описание свойств получено"),
            @ApiResponse(responseCode = "404", description = "Тип задачи не найден или не имеет описанных свойств")
    })
    public ResponseEntity<Map<String, Set<String>>> getTaskProps(
            @Parameter(description = "Код типа задачи") @PathVariable String typeCode) {
        Set<String> required = TaskPropsDefinition.REQUIRED_PROPS.getOrDefault(typeCode, Set.of());
        Set<String> optional = TaskPropsDefinition.OPTIONAL_PROPS.getOrDefault(typeCode, Set.of());
        if (required.isEmpty() && optional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(Map.of("required", required, "optional", optional));
    }

    /**
     * Удаляет пайплайн по его идентификатору.
     *
     * @param pipelineId идентификатор пайплайна
     * @return 204 No Content
     */
    @DeleteMapping("/{pipelineId}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.pipelines.delete')")
    @Operation(summary = "Удалить пайплайн", description = "Удаляет пайплайн по его идентификатору.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Пайплайн успешно удалён"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для удаления"),
            @ApiResponse(responseCode = "404", description = "Пайплайн не найден")
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "Идентификатор пайплайна") @PathVariable UUID pipelineId) {
        log.debug("DELETE /api/v1/pipelines/{}", pipelineId);
        pipelineService.delete(pipelineId);
        return ResponseEntity.noContent().build();
    }
}