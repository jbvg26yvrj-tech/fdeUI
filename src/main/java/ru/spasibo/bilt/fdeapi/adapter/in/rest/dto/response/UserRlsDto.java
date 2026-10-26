package ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * DTO ответа с RLS-фильтрами пользователя.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRlsDto {
    private Map<String, JsonNode> filters;
}