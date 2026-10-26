package ru.spasibo.bilt.fdeapi.util.jpa;

import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.CriteriaBuilder;

/**
 * Утилиты для построения JPA Specifications с поддержкой LIKE-поиска.
 */
public final class SpecificationUtils {

    private SpecificationUtils() {
    }

    /**
     * Экранирует спецсимволы LIKE: \, %, _
     */
    public static String escapeWildcards(String value) {
        if (value == null) return null;
        return value.replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
    }

    /**
     * Создаёт Specification для регистронезависимого поиска по вхождению подстроки.
     *
     * @param fieldName имя поля сущности
     * @param searchValue искомая подстрока (может быть null/пустой)
     * @param <T> тип сущности
     * @return Specification с условием LIKE, либо conjunction()
     */
    public static <T> Specification<T> like(String fieldName, String searchValue) {
        return (root, query, cb) -> {
            if (searchValue == null || searchValue.isBlank()) {
                return cb.conjunction();
            }
            String escaped = escapeWildcards(searchValue);
            Path<String> fieldPath = root.get(fieldName);
            return cb.like(cb.lower(fieldPath), "%" + escaped.toLowerCase() + "%", '\\');
        };
    }
}