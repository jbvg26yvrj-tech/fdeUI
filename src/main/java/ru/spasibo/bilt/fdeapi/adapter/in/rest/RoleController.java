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
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.CreateRoleRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.UpdateRoleRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ResourceResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.RoleResponse;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.application.service.RoleService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.model.RoleData;

import java.util.List;
import java.util.UUID;

/**
 * REST-контроллер CRUD-операций над ролями.
 * Изменяющие операции требуют прав администратора.
 */
@Slf4j
@RestController
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
@Tag(name = "Роли", description = "Управление ролями RBAC: создание, чтение, изменение, удаление")
public class RoleController {

    private final RoleService roleService;
    private final PermissionService permissionService;

    /**
     * Возвращает постраничный список ролей с фильтрацией и сортировкой.
     * Защищён аннотацией @PreAuthorize.
     *
     * @return страница ролей (200 OK)
     */
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "Список ролей (постранично)",
            description = "Возвращает постраничный список ролей с поддержкой фильтрации и сортировки.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Страница ролей успешно получена"),
            @ApiResponse(responseCode = "400", description = "Некорректные параметры пагинации или фильтрации"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ролей")
    })
    public ResponseEntity<PagedResponse<RoleResponse>> getRoles(
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(defaultValue = "code") String sort,
            @Parameter(description = "Фильтр по коду роли") @RequestParam(required = false) String code,
            @Parameter(description = "Фильтр по имени роли") @RequestParam(required = false) String name,
            @Parameter(description = "Фильтр по описанию роли") @RequestParam(required = false) String description,
            @Parameter(description = "Фильтр по дате создания") @RequestParam(required = false) String createdAt,
            @Parameter(description = "Оператор сравнения для даты создания") @RequestParam(required = false) String createdAtOperator ) {

        PagedResponse<RoleResponse> response
                = roleService.getAllPaged(page, size, sort, code, name, description, createdAt, createdAtOperator);


        return ResponseEntity.ok(response);
    }
    /**
     * Возвращает полный список ролей без пагинации.
     *
     * @return список ролей (200 OK)
     */
    @GetMapping("/all")
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "Список всех ролей", description = "Возвращает полный список ролей без пагинации.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список ролей успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра ролей")
    })
    public ResponseEntity<List<RoleResponse>> getAllRoles() {
        List<RoleResponse> roles = roleService.getAllRoles().stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(roles);
    }


    /**
     * Возвращает роль по её идентификатору.
     * Защищён аннотацией @PreAuthorize.
     *
     * @param id идентификатор роли
     * @return данные роли (200 OK)
     */
    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "Получить роль", description = "Возвращает роль по её идентификатору.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Роль найдена"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра роли"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<RoleResponse> getById(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID id) {
        return ResponseEntity.ok(toResponse(roleService.getById(id)));
    }

    /**
     * Создаёт новую роль. Требует прав администратора.
     *
     * @param request   данные для создания роли
     * @param principal аутентифицированный пользователь
     * @return созданная роль (201 Created)
     */
    @PostMapping
    @Operation(summary = "Создать роль", description = "Создаёт новую роль. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Роль успешно создана"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные роли"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)")
    })
    public ResponseEntity<RoleResponse> create(
            @Valid @RequestBody CreateRoleRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        RoleData created = roleService.create(
                request.getCode(), request.getName(), request.getDescription(), request.getClientCodes());
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(created));
    }

    /**
     * Обновляет существующую роль. Требует прав администратора.
     * Добавлена аннотация {@code @Valid} к параметру тела запроса.
     *
     * @param id        идентификатор роли
     * @param request   новые данные роли
     * @param principal аутентифицированный пользователь
     * @return обновлённая роль (200 OK)
     */
    @PutMapping("/{id}")
    @Operation(summary = "Обновить роль", description = "Обновляет существующую роль по её идентификатору. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Роль успешно обновлена"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные роли"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<RoleResponse> update(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        RoleData updated = roleService.update(id, request.getName(), request.getDescription(), request.getClientCodes());
        return ResponseEntity.ok(toResponse(updated));
    }

    /**
     * Удаляет роль по её идентификатору. Требует прав администратора.
     *
     * @param id        идентификатор роли
     * @param principal аутентифицированный пользователь
     * @return 204 No Content
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить роль", description = "Удаляет роль по её идентификатору. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Роль успешно удалена"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        roleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private RoleResponse toResponse(RoleData data) {
        return RoleResponse.builder()
                .id(data.id())
                .code(data.code())
                .name(data.name())
                .description(data.description())
                .isSystem(data.isSystem())
                .createdAt(data.createdAt())
                .clientCodes(data.clientCodes())
                .build();
    }

    private void requireAuthenticated(UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }
    }
}