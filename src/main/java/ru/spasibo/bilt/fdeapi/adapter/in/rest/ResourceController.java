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
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelinePageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ResourceResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.application.service.ResourceService;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * REST-контроллер запросов ресурсов (прав доступа).
 * Ресурсы управляются системой; доступны только эндпоинты на чтение.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
@Tag(name = "Ресурсы (RBAC)", description = "Просмотр системных ресурсов (прав доступа) модели RBAC")
public class ResourceController {

    private final ResourceService resourceService;

    /**
     * Возвращает полный список ресурсов.
     *
     * @return список ресурсов (200 OK)
     */
    @GetMapping("/list")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.permissions.view')")
    @Operation(summary = "Список всех ресурсов", description = "Возвращает полный список системных ресурсов без пагинации.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список ресурсов успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ресурсов")
    })
    public ResponseEntity<List<ResourceResponse>> getResourcesList() {
        List<ResourceResponse> resources = resourceService.getResourcesList().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(resources);
    }

    /**
     * Возвращает постраничный список ресурсов с фильтрацией и сортировкой.
     * Защищён аннотацией @PreAuthorize.
     *
     * @return страница ресурсов (200 OK)
     */
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasPermission('api.permissions.view')")
    @Operation(summary = "Список ресурсов (постранично)",
            description = "Возвращает постраничный список ресурсов с поддержкой фильтрации и сортировки.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Страница ресурсов успешно получена"),
            @ApiResponse(responseCode = "400", description = "Некорректные параметры пагинации или фильтрации"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ресурсов")
    })
    public ResponseEntity<PagedResponse<ResourceResponse>> getResourcesByPage(
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(defaultValue = "code") String sort,
            @Parameter(description = "Фильтр по типу ресурса") @RequestParam(required = false) String type,
            @Parameter(description = "Фильтр по коду ресурса") @RequestParam(required = false) String code,
            @Parameter(description = "Фильтр по имени ресурса") @RequestParam(required = false) String name,
            @Parameter(description = "Фильтр по описанию ресурса") @RequestParam(required = false) String description,
            @Parameter(description = "Фильтр по дате создания") @RequestParam(required = false) String createdAt,
            @Parameter(description = "Оператор сравнения для даты создания") @RequestParam(required = false) String createdAtOperator

    ) {

        PagedResponse<ResourceResponse> response
                    = resourceService.getResourcesByPage(page, size, sort, type, code, name, description, createdAt, createdAtOperator);


        return ResponseEntity.ok(response);
    }

    /**
     * Возвращает список ресурсов указанного типа.
     * Защищён аннотацией @PreAuthorize.
     *
     * @param type тип ресурса
     * @return список ресурсов данного типа (200 OK)
     */
    @GetMapping("/type/{type}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.permissions.view')")
    @Operation(summary = "Ресурсы по типу", description = "Возвращает список ресурсов указанного типа.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список ресурсов успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ресурсов")
    })
    public List<ResourceData> getByType(
            @Parameter(description = "Тип ресурса") @PathVariable(required = false) String type) {
        return resourceService.getByType(type);
    }

    /**
     * Возвращает ресурс по его идентификатору.
     *
     * @param id идентификатор ресурса
     * @return данные ресурса (200 OK)
     */
    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.permissions.view')")
    @Operation(summary = "Получить ресурс", description = "Возвращает ресурс по его идентификатору.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ресурс найден"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ресурса"),
            @ApiResponse(responseCode = "404", description = "Ресурс не найден")
    })
    public ResponseEntity<ResourceResponse> getById(
            @Parameter(description = "Идентификатор ресурса") @PathVariable UUID id) {
        return ResponseEntity.ok(toResponse(resourceService.getById(id)));
    }
    
    private ResourceResponse toResponse(ResourceData data) {
        return ResourceResponse.builder()
                .id(data.id())
                .code(data.code())
                .name(data.name())
                .description(data.description())
                .type(data.type())
                .createdAt(data.createdAt())
                .build();
    }
}