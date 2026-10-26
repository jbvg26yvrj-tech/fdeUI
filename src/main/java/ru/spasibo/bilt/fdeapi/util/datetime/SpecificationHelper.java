package ru.spasibo.bilt.fdeapi.util.datetime;

import org.springframework.data.jpa.domain.Specification;

import java.util.function.Function;

/**
 * Утилитарный класс для работы со спецификациями JPA.
 */
public final class SpecificationHelper {

    private SpecificationHelper() {
    }

    /**
     * Применяет фильтр по дате к спецификации, если переданное значение не пустое.
     *
     * @param spec             текущая спецификация
     * @param value            строковое значение даты (null или пустое → фильтр не применяется)
     * @param operator         оператор сравнения (eq, ne, gt, lt, gte, lte, between)
     * @param conditionBuilder функция, которая по DateFilter строит Specification
     * @param <T>              тип сущности
     * @return обновлённая спецификация (или исходная, если фильтр не задан)
     */
    public static <T> Specification<T> withDateFilter(
            Specification<T> spec,
            String value,
            String operator,
            Function<DateFilter, Specification<T>> conditionBuilder) {

        DateFilter dateFilter = DateTimeFilterParser.createDateFilter(value, operator);
        if (dateFilter != null) {
            return spec.and(conditionBuilder.apply(dateFilter));
        }
        return spec;
    }
}