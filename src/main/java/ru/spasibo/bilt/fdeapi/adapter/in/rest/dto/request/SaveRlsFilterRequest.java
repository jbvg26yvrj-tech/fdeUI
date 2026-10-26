package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO запроса на создание или обновление RLS-фильтра.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveRlsFilterRequest {

    @NotBlank(message = "filter must not be blank")
    private String filter;
}