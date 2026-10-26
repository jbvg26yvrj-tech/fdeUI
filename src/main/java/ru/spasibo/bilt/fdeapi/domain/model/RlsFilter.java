package ru.spasibo.bilt.fdeapi.domain.model;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Доменная модель одной привязки RLS-фильтра.
 *
 * @param roleId       роль, которой принадлежит фильтр
 * @param resourceId   UUID ресурса, к которому применяется фильтр
 * @param resourceCode код ресурса, к которому применяется фильтр
 * @param filter       сырая JSON-строка с условиями фильтра
 * @param createdAt    момент создания фильтра
 * @param updatedAt    момент последнего обновления фильтра
 */
public record RlsFilter(
        UUID roleId,
        UUID resourceId,
        String resourceCode,
        String filter,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}