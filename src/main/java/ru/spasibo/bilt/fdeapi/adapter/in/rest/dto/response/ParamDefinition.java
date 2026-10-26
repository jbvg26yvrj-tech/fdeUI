package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Описание одного параметра для UI-формы задачи.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParamDefinition {

    private String name;               // ключ параметра
    private String type;               // "string", "number", "boolean", "password", "enum"
    private String label;              // человекочитаемое название
    private String placeholder;        // плейсхолдер
    private String description;        // подсказка
    private boolean required;          // обязательность
    private String defaultValue;       // значение по умолчанию

    // ограничения для string
    private Integer minLength;
    private Integer maxLength;
    private String pattern;             // regex

    // ограничения для number
    private Integer min;
    private Integer max;
    private Boolean integerOnly;

    // для enum
    private List<String> enumValues;

    // прочие настройки UI
    private Boolean hidden;
    private String dependsOn;
}