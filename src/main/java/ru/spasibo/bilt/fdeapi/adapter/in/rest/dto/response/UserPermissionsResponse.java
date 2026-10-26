package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Set;

/**
 * DTO ответа с агрегированными правами доступа пользователя.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPermissionsResponse {

    private Set<String> roleCodes;
    private Set<String> resourceCodes;
}