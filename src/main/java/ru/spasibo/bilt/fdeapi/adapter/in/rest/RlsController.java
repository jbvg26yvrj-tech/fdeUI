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
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.SaveRlsFilterRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ResourceResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.RlsFilterResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserRlsResponse;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.application.service.RlsService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.model.RlsFilter;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;

import java.util.UUID;

/**
 * REST-контроллер управления фильтрами безопасности на уровне строк (RLS).
 * Предоставляет CRUD для RLS-фильтров на уровне ролей и агрегацию RLS пользователя.
 */
@Slf4j
@RestController
@PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "RLS-фильтры", description = "Управление фильтрами безопасности на уровне строк (Row-Level Security) для ролей и пользователей")
public class RlsController {

    private final RlsService rlsService;
    private final PermissionService permissionService;

    /**
     * Возвращает постраничный список всех RLS-фильтров роли. Требует прав администратора.
     *
     * @param roleId идентификатор роли
     * @return страница RLS-фильтров (200 OK)
     */
    @GetMapping("/roles/{roleId}/rls")
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    @Operation(summary = "RLS-фильтры роли",
            description = "Возвращает постраничный список RLS-фильтров для указанной роли с фильтрацией и сортировкой.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Страница RLS-фильтров успешно получена"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра RLS-фильтров"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<PagedResponse<RlsFilterResponse>> getResourcesForRole(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(defaultValue = "resourceCode") String sort,
            @Parameter(description = "Фильтр по коду ресурса") @RequestParam(required = false) String resourceCode,
            @Parameter(description = "Фильтр по имени ресурса") @RequestParam(required = false) String resourceName,
            @Parameter(description = "Фильтр по дате создания") @RequestParam(required = false) String createdAt,
            @Parameter(description = "Оператор сравнения для даты создания") @RequestParam(required = false) String createdAtOperator ) {

        PagedResponse<RlsFilterResponse> response
                = rlsService.getAllByRoleId(roleId, page, size, sort, resourceCode, resourceName, createdAt, createdAtOperator );

        return ResponseEntity.ok(response);
    }



    /**
     * Возвращает конкретный RLS-фильтр для пары роль-ресурс. Требует прав администратора.
     * Использует отдельный одиночный запрос вместо загрузки всех фильтров роли.
     *
     * @param roleId     идентификатор роли
     * @param resourceId идентификатор ресурса
     * @param principal  аутентифицированный пользователь
     * @return выражение RLS-фильтра (200 OK) или 404, если фильтр не найден
     */
    @GetMapping("/roles/{roleId}/rls/{resourceId}")
    @Operation(summary = "Получить RLS-фильтр",
            description = "Возвращает RLS-фильтр для конкретной пары роль-ресурс. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "RLS-фильтр найден"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "RLS-фильтр не найден")
    })
    public ResponseEntity<String> getRlsFilter(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Parameter(description = "Идентификатор ресурса") @PathVariable UUID resourceId,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        return rlsService.getRlsFilter(roleId, resourceId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Создаёт или обновляет RLS-фильтр для пары роль-ресурс. Требует прав администратора.
     *
     * @param roleId     идентификатор роли
     * @param resourceId идентификатор ресурса
     * @param request    данные RLS-фильтра
     * @param principal  аутентифицированный пользователь
     * @return 201 Created
     */
    @PostMapping("/roles/{roleId}/rls/{resourceId}")
    @Operation(summary = "Сохранить RLS-фильтр",
            description = "Создаёт или обновляет RLS-фильтр для пары роль-ресурс. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "RLS-фильтр успешно сохранён"),
            @ApiResponse(responseCode = "400", description = "Некорректное выражение фильтра"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "Роль или ресурс не найдены")
    })
    public ResponseEntity<Void> saveRlsFilter(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Parameter(description = "Идентификатор ресурса") @PathVariable UUID resourceId,
            @Valid @RequestBody SaveRlsFilterRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        rlsService.saveRlsFilter(roleId, resourceId, request.getFilter());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Удаляет RLS-фильтр по его идентификатору. Требует прав администратора.
     *
     * @param id        идентификатор RLS-фильтра
     * @param principal аутентифицированный пользователь
     * @return 204 No Content
     */
    @DeleteMapping("/rls/{id}")
    @Operation(summary = "Удалить RLS-фильтр",
            description = "Удаляет RLS-фильтр по его идентификатору. Требует прав администратора.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "RLS-фильтр успешно удалён"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуются права администратора)"),
            @ApiResponse(responseCode = "404", description = "RLS-фильтр не найден")
    })
    public ResponseEntity<Void> deleteRlsFilter(
            @Parameter(description = "Идентификатор RLS-фильтра") @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());
        rlsService.deleteRlsFilter(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Возвращает агрегированные RLS-фильтры пользователя. Доступно самому пользователю или администратору.
     *
     * @param userId    идентификатор пользователя
     * @param principal аутентифицированный пользователь
     * @return агрегированные RLS-фильтры пользователя (200 OK)
     */
    @GetMapping("/users/{userId}/rls")
    @Operation(summary = "RLS-фильтры пользователя",
            description = "Возвращает агрегированные RLS-фильтры пользователя. Доступно самому пользователю или администратору.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Агрегированные RLS-фильтры успешно получены"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра RLS чужого пользователя"),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден")
    })
    public ResponseEntity<UserRlsResponse> getUserRls(
            @Parameter(description = "Идентификатор пользователя") @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);

        UUID currentUserId = principal.getPrincipal().id();
        if (!currentUserId.equals(userId)) {
            permissionService.requireAdmin(principal.getPrincipal());
        }

        UserRls userRls = rlsService.getUserRls(userId);

        UserRlsResponse response = UserRlsResponse.builder()
                .filters(userRls.filters())
                .build();

        return ResponseEntity.ok(response);
    }

    private RlsFilterResponse toResponse(RlsFilter filter) {
        return RlsFilterResponse.builder()
                .roleId(filter.roleId())
                .resourceId(filter.resourceId())
                .resourceCode(filter.resourceCode())
                .filter(filter.filter())
                .createdAt(filter.createdAt())
                .updatedAt(filter.updatedAt())
                .build();
    }

    private void requireAuthenticated(UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }
    }
}