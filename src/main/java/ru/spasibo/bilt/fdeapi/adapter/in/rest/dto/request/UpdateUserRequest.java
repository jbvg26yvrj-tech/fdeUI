package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO запроса на обновление свойств пользователя (активация, passwordChangeRequired).
 * Все поля необязательны — применяются только ненулевые значения.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    private Boolean activated;

    private Boolean passwordChangeRequired;
}