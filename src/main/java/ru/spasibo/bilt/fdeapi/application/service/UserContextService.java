package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.exception.UserNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.UserContext;
import ru.spasibo.bilt.fdeapi.domain.model.UserPermissions;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.PermissionPort;
import ru.spasibo.bilt.fdeapi.domain.port.RlsPort;
import ru.spasibo.bilt.fdeapi.domain.port.UserSettingPort;

import java.util.Map;
import java.util.UUID;

/**
 * Сервис приложения, агрегирующий данные пользователя, настройки
 * и права доступа для контекста пользователя на фронтенде.
 * Возвращает доменную модель {@link UserContext} вместо DTO адаптера.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserContextService {

    private final AuthUserPort authUserPort;
    private final UserSettingPort userSettingPort;
    private final PermissionPort permissionPort;
    private final RlsPort rlsPort;

    /**
     * Формирует контекст пользователя по заданному идентификатору.
     * Объединяет данные пользователя + настройки + права доступа + RLS-фильтры.
     *
     * @param userId UUID пользователя
     * @return агрегированный доменный объект контекста пользователя
     * @throws UserNotFoundException если пользователь не найден
     */
    @Transactional(readOnly = true)
    public UserContext getUserContext(UUID userId) {
        AuthUserData user = authUserPort.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userId));

        Map<String, String> settings = userSettingPort.getAll(userId);
        UserPermissions permissions = permissionPort.getUserPermissions(userId);
        UserRls rls = rlsPort.getUserRls(userId);

        return new UserContext(user, settings, permissions, rls);
    }
}