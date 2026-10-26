package ru.spasibo.bilt.fdeapi.util.rls;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import ru.spasibo.bilt.fdeapi.application.service.RlsService;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RlsFilterService {

    private final RlsService rlsService;
    private final ObjectMapper objectMapper;

    /**
     * Получить RLS фильтр для текущего пользователя и ресурса (без подстановки переменных).
     */
    public Optional<JsonNode> getFilterForResource(String resourceCode) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipalDetails)) {
                log.warn("Principal не найден или не является UserPrincipalDetails");
                return Optional.empty();
            }

            UserPrincipalDetails details = (UserPrincipalDetails) authentication.getPrincipal();
            UUID userId = details.getPrincipal().id();
            Map<String, JsonNode> userFilters = rlsService.getUserRls(userId).filters();
            return Optional.ofNullable(userFilters.get(resourceCode));
        } catch (Exception e) {
            log.error("Ошибка получения RLS фильтра для ресурса {}: {}", resourceCode, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Получить RLS фильтр для ресурса с подстановкой переменных пользователя.
     * @param resourceCode код ресурса
     * @param login логин пользователя (используется для замены ${login})
     * @return Optional с фильтром, где переменные заменены
     */
    public Optional<JsonNode> getResolvedFilterForResource(String resourceCode, String login) {
        try {
            Optional<JsonNode> filterOpt = getFilterForResource(resourceCode);
            if (filterOpt.isEmpty()) {
                return Optional.empty();
            }
            // Сериализуем фильтр в строку, заменяем переменные, десериализуем обратно
            String json = objectMapper.writeValueAsString(filterOpt.get());
            json = json.replace("${login}", login);
            JsonNode filterCopy = objectMapper.readTree(json);
            if (!validateRlsFilterStructure(filterCopy)) {
                log.warn("Некорректная структура RLS фильтра для ресурса {} после подстановки", resourceCode);
                return Optional.empty();
            }
            return Optional.of(filterCopy);
        } catch (Exception e) {
            log.error("Ошибка получения разрешенного RLS фильтра для ресурса {}: {}", resourceCode, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Получить RLS фильтр для текущего пользователя с подстановкой.
     */
    public Optional<JsonNode> getResolvedFilterForCurrentUser(String resourceCode) {
        String login = SecurityContextHolder.getContext().getAuthentication().getName();
        return getResolvedFilterForResource(resourceCode, login);
    }

    /**
     * Парсинг RLS фильтра и замена шаблонных значений (возвращает строку).
     */
    public String parseAndResolveFilter(JsonNode filterNode, String login) {
        if (filterNode == null || filterNode.isNull()) {
            return null;
        }
        try {
            // Для этого метода resourceCode извлечь неоткуда, поэтому используется заглушка.
            // В реальном использовании этот метод, вероятно, не нужен. Оставлен для совместимости.
            JsonNode resolved = getResolvedFilterForResource(null, login).orElse(filterNode);
            return resolved.toString();
        } catch (Exception e) {
            log.error("Ошибка парсинга RLS фильтра: {}", e.getMessage());
            return filterNode.toString();
        }
    }

    /**
     * Валидация структуры RLS фильтра.
     */
    public boolean validateFilter(JsonNode filter) {
        return validateRlsFilterStructure(filter);
    }

    // === Приватные вспомогательные методы ===

    private boolean validateRlsFilterStructure(JsonNode filter) {
        if (filter == null || filter.isNull()) {
            return true;
        }

        if (!filter.isObject()) {
            log.warn("RLS фильтр должен быть объектом JSON");
            return false;
        }

        if (filter.has("conditions")) {
            JsonNode conditions = filter.get("conditions");
            if (!conditions.isArray()) {
                log.warn("Поле 'conditions' должно быть массивом");
                return false;
            }

            for (JsonNode condition : conditions) {
                if (!validateCondition(condition)) {
                    return false;
                }
            }
        }

        if (filter.has("joins")) {
            JsonNode joins = filter.get("joins");
            if (!joins.isArray()) {
                log.warn("Поле 'joins' должно быть массивом");
                return false;
            }

            for (JsonNode join : joins) {
                if (!validateJoin(join)) {
                    return false;
                }
            }
        }

        if (filter.has("logicalOperator")) {
            String operator = filter.get("logicalOperator").asText();
            if (!"AND".equalsIgnoreCase(operator) && !"OR".equalsIgnoreCase(operator)) {
                log.warn("Недопустимый логический оператор: {}", operator);
                return false;
            }
        }

        if (!filter.has("conditions") && !filter.has("joins")) {
            log.warn("RLS фильтр должен содержать 'conditions' или 'joins'");
            return false;
        }

        return true;
    }

    private boolean validateCondition(JsonNode condition) {
        if (!condition.isObject()) {
            log.warn("Условие должно быть объектом JSON");
            return false;
        }

        if (!condition.has("field") || !condition.get("field").isTextual()) {
            log.warn("Условие должно содержать текстовое поле 'field'");
            return false;
        }

        if (!condition.has("operator") || !condition.get("operator").isTextual()) {
            log.warn("Условие должно содержать текстовое поле 'operator'");
            return false;
        }

        String operator = condition.get("operator").asText().toLowerCase();
        String[] validOperators = {"eq", "ne", "like", "notlike", "in", "notin", "gt", "lt", "gte", "lte",
                "startswith", "endswith", "isnull", "isnotnull"};

        if (!Arrays.asList(validOperators).contains(operator)) {
            log.warn("Недопустимый оператор: {}", operator);
            return false;
        }

        if (!"isnull".equals(operator) && !"isnotnull".equals(operator)) {
            if (!condition.has("value")) {
                log.warn("Условие с оператором '{}' должно содержать поле 'value'", operator);
                return false;
            }
        }

        return true;
    }

    private boolean validateJoin(JsonNode join) {
        if (!join.isObject()) {
            log.warn("JOIN должен быть объектом JSON");
            return false;
        }

        if (!join.has("association") || !join.get("association").isTextual()) {
            log.warn("JOIN должен содержать текстовое поле 'association'");
            return false;
        }

        if (join.has("type")) {
            String type = join.get("type").asText().toLowerCase();
            String[] validTypes = {"inner", "left", "right"};
            if (!Arrays.asList(validTypes).contains(type)) {
                log.warn("Недопустимый тип JOIN: {}", type);
                return false;
            }
        }

        return true;
    }

    /**
     * Извлечение кода ресурса из фильтра (заглушка – в текущей реализации не используется).
     */
    private String extractResourceCodeFromFilter(JsonNode filterNode) {
        return null;
    }

    /**
     * Создание тестового RLS фильтра для демонстрации.
     */
    public JsonNode createExampleFilter() {
        try {
            String exampleJson = """
            {
                "joins": [
                    {
                        "association": "pipeline",
                        "alias": "p",
                        "type": "inner"
                    }
                ],
                "conditions": [
                    {
                        "field": "p.is_active",
                        "operator": "eq",
                        "value": false
                    }
                ],
                "logicalOperator": "AND"
            }
            """;
            return objectMapper.readTree(exampleJson);
        } catch (Exception e) {
            log.error("Ошибка создания тестового фильтра: {}", e.getMessage());
            return null;
        }
    }
}