package ru.spasibo.bilt.fdeapi.domain.port;

import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;

import java.util.Optional;
import java.util.UUID;

/**
 * Порт доступа к личности текущего аутентифицированного пользователя.
 * Отвязывает сервисы приложения от SecurityContextHolder из Spring Security.
 */
public interface CurrentUserPort {

    /**
     * Возвращает UUID текущего пользователя, если он аутентифицирован.
     *
     * @return идентификатор текущего пользователя или пусто, если не аутентифицирован
     */
    Optional<UUID> getCurrentUserId();

    /**
     * Возвращает principal текущего пользователя, если он аутентифицирован.
     *
     * @return principal текущего пользователя или пусто, если не аутентифицирован
     */
    Optional<UserPrincipal> getCurrentUser();
}