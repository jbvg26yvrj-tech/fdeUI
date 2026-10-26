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
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.CreateUserRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.UpdateUserRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.application.service.UserService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;

import java.util.UUID;

/**
 * REST-контроллер для управления пользователями (административный CRUD).
 * Маппинг из доменных объектов в DTO выполняется в этом контроллере,
 * а не в слое сервиса.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
@Tag(name = "Пользователи", description = "Управление пользователями (административный CRUD)")
public class UserController {

    private final UserService userService;

    /**
     * Возвращает постраничный список всех пользователей.
     * Защищено через @PreAuthorize.
     *
     * @param page номер страницы (начиная с 0)
     * @param size размер страницы
     * @param sort поле и опциональное направление сортировки
     * @return постраничный список пользователей
     */
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasPermission('api.users.list')")
    @Operation(summary = "Список пользователей",
            description = "Возвращает постраничный список всех пользователей с опциональными фильтрами по логину, активности и необходимости смены пароля")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Список пользователей успешно получен"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра списка пользователей")
    })
    public ResponseEntity<PagedResponse<UserResponse>> getAll(
            @Parameter(description = "Номер страницы (начиная с 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Размер страницы") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Поле и направление сортировки") @RequestParam(defaultValue = "login") String sort,
            @Parameter(description = "Фильтр по логину") @RequestParam(required = false) String login,
            @Parameter(description = "Фильтр по признаку активности") @RequestParam(required = false) Boolean activated,
            @Parameter(description = "Фильтр по необходимости смены пароля") @RequestParam(required = false) Boolean passwordChangeRequired
            ) {

        PagedResponse<UserResponse> response = userService.getAll(page, size, sort, login, activated, passwordChangeRequired );


        return ResponseEntity.ok(response);
    }

    /**
     * Возвращает одного пользователя по идентификатору.
     * Защищено через @PreAuthorize.
     *
     * @param id UUID пользователя
     * @return данные пользователя
     */
    @GetMapping("/{id}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.users.get')")
    @Operation(summary = "Получить пользователя по идентификатору",
            description = "Возвращает данные одного пользователя по его идентификатору")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пользователь найден"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для просмотра пользователя"),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден")
    })
    public ResponseEntity<UserResponse> getById(
            @Parameter(description = "Идентификатор пользователя") @PathVariable UUID id) {
        return ResponseEntity.ok(toUserResponse(userService.getById(id)));
    }

    /**
     * Создаёт нового пользователя (административная операция).
     * Права проверяются через @PreAuthorize (декларативно).
     *
     * @param request   данные для создания пользователя
     * @param principal аутентифицированный администратор
     * @return созданный пользователь (201 Created)
     */
    @PostMapping
    @PreAuthorize("@permissionService.currentUserHasPermission('api.users.create')")
    @Operation(summary = "Создать пользователя",
            description = "Создаёт нового пользователя. Административная операция")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Пользователь успешно создан"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные запроса"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для создания пользователя")
    })
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {

        AuthUserData created = userService.create(
                principal.getPrincipal(),
                request.getLogin(),
                request.getPassword(),
                request.isActivated()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toUserResponse(created));
    }

    /**
     * Обновляет пользователя (активация/деактивация, passwordChangeRequired).
     * Права проверяются через @PreAuthorize (декларативно).
     *
     * @param id        UUID пользователя
     * @param request   обновляемые поля
     * @param principal аутентифицированный администратор
     * @return обновлённый пользователь
     */
    @PutMapping("/{id}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.users.update')")
    @Operation(summary = "Обновить пользователя",
            description = "Обновляет данные пользователя: признак активности и необходимость смены пароля")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Пользователь успешно обновлён"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные запроса"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для обновления пользователя"),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден")
    })
    public ResponseEntity<UserResponse> update(
            @Parameter(description = "Идентификатор пользователя") @PathVariable UUID id,
            @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal UserPrincipalDetails principal) {

        AuthUserData updated = userService.update(
                principal.getPrincipal(),
                id,
                request.getActivated(),
                request.getPasswordChangeRequired()
        );
        return ResponseEntity.ok(toUserResponse(updated));
    }

    /**
     * Удаляет пользователя. Нельзя удалить самого себя.
     * Права проверяются через @PreAuthorize (декларативно).
     *
     * @param id        UUID удаляемого пользователя
     * @param principal аутентифицированный администратор
     * @return 204 No Content
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("@permissionService.currentUserHasPermission('api.users.delete')")
    @Operation(summary = "Удалить пользователя",
            description = "Удаляет пользователя по идентификатору. Удаление самого себя запрещено")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Пользователь успешно удалён"),
            @ApiResponse(responseCode = "400", description = "Попытка удалить самого себя"),
            @ApiResponse(responseCode = "403", description = "Недостаточно прав для удаления пользователя"),
            @ApiResponse(responseCode = "404", description = "Пользователь не найден")
    })
    public ResponseEntity<Void> delete(
            @Parameter(description = "Идентификатор удаляемого пользователя") @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipalDetails principal) {

        userService.delete(principal.getPrincipal(), id);
        return ResponseEntity.noContent().build();
    }

    // ---- Private helpers ----

    /**
     * Преобразует доменный AuthUserData в REST-ответ DTO.
     */
    private UserResponse toUserResponse(AuthUserData user) {
        return UserResponse.builder()
                .id(user.id())
                .login(user.login())
                .activated(user.activated())
                .passwordChangeRequired(user.passwordChangeRequired())
                .build();
    }

}