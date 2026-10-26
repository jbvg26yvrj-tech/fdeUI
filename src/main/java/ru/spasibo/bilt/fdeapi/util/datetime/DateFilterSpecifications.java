package ru.spasibo.bilt.fdeapi.util.datetime;

import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class DateFilterSpecifications {

    private DateFilterSpecifications() {
    }

    /**
     * Универсальный построитель Specification для фильтрации по полю типа LocalDateTime
     * с поддержкой DateFilter (eq, ne, gt, lt, gte, lte, between).
     *
     * @param fieldName имя поля сущности (например, "createdAt")
     * @param dateFilter объект фильтра (может быть null)
     * @param <T> тип сущности
     * @return Specification для применения в запросе
     */
    public static <T> Specification<T> buildDateCondition(String fieldName, DateFilter dateFilter) {
        return (root, query, cb) -> {
            if (dateFilter == null) {
                return cb.conjunction();
            }

            Path<LocalDateTime> fieldPath = root.get(fieldName);
            List<Predicate> predicates = new ArrayList<>();

            // eq / ne
            if (dateFilter.getEq() != null) {
                predicates.add(buildEqualityPredicate(fieldPath, dateFilter.getEq(), true, cb));
            }
            if (dateFilter.getNe() != null) {
                predicates.add(buildEqualityPredicate(fieldPath, dateFilter.getNe(), false, cb));
            }

            // gt (строго больше) – ">= следующая единица"
            if (dateFilter.getGt() != null) {
                LocalDateTime adjusted = adjustForGt(dateFilter.getGt());
                predicates.add(cb.greaterThanOrEqualTo(fieldPath, adjusted));
            }

            // lt (строго меньше) – "< исходное значение"
            if (dateFilter.getLt() != null) {
                predicates.add(cb.lessThan(fieldPath, dateFilter.getLt().getValue()));
            }

            // gte (больше или равно) – ">= исходное" (с корректировкой для DATE)
            if (dateFilter.getGte() != null) {
                LocalDateTime adjusted = adjustForGte(dateFilter.getGte());
                predicates.add(cb.greaterThanOrEqualTo(fieldPath, adjusted));
            }

            // lte (меньше или равно) – "< следующая единица точности"
            if (dateFilter.getLte() != null) {
                LocalDateTime adjusted = adjustForLte(dateFilter.getLte());
                predicates.add(cb.lessThan(fieldPath, adjusted));
            }

            if (predicates.isEmpty()) {
                return cb.conjunction();
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private static Predicate buildEqualityPredicate(Path<LocalDateTime> path,
                                                    DateTimeFilterValue filterValue,
                                                    boolean isEqual,
                                                    CriteriaBuilder cb) {
        LocalDateTime value = filterValue.getValue();
        DateTimePrecision precision = filterValue.getPrecision();

        if (precision == DateTimePrecision.DATE) {
            LocalDateTime start = value;
            LocalDateTime end = start.plusDays(1);
            if (isEqual) {
                return cb.and(
                        cb.greaterThanOrEqualTo(path, start),
                        cb.lessThan(path, end)
                );
            } else {
                return cb.or(
                        cb.lessThan(path, start),
                        cb.greaterThanOrEqualTo(path, end)
                );
            }
        } else if (precision == DateTimePrecision.SECOND) {
            jakarta.persistence.criteria.Expression<LocalDateTime> truncatedPath =
                    cb.function("DATE_TRUNC", LocalDateTime.class, cb.literal("second"), path);
            LocalDateTime truncatedValue = value.withNano(0);
            if (isEqual) {
                return cb.equal(truncatedPath, truncatedValue);
            } else {
                return cb.notEqual(truncatedPath, truncatedValue);
            }
        } else {
            // MILLISECOND, MICROSECOND (если будут добавлены) – прямое сравнение
            return isEqual ? cb.equal(path, value) : cb.notEqual(path, value);
        }
    }

    private static LocalDateTime adjustForGt(DateTimeFilterValue filterValue) {
        LocalDateTime value = filterValue.getValue();
        switch (filterValue.getPrecision()) {
            case DATE:
                return value.plusDays(1);
            case SECOND:
                return value.plusSeconds(1);
            default:
                return value;
        }
    }

    private static LocalDateTime adjustForGte(DateTimeFilterValue filterValue) {
        // Для DATE корректировка не нужна – начало дня уже корректно для >=
        return filterValue.getValue();
    }

    private static LocalDateTime adjustForLte(DateTimeFilterValue filterValue) {
        LocalDateTime value = filterValue.getValue();
        switch (filterValue.getPrecision()) {
            case DATE:
                return value.plusDays(1);
            case SECOND:
                return value.plusSeconds(1);
            default:
                return value;
        }
    }
}