package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.Set;

/**
 * DTO ответа, агрегирующий данные пользователя, настройки, права доступа и RLS для фронтенда.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserContextResponse {

    private UserResponse user;
    private Map<String, String> settings;
    private Set<String> roleCodes;
    private Set<String> resourceCodes;
    private Map<String, JsonNode> rlsFilters;
}