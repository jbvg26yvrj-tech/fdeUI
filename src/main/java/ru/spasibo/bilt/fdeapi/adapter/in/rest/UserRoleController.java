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
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserPermissionsResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.UserEntity;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.application.service.RoleService;
import ru.spasibo.bilt.fdeapi.application.service.UserService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.UserPermissions;

import java.util.List;
import java.util.UUID;

/**
 * REST-контроллер для управления назначениями пользователей на роли и запроса прав пользователя.
 * Изменяющие операции требуют прав администратора.
 * Запрос прав доступен только самому пользователю или администратору.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
@Tag(name = "Роли пользователя", description = "Назначение пользователей на роли и запрос прав пользователя")
public class UserRoleController {

    private final RoleService roleService;
    private final UserService userService;
    private final PermissionService permissionService;

    /**
     * Возвращает список всех пользователей, назначенных на роль.
     * Защищено через @PreAuthorize.
     */
    @GetMapping("/api/v1/roles/{roleId}/assignedusers")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.permissions.view')")
    @Operation(summary = "Пользователи роли (список)",
            description = "Возвращает полный список пользователей, назначенных на указанную роль")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список пользователей успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<List<UserResponse>> getAssignedUsers(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId) {
        List<UserResponse> users = roleService.getUsersForRole(roleId).stream()
                .map(this::toUserResponse)
                .toList();
        return ResponseEntity.ok(users);
    }

    /**
     * Возвращает постраничный список пользователей, назначенных на роль.
     * Защищено через @PreAuthorize.
     */
    @GetMapping("/api/v1/roles/{roleId}/users")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.permissions.view')")
    @Operation(summary = "Пользователи роли (постранично)",
            description = "Возвращает постраничный список пользователей, назначенных на указанную роль, с опциональным фильтром по логину")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список пользователей успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра"),
            @ApiResponse(responseCode = "404", description = "Роль не найдена")
    })
    public ResponseEntity<PagedResponse<UserResponse>> getUsersForRole(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(defaultValue = "login") String sort,
            @Parameter(description = "Фильтр по логину") @RequestParam(required = false) String login
    ) {

        PagedResponse<UserResponse> response
                = userService.getAllByRoleId(roleId, page, size, sort, login);


        return ResponseEntity.ok(response);
    }

    /**
     * Назначает пользователя на роль.
     */
    @PostMapping("/api/v1/roles/{roleId}/users")
    @Operation(summary = "Назначить пользователя на роль",
            description = "Назначает пользователя на указанную роль. Требует прав администратора")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Пользователь успешно назначен на роль"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные запроса"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуется администратор)"),
            @ApiResponse(responseCode = "404", description = "Роль или пользователь не найдены")
    })
    public ResponseEntity<Void> assignUser(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Valid @RequestBody AssignRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        roleService.assignUser(roleId, request.getTargetId());
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    /**
     * Снимает назначение пользователя с роли.
     */
    @DeleteMapping("/api/v1/roles/{roleId}/users/{userId}")
    @Operation(summary = "Снять пользователя с роли",
            description = "Снимает назначение пользователя с указанной роли. Требует прав администратора")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Назначение успешно снято"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (требуется администратор)"),
            @ApiResponse(responseCode = "404", description = "Роль или пользователь не найдены")
    })
    public ResponseEntity<Void> removeUser(
            @Parameter(description = "Идентификатор роли") @PathVariable UUID roleId,
            @Parameter(description = "Идентификатор пользователя") @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);
        permissionService.requireAdmin(principal.getPrincipal());

        roleService.removeUser(roleId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Возвращает агрегированные права для конкретного пользователя.
     * Запросить права может только сам пользователь или администратор.
     */
    @GetMapping("/api/v1/users/{userId}/permissions")
    @Operation(summary = "Права пользователя",
            description = "Возвращает агрегированные права (коды ролей и ресурсов) для указанного пользователя. Доступно самому пользователю или администратору")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Права пользователя успешно получены"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав (не сам пользователь и не администратор)"),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден")
    })
    public ResponseEntity<UserPermissionsResponse> getUserPermissions(
            @Parameter(description = "Идентификатор пользователя") @PathVariable UUID userId,
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        requireAuthenticated(principal);

        UUID currentUserId = principal.getPrincipal().id();
        if (!userId.equals(currentUserId)) {
            // Запрашиваются не свои права — требуется администратор
            permissionService.requireAdmin(principal.getPrincipal());
        }

        UserPermissions permissions = permissionService.getUserPermissions(userId);
        return ResponseEntity.ok(UserPermissionsResponse.builder()
                .roleCodes(permissions.roleCodes())
                .resourceCodes(permissions.resourceCodes())
                .build());
    }

    private UserResponse toUserResponse(AuthUserData user) {
        return UserResponse.builder()
                .id(user.id())
                .login(user.login())
                .activated(user.activated())
                .passwordChangeRequired(user.passwordChangeRequired())
                .build();
    }

    private void requireAuthenticated(UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }
    }
}