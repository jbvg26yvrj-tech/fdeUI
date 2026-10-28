package ru.spasibo.bilt.fdeapi.util.rls;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.persistence.criteria.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import ru.spasibo.bilt.fdeapi.domain.model.ResourceDefinition;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class RlsSpecificationBuilder {

    private final RlsFilterService rlsFilterService;

    /**
     * Построение спецификации из готового RLS-фильтра (уже разрешённого, с подставленными переменными).
     * @param filter  JsonNode с фильтром (структура: conditions, logicalOperator, joins)
     * @param entityClass класс сущности, к которой применяется фильтр
     * @return Specification для использования в JPA запросах
     */
    public <T> Specification<T> buildSpecificationFromFilter(JsonNode filter, Class<T> entityClass) {
        return (root, query, cb) -> {
            if (filter == null || filter.isNull() || !validateRlsFilterStructure(filter)) {
                log.warn("Фильтр отсутствует или некорректен, возвращаем пустой предикат");
                return cb.disjunction();
            }

            // Устанавливаем DISTINCT для запросов с JOIN
            query.distinct(true);

            return buildPredicateWithJoins(filter, root, query, cb, entityClass);
        };
    }

    /**
     * Построение спецификации по коду ресурса с использованием текущего пользователя.
     * (Использует RlsFilterService для получения фильтра)
     */
    public <T> Specification<T> buildSpecification(String resourceCode, Class<T> entityClass) {
        if (!ResourceDefinition.exists(resourceCode)) {
            log.warn("Попытка использовать несуществующий ресурс: {}", resourceCode);
            return (root, query, cb) -> cb.conjunction();
        }

        return (root, query, cb) -> {
            try {
                String login = SecurityContextHolder.getContext().getAuthentication().getName();
                Optional<JsonNode> filterOpt = rlsFilterService.getResolvedFilterForResource(resourceCode, login);
                if (filterOpt.isEmpty()) {
                    return cb.conjunction();
                }
                JsonNode filter = filterOpt.get();
                query.distinct(true);
                return buildPredicateWithJoins(filter, root, query, cb, entityClass);
            } catch (Exception e) {
                log.error("Ошибка построения спецификации: {}", e.getClass().getSimpleName());
                return cb.disjunction();
            }
        };
    }
    /**
     * Построение предикатов с поддержкой JOIN
     */
    private <T> Predicate buildPredicateWithJoins(JsonNode filter, Root<T> root, CriteriaQuery<?> query,
                                                  CriteriaBuilder cb, Class<T> entityClass) {
        if (filter.has("allOf")) {
            List<Predicate> restrictions = new ArrayList<>();
            for (JsonNode child : filter.get("allOf")) restrictions.add(buildPredicateWithJoins(child, root, query, cb, entityClass));
            return cb.and(restrictions.toArray(new Predicate[0]));
        }
        Map<String, Join> joinsCache = new HashMap<>();
        List<Predicate> predicates = new ArrayList<>();

        // Обрабатываем явные JOIN из структуры фильтра
        if (filter.has("joins") && filter.get("joins").isArray()) {
            log.debug("Обработка явных JOIN из фильтра");
            for (JsonNode joinNode : filter.get("joins")) {
                processJoinNode(joinNode, root, joinsCache);
            }
        }

        // Обрабатываем условия фильтра
        if (filter.has("conditions") && filter.get("conditions").isArray()) {
            log.debug("Обработка {} условий RLS", filter.get("conditions").size());

            for (JsonNode condition : filter.get("conditions")) {
                try {
                    Predicate predicate = buildConditionPredicateWithJoins(condition, root, cb, joinsCache);
                    if (predicate != null) {
                        predicates.add(predicate);
                        log.debug("Успешно создан предикат для условия: {}", condition);
                    }
                } catch (Exception e) {
                    throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS condition");
                }
            }
        }

        if (predicates.isEmpty()) {
            log.warn("Не удалось создать ни одного предиката из условий RLS");
            return cb.disjunction();
        }

        String logicalOperator = filter.has("logicalOperator")
                ? filter.get("logicalOperator").asText("AND")
                : "AND";

        log.debug("Логический оператор для условий: {}", logicalOperator);

        if ("OR".equalsIgnoreCase(logicalOperator)) {
            return cb.or(predicates.toArray(new Predicate[0]));
        } else {
            return cb.and(predicates.toArray(new Predicate[0]));
        }
    }

    /**
     * Обработка узла JOIN с поддержкой вложенных ассоциаций, начинающихся с алиаса
     */
    private <T> void processJoinNode(JsonNode joinNode, Root<T> root, Map<String, Join> joinsCache) {
        try {
            if (!joinNode.has("association")) {
                log.warn("JOIN узел не содержит association: {}", joinNode);
                return;
            }

            String associationPath = joinNode.get("association").asText();
            String alias = joinNode.has("alias")
                    ? joinNode.get("alias").asText()
                    : associationPath.replace(".", "_");
            String joinType = joinNode.has("type")
                    ? joinNode.get("type").asText("inner")
                    : "inner";

            log.debug("Создание JOIN: association={}, alias={}, type={}",
                    associationPath, alias, joinType);

            // Если алиас уже есть в кэше, пропускаем
            if (joinsCache.containsKey(alias)) {
                log.debug("JOIN {} уже существует в кэше", alias);
                return;
            }

            // Разбиваем путь на сегменты
            String[] parts = associationPath.split("\\.");

            Join<?, ?> join;
            if (parts.length > 1 && joinsCache.containsKey(parts[0])) {
                // Путь начинается с существующего алиаса
                Join<?, ?> startJoin = joinsCache.get(parts[0]);
                join = createJoinChainFromJoin(startJoin, Arrays.copyOfRange(parts, 1, parts.length), joinType);
                log.debug("Создан вложенный JOIN от {}: {}", parts[0], alias);
            } else {
                // Обычный путь от корня
                join = createJoinChainFromRoot(root, parts, joinType);
                log.debug("Создан JOIN от корня: {}", alias);
            }

            joinsCache.put(alias, join);
            log.debug("Создан JOIN {} для ассоциации {}", alias, associationPath);

        } catch (Exception e) {
            throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS join");
        }
    }

    /**
     * Создание цепочки JOIN от корневого элемента
     */
    private <T> Join createJoinChainFromRoot(Root<T> root, String[] parts, String joinType) {
        Join current = null;
        for (int i = 0; i < parts.length; i++) {
            if (i == 0) {
                current = createJoinFromRoot(root, parts[i], joinType);
            } else {
                current = createJoinFromJoin(current, parts[i], joinType);
            }
        }
        return current;
    }

    /**
     * Создание цепочки JOIN от существующего JOIN
     */
    private Join createJoinChainFromJoin(Join startJoin, String[] parts, String joinType) {
        Join current = startJoin;
        for (String part : parts) {
            current = createJoinFromJoin(current, part, joinType);
        }
        return current;
    }

    /**
     * Создание JOIN от root
     */
    private <T> Join<T, ?> createJoinFromRoot(Root<T> root, String association, String joinType) {
        switch (joinType.toLowerCase()) {
            case "left":
                return root.join(association, JoinType.LEFT);
            case "right":
                return root.join(association, JoinType.RIGHT);
            case "inner":
            default:
                return root.join(association, JoinType.INNER);
        }
    }

    /**
     * Создание JOIN от существующего JOIN
     */
    private Join createJoinFromJoin(Join join, String association, String joinType) {
        switch (joinType.toLowerCase()) {
            case "left":
                return join.join(association, JoinType.LEFT);
            case "right":
                return join.join(association, JoinType.RIGHT);
            case "inner":
            default:
                return join.join(association, JoinType.INNER);
        }
    }

    /**
     * Построение предиката для условия с поддержкой JOIN
     */
    private <T> Predicate buildConditionPredicateWithJoins(JsonNode condition, Root<T> root,
                                                           CriteriaBuilder cb, Map<String, Join> joinsCache) {
        try {
            String field = condition.get("field").asText();
            String operator = condition.get("operator").asText().toLowerCase();
            JsonNode valueNode = condition.get("value");

            log.debug("Создание предиката для поля '{}', оператор '{}'", field, operator);

            // Разрешаем путь поля с учётом алиасов
            Path fieldPath = resolveFieldPath(field, root, joinsCache);

            if (fieldPath == null) {
                log.warn("Не удалось разрешить путь поля: {}", field);
                throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS restriction");
            }

            // Получаем тип поля
            Class<?> fieldType = fieldPath.getJavaType();
            log.debug("Тип поля '{}': {}", field, fieldType);

            // Получаем значение
            Object value = parseValue(valueNode, fieldType);
            log.debug("Распарсенное значение для поля '{}': {}", field, value);

            // Создаём предикат
            return createPredicate(fieldPath, operator, value, cb);

        } catch (Exception e) {
            log.error("Ошибка создания предиката для условия {}: {}", condition, e.getClass().getSimpleName());
            throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS restriction");
        }
    }

    /**
     * Разрешение пути поля с учетом JOIN алиасов
     */
    private <T> Path resolveFieldPath(String fieldPath, Root<T> root, Map<String, Join> joinsCache) {
        try {
            // Если поле содержит точку, это может быть ссылка на алиас или вложенное поле
            if (fieldPath.contains(".")) {
                String[] parts = fieldPath.split("\\.");

                // Проверяем, является ли первая часть алиасом JOIN
                if (joinsCache.containsKey(parts[0])) {
                    // Поле с алиасом JOIN: alias.field
                    Join join = joinsCache.get(parts[0]);
                    return resolveNestedPath(join, Arrays.copyOfRange(parts, 1, parts.length));
                } else {
                    // Вложенное поле без явного алиаса (используем root)
                    return resolveNestedPath(root, parts);
                }
            } else {
                // Простое поле
                return root.get(fieldPath);
            }
        } catch (Exception e) {
            log.error("Ошибка разрешения пути поля {}: {}", fieldPath, e.getClass().getSimpleName());
            throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS restriction");
        }
    }

    /**
     * Разрешение вложенного пути от корневого элемента
     */
    private Path resolveNestedPath(Path start, String[] parts) {
        Path current = start;
        for (String part : parts) {
            current = current.get(part);
        }
        return current;
    }

    /**
     * Создание предиката на основе оператора
     */
    private Predicate createPredicate(Path path, String operator, Object value, CriteriaBuilder cb) {
        if (value == null && !"isnull".equals(operator) && !"isnotnull".equals(operator)) {
            log.warn("Значение null для оператора, требующего значения: {}", operator);
            throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS restriction");
        }

        switch (operator) {
            case "eq":
                return cb.equal(path, value);
            case "ne":
                return cb.notEqual(path, value);
            case "like":
                return cb.like(cb.lower(path.as(String.class)), "%" + ((String) value).toLowerCase() + "%");
            case "notlike":
                return cb.notLike(cb.lower(path.as(String.class)), "%" + ((String) value).toLowerCase() + "%");
            case "in":
                if (value instanceof List) {
                    return path.in((List<?>) value);
                } else if (value instanceof Object[]) {
                    return path.in((Object[]) value);
                }
                break;
            case "notin":
                if (value instanceof List) {
                    return cb.not(path.in((List<?>) value));
                } else if (value instanceof Object[]) {
                    return cb.not(path.in((Object[]) value));
                }
                break;
            case "gt":
                if (value instanceof Number) {
                    return cb.gt(path.as(Number.class), (Number) value);
                } else if (value instanceof LocalDateTime) {
                    return cb.greaterThan(path.as(LocalDateTime.class), (LocalDateTime) value);
                }
                break;
            case "lt":
                if (value instanceof Number) {
                    return cb.lt(path.as(Number.class), (Number) value);
                } else if (value instanceof LocalDateTime) {
                    return cb.lessThan(path.as(LocalDateTime.class), (LocalDateTime) value);
                }
                break;
            case "gte":
                if (value instanceof Number) {
                    return cb.ge(path.as(Number.class), (Number) value);
                } else if (value instanceof LocalDateTime) {
                    return cb.greaterThanOrEqualTo(path.as(LocalDateTime.class), (LocalDateTime) value);
                }
                break;
            case "lte":
                if (value instanceof Number) {
                    return cb.le(path.as(Number.class), (Number) value);
                } else if (value instanceof LocalDateTime) {
                    return cb.lessThanOrEqualTo(path.as(LocalDateTime.class), (LocalDateTime) value);
                }
                break;
            case "startswith":
                if (value instanceof String) {
                    return cb.like(cb.lower(path.as(String.class)), ((String) value).toLowerCase() + "%");
                }
                break;
            case "endswith":
                if (value instanceof String) {
                    return cb.like(cb.lower(path.as(String.class)), "%" + ((String) value).toLowerCase());
                }
                break;
            case "isnull":
                return cb.isNull(path);
            case "isnotnull":
                return cb.isNotNull(path);
            default:
                log.warn("Неизвестный оператор: {}", operator);
        }

        throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS restriction");
    }

    /**
     * Парсинг значения из JsonNode
     */
    private Object parseValue(JsonNode valueNode, Class<?> fieldType) {
        if (valueNode == null || valueNode.isNull()) {
            return null;
        }

        try {
            log.debug("Парсинг значения: {} в тип: {}", valueNode, fieldType);

            if (valueNode.isTextual()) {
                String value = valueNode.asText();
                return convertValue(value, fieldType);
            } else if (valueNode.isBoolean()) {
                return valueNode.asBoolean();
            } else if (valueNode.isNumber()) {
                Number num = valueNode.numberValue();
                return convertNumber(num, fieldType);
            } else if (valueNode.isArray()) {
                List<Object> values = new ArrayList<>();
                for (JsonNode element : valueNode) {
                    if (element.isTextual()) {
                        values.add(convertValue(element.asText(), fieldType));
                    } else if (element.isNumber()) {
                        values.add(convertNumber(element.numberValue(), fieldType));
                    } else if (element.isBoolean()) {
                        values.add(element.asBoolean());
                    }
                }
                return values;
            }
        } catch (Exception e) {
            log.error("Ошибка парсинга значения {} к типу {}: {}", valueNode, fieldType, e.getClass().getSimpleName());
        }

        throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS restriction");
    }

    /**
     * Конвертация строкового значения в нужный тип
     */
    private Object convertValue(String value, Class<?> fieldType) {
        try {
            log.debug("Конвертация значения '{}' в тип {}", value, fieldType);

            if (fieldType.equals(String.class)) {
                return value;
            } else if (fieldType.equals(UUID.class)) {
                return UUID.fromString(value);
            } else if (fieldType.equals(Integer.class) || fieldType.equals(int.class)) {
                return Integer.parseInt(value);
            } else if (fieldType.equals(Long.class) || fieldType.equals(long.class)) {
                return Long.parseLong(value);
            } else if (fieldType.equals(Boolean.class) || fieldType.equals(boolean.class)) {
                return Boolean.parseBoolean(value);
            } else if (fieldType.equals(LocalDateTime.class)) {
                DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
                return LocalDateTime.parse(value, formatter);
            }
        } catch (Exception e) {
            log.error("Ошибка преобразования значения {} к типу {}: {}", value, fieldType, e.getClass().getSimpleName());
            throw new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("Invalid RLS value");
        }
        log.warn("Не удалось конвертировать значение '{}' в тип {}, возвращаем как строку", value, fieldType);
        return value;
    }

    /**
     * Конвертация числового значения в нужный тип
     */
    private Object convertNumber(Number num, Class<?> fieldType) {
        try {
            if (fieldType.equals(Integer.class) || fieldType.equals(int.class)) {
                return num.intValue();
            } else if (fieldType.equals(Long.class) || fieldType.equals(long.class)) {
                return num.longValue();
            } else if (fieldType.equals(Double.class) || fieldType.equals(double.class)) {
                return num.doubleValue();
            } else if (fieldType.equals(Float.class) || fieldType.equals(float.class)) {
                return num.floatValue();
            } else if (fieldType.equals(Short.class) || fieldType.equals(short.class)) {
                return num.shortValue();
            }
        } catch (Exception e) {
            log.error("Ошибка преобразования числа {} к типу {}: {}", num, fieldType, e.getClass().getSimpleName());
        }
        return num;
    }

    // Вспомогательная валидация структуры фильтра (уже была)
    private boolean validateRlsFilterStructure(JsonNode filter) {
        if (filter != null && filter.has("allOf")) {
            if (!filter.get("allOf").isArray() || filter.get("allOf").isEmpty()) return false;
            for (JsonNode child : filter.get("allOf")) if (!validateRlsFilterStructure(child)) return false;
            return true;
        }
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
}
