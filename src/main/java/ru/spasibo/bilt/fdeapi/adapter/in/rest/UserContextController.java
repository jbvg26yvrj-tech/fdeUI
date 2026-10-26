package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserContextResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.application.service.UserContextService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.UserContext;

/**
 * REST-контроллер для контекста пользователя: агрегированные данные пользователя + настройки
 * для инициализации фронтенда.
 * Маппинг из доменных объектов в DTO выполняется здесь, а не в сервисе.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/user-context")
@RequiredArgsConstructor
@Tag(name = "Контекст пользователя", description = "Агрегированные данные текущего пользователя для инициализации фронтенда")
public class UserContextController {

    private final UserContextService userContextService;

    /**
     * Возвращает контекст текущего пользователя (данные пользователя + настройки + права + RLS).
     *
     * @param principal аутентифицированный пользователь
     * @return контекст пользователя
     */
    @GetMapping
    @Operation(summary = "Получить контекст текущего пользователя",
            description = "Возвращает агрегированные данные текущего пользователя: информацию о пользователе, настройки, права доступа и RLS-фильтры")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Контекст пользователя успешно получен"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация")
    })
    public ResponseEntity<UserContextResponse> getUserContext(
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }

        UserContext context = userContextService.getUserContext(principal.getPrincipal().id());

        return ResponseEntity.ok(toResponse(context));
    }

    private UserContextResponse toResponse(UserContext context) {
        AuthUserData user = context.user();

        UserResponse userResponse = UserResponse.builder()
                .id(user.id())
                .login(user.login())
                .activated(user.activated())
                .passwordChangeRequired(user.passwordChangeRequired())
                .build();

        return UserContextResponse.builder()
                .user(userResponse)
                .settings(context.settings())
                .roleCodes(context.permissions().roleCodes())
                .resourceCodes(context.permissions().resourceCodes())
                .rlsFilters(context.rls().filters())
                .build();
    }
}