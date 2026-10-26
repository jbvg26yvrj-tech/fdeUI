package ru.spasibo.bilt.fdeapi.util.datetime;

import ru.spasibo.bilt.fdeapi.domain.exception.BadRequestException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;

public final class DateTimeFilterParser {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private DateTimeFilterParser() {
    }

    public static DateFilter createDateFilter(String value, String operator) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        String op = (operator == null || operator.trim().isEmpty()) ? "eq" : operator.trim().toLowerCase();
        DateFilter.DateFilterBuilder builder = DateFilter.builder();

        switch (op) {
            case "eq":
                builder.eq(parseDateTime(value));
                break;
            case "ne":
                builder.ne(parseDateTime(value));
                break;
            case "gt":
                builder.gt(parseDateTime(value));
                break;
            case "lt":
                builder.lt(parseDateTime(value));
                break;
            case "gte":
                builder.gte(parseDateTime(value));
                break;
            case "lte":
                builder.lte(parseDateTime(value));
                break;
            case "between":
                processBetween(builder, value);
                break;
            default:
                throw new BadRequestException("Неизвестный оператор: " + operator);
        }

        return builder.build();
    }

    private static void processBetween(DateFilter.DateFilterBuilder builder, String value) {
        String[] parts = value.split(",", -1);
        if (parts.length != 2) {
            throw new BadRequestException(
                    String.format("Оператор 'between' требует два значения, разделенных запятой. Получено: %s", value));
        }

        String fromStr = parts[0].trim();
        String toStr = parts[1].trim();

        if (fromStr.isEmpty() || toStr.isEmpty()) {
            throw new BadRequestException("Оба значения для оператора 'between' не могут быть пустыми");
        }

        DateTimeFilterValue from = parseDateTime(fromStr);
        DateTimeFilterValue to = parseDateTime(toStr);

        LocalDateTime toValue = to.getValue();
        DateTimePrecision toPrecision = to.getPrecision();

        LocalDateTime adjustedTo;
        switch (toPrecision) {
            case DATE:
                adjustedTo = toValue.toLocalDate().atTime(LocalTime.MAX);
                break;
            case SECOND:
                adjustedTo = toValue.withNano(999_999_999);
                break;
            default:
                adjustedTo = toValue;
        }

        DateTimeFilterValue toAdjusted = DateTimeFilterValue.builder()
                .value(adjustedTo)
                .precision(toPrecision) // точность не меняем, но значение расширено
                .build();

        builder.gte(from);
        builder.lte(toAdjusted);
    }

    public static DateTimeFilterValue parseDateTime(String value) {
        if (value == null) return null;
        value = value.trim();
        if (value.isEmpty()) return null;

        try {
            DateTimePrecision precision;
            LocalDateTime dateTime;

            if (!value.contains("T")) {
                LocalDate date = LocalDate.parse(value, DATE_FORMATTER);
                dateTime = date.atStartOfDay();
                precision = DateTimePrecision.DATE;
            } else {
                    dateTime = LocalDateTime.parse(value, DATE_TIME_FORMATTER).withNano(0);
                    precision = DateTimePrecision.SECOND;
                }

            return DateTimeFilterValue.builder().value(dateTime).precision(precision).build();
        } catch (DateTimeParseException e) {
            String msg;
            if (value.contains("T")) {
                msg = String.format("Неверный формат времени: '%s'. Ожидается: ГГГГ-ММ-ДДTЧЧ:мм:сс", value);
            } else {
                msg = String.format("Неверный формат даты: '%s'. Ожидается: ГГГГ-ММ-ДД", value);
            }
            throw new BadRequestException(msg);
        }
    }
}