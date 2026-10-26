package ru.spasibo.bilt.fdeapi.domain.model;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Map;

/**
 * Доменная модель агрегированных RLS-фильтров пользователя.
 * Содержит отображение кода ресурса на JSON-строку фильтра,
 * объединённое по всем ролям, назначенным пользователю.
 *
 * @param filters отображение кода ресурса на JSON-строку фильтра
 */
public record UserRls(
        Map<String, JsonNode> filters
) {
}