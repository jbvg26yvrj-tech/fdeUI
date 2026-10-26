package ru.spasibo.bilt.fdeapi.domain.port;

import org.springframework.http.ResponseEntity;

/**
 * Исходящий порт для проксирования запросов к сервису fde-dispatcher.
 */
public interface DispatcherPort {

    /**
     * Проксирует GET-запрос к dispatcher.
     *
     * @param path относительный путь (например, "/api/v1/schedules/{id}")
     * @return ответ от dispatcher с исходным статус-кодом и телом
     */
    ResponseEntity<String> proxyGet(String path);

    /**
     * Проксирует POST-запрос к dispatcher.
     *
     * @param path относительный путь
     * @param body тело запроса в формате JSON
     * @return ответ от dispatcher
     */
    ResponseEntity<String> proxyPost(String path, String body);

    /**
     * Проксирует PUT-запрос к dispatcher.
     *
     * @param path относительный путь
     * @param body тело запроса в формате JSON
     * @return ответ от dispatcher
     */
    ResponseEntity<String> proxyPut(String path, String body);

    /**
     * Проксирует DELETE-запрос к dispatcher.
     *
     * @param path относительный путь
     * @return ответ от dispatcher
     */
    ResponseEntity<String> proxyDelete(String path);
}