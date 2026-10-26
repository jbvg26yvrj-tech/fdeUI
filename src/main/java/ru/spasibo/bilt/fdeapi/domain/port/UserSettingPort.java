package ru.spasibo.bilt.fdeapi.domain.port;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Порт операций персистентности пользовательских настроек.
 */
public interface UserSettingPort {

    /**
     * Сохраняет или обновляет настройку указанного пользователя.
     *
     * @param userId UUID пользователя
     * @param key    ключ настройки
     * @param value  значение настройки
     */
    void saveOrUpdate(UUID userId, String key, String value);

    /**
     * Получает значение одной настройки по ключу.
     *
     * @param userId UUID пользователя
     * @param key    ключ настройки
     * @return значение настройки, если найдено
     */
    Optional<String> get(UUID userId, String key);

    /**
     * Получает все настройки указанного пользователя.
     *
     * @param userId UUID пользователя
     * @return отображение пар ключ-значение
     */
    Map<String, String> getAll(UUID userId);

    /**
     * Удаляет настройку по ключу.
     *
     * @param userId UUID пользователя
     * @param key    ключ настройки
     */
    void delete(UUID userId, String key);
}