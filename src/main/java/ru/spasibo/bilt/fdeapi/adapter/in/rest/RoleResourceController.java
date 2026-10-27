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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.AssignRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ResourceResponse;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.application.service.ResourceService;
import ru.spasibo.bilt.fdeapi.application.service.RoleService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;

import java.util.List;
import java.util.UUID;

/**
 * REST-контроллер управления привязками ресурсов к ролям.
 * Изменяющие операции требуют прав администратора.
 */
@Slf4j
@RestController
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
@RequestMapping("/api/v1/roles/{roleId}/resources")
@RequiredArgsConstructor
@Tag(name = "Ресурсы роли", description = "Управление привязками ресурсов (прав доступа) к роли")
public class RoleResourceController {

    private final RoleService roleService;
    private final ResourceService resourceService;
    private final PermissionService permissionService;

    /**
     * Возвращает полный список ресурсов, привязанных к роли.
     *
     * @param roleId идентификатор роли
     * @return список ресурсов роли (200 OK)
     */
    @GetMapping("/list")
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "Список ресурсов роли", description = "Возвращает полный список ресурсов, привязанных к указанной роли, без пагинации.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список ресурсов роли успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ресурсов роли"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<List<ResourceResponse>> getAllResourcesForRole(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId) {
        List<ResourceResponse> resources = roleService.getResourcesForRole(roleId).stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(resources);
    }

    /**
     * Возвращает постраничный список ресурсов роли с фильтрацией и сортировкой.
     * Защищён аннотацией @PreAuthorize.
     *
     * @param roleId идентификатор роли
     * @return страница ресурсов роли (200 OK)
     */
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "Ресурсы роли (постранично)",
            description = "Возвращает постраничный список ресурсов, привязанных к роли, с фильтрацией и сортировкой.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Страница ресурсов роли успешно получена"),
            @ApiResponse(responseCode = "400", description = "Некорректные параметры пагинации или фильтрации"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ресурсов роли"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<PagedResponse<ResourceResponse>> getResourcesForRole(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,

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
                = resourceService.getAllByRoleId(roleId, page, size, sort, type, code, name, description, createdAt, createdAtOperator);


        return ResponseEntity.ok(response);
    }



    /**
     * Привязывает ресурс к роли. Требует прав администратора.
     *
     * @param roleId    идентификатор роли
     * @param request   данные с идентификатором привязываемого ресурса
     * @param principal аутентифицированный пользователь
     * @return 201 Created
     */
    @PostMapping
    @Operation(summary = "Привязать ресурс к роли", description = "Привязывает ресурс (право доступа) к роли. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Ресурс успешно привязан к роли"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные запроса"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "Роль или ресурс не найдены")
    })
    public ResponseEntity<Void> assignResource(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Valid @RequestBody AssignRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        roleService.assignResource(roleId, request.getTargetId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Отвязывает ресурс от роли. Требует прав администратора.
     *
     * @param roleId     идентификатор роли
     * @param resourceId идентификатор ресурса
     * @param principal  аутентифицированный пользователь
     * @return 204 No Content
     */
    @DeleteMapping("/{resourceId}")
    @Operation(summary = "Отвязать ресурс от роли", description = "Удаляет привязку ресурса (права доступа) к роли. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Ресурс успешно отвязан от роли"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "Роль или ресурс не найдены")
    })
    public ResponseEntity<Void> removeResource(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Parameter(description = "Идентификатор ресурса") @PathVariable UUID resourceId,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        roleService.removeResource(roleId, resourceId);
        return ResponseEntity.noContent().build();
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

    private void requireAuthenticated(UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }
    }
}