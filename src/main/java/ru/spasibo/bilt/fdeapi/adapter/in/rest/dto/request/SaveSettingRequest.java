
package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO запроса на сохранение/обновление пользовательской настройки.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveSettingRequest {

    @NotBlank(message = "Setting key is required")
    private String key;

    @NotBlank(message = "Setting value is required")
    private String value;
}
