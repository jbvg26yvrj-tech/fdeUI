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
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ParamDefinition;
import ru.spasibo.bilt.fdeapi.application.service.TaskTemplateService;

import java.util.List;

/**
 * REST-контроллер для получения шаблонов параметров задачи.
 * Используется фронтендом для динамического построения форм.
 */
@RestController
@RequestMapping("/api/v1/task-templates")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Шаблоны задач", description = "Получение шаблонов параметров задач для динамического построения форм")
public class TaskTemplateController {

    private final TaskTemplateService taskTemplateService;

    /**
     * Возвращает шаблон параметров для указанного типа задачи.
     *
     * @param typeCode тип задачи (например, "SftpDownloadTask")
     * @return список описаний параметров
     */
    @GetMapping("/{typeCode}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.pipelines.create') " +
            "or @permissionService.currentUserHasPermission('api.pipelines.update')")
    @Operation(summary = "Получить шаблон параметров задачи",
            description = "Возвращает список описаний параметров для указанного типа задачи. Используется фронтендом для динамического построения форм")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Шаблон параметров успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для получения шаблона"),
            @ApiResponse(responseCode = "404", description = "Тип задачи не найден")
    })
    public ResponseEntity<List<ParamDefinition>> getTaskTemplate(
            @Parameter(description = "Код типа задачи (например, \"SftpDownloadTask\")") @PathVariable String typeCode) {
        log.debug("Запрошен шаблон для typeCode: {}", typeCode);
        List<ParamDefinition> template = taskTemplateService.getTemplate(typeCode);
        return ResponseEntity.ok(template);
    }
}