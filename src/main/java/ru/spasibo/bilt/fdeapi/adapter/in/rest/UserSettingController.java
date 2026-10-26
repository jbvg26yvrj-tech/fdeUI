package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.SaveSettingRequest;
import ru.spasibo.bilt.fdeapi.application.service.UserSettingService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;

import java.util.Map;
import java.util.UUID;

/**
 * REST-контроллер для пользовательских настроек вида ключ-значение.
 * Все операции применяются к текущему аутентифицированному пользователю.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/user-settings")
@RequiredArgsConstructor
@Validated
@Tag(name = "Настройки пользователя", description = "Пользовательские настройки вида ключ-значение для текущего пользователя")
public class UserSettingController {

    private final UserSettingService userSettingService;

    /**
     * Сохраняет или обновляет настройку для текущего пользователя.
     *
     * @param principal аутентифицированный пользователь
     * @param request   ключ и значение настройки
     * @return 200 OK с сохранённой парой ключ-значение
     */
    @PostMapping
    @Operation(summary = "Сохранить настройку",
            description = "Сохраняет новую или обновляет существующую настройку текущего пользователя")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Настройка успешно сохранена"),
            @ApiResponse(responseCode = "400", description = "Некорректные данные запроса"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация")
    })
    public ResponseEntity<Map<String, String>> saveSetting(
            @AuthenticationPrincipal UserPrincipalDetails principal,
            @Valid @RequestBody SaveSettingRequest request) {
        UUID userId = extractUserId(principal);
        userSettingService.saveOrUpdate(userId, request.getKey(), request.getValue());
        return ResponseEntity.ok(Map.of(request.getKey(), request.getValue()));
    }

    /**
     * Возвращает настройку по ключу для текущего пользователя.
     *
     * @param principal аутентифицированный пользователь
     * @param key       ключ настройки
     * @return 200 OK со значением или 404, если не найдена
     */
    @GetMapping("/{key}")
    @Operation(summary = "Получить настройку по ключу",
            description = "Возвращает значение настройки текущего пользователя по указанному ключу")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Настройка найдена"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация"),
            @ApiResponse(responseCode = "404", description = "Настройка с указанным ключом не найдена")
    })
    public ResponseEntity<Map<String, String>> getSetting(
            @AuthenticationPrincipal UserPrincipalDetails principal,
            @Parameter(description = "Ключ настройки") @PathVariable String key) {
        UUID userId = extractUserId(principal);
        return userSettingService.get(userId, key)
                .map(value -> ResponseEntity.ok(Map.of(key, value)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Возвращает все настройки текущего пользователя.
     *
     * @param principal аутентифицированный пользователь
     * @return 200 OK со всеми настройками в виде карты ключ-значение
     */
    @GetMapping
    @Operation(summary = "Получить все настройки",
            description = "Возвращает все настройки текущего пользователя в виде карты ключ-значение")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Настройки успешно получены"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация")
    })
    public ResponseEntity<Map<String, String>> getAllSettings(
            @AuthenticationPrincipal UserPrincipalDetails principal) {
        UUID userId = extractUserId(principal);
        return ResponseEntity.ok(userSettingService.getAll(userId));
    }

    /**
     * Удаляет настройку по ключу для текущего пользователя.
     *
     * @param principal аутентифицированный пользователь
     * @param key       ключ настройки
     * @return 204 No Content
     */
    @DeleteMapping("/{key}")
    @Operation(summary = "Удалить настройку",
            description = "Удаляет настройку текущего пользователя по указанному ключу")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Настройка успешно удалена"),
            @ApiResponse(responseCode = "401", description = "Требуется аутентификация")
    })
    public ResponseEntity<Void> deleteSetting(
            @AuthenticationPrincipal UserPrincipalDetails principal,
            @Parameter(description = "Ключ настройки") @PathVariable String key) {
        UUID userId = extractUserId(principal);
        userSettingService.delete(userId, key);
        return ResponseEntity.noContent().build();
    }

    private UUID extractUserId(UserPrincipalDetails principal) {
        if (principal == null) {
            throw new AuthenticationException("Authentication required");
        }
        return principal.getPrincipal().id();
    }
}