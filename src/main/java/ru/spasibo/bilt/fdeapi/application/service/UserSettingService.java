package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.domain.port.UserSettingPort;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Сервис приложения для управления пользовательскими настройками формата ключ-значение.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserSettingService {

    private final UserSettingPort userSettingPort;

    /**
     * Сохраняет или обновляет настройку для заданного пользователя.
     *
     * @param userId UUID пользователя
     * @param key    ключ настройки
     * @param value  значение настройки
     */
    @Transactional
    public void saveOrUpdate(UUID userId, String key, String value) {
        userSettingPort.saveOrUpdate(userId, key, value);
        log.debug("Настройка сохранена: userId={}, key={}", userId, key);
    }

    /**
     * Возвращает значение одной настройки по ключу.
     *
     * @param userId UUID пользователя
     * @param key    ключ настройки
     * @return значение настройки, если найдено
     */
    @Transactional(readOnly = true)
    public Optional<String> get(UUID userId, String key) {
        return userSettingPort.get(userId, key);
    }

    /**
     * Возвращает все настройки заданного пользователя.
     *
     * @param userId UUID пользователя
     * @return карта пар ключ-значение
     */
    @Transactional(readOnly = true)
    public Map<String, String> getAll(UUID userId) {
        return userSettingPort.getAll(userId);
    }

    /**
     * Удаляет настройку по ключу.
     *
     * @param userId UUID пользователя
     * @param key    ключ настройки
     */
    @Transactional
    public void delete(UUID userId, String key) {
        userSettingPort.delete(userId, key);
        log.debug("Настройка удалена: userId={}, key={}", userId, key);
    }
}