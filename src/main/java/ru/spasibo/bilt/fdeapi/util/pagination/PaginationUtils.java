package ru.spasibo.bilt.fdeapi.util.pagination;

import lombok.experimental.UtilityClass;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;

import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@UtilityClass
public class PaginationUtils {

    /**
     * Разбирает строку сортировки и проверяет её по списку разрешённых полей.
     * Использует "createdAt" как поле сортировки по умолчанию, когда sort равен null или пуст.
     *
     * @param sort          параметр сортировки в формате "field,asc|desc"
     * @param allowedFields множество разрешённых имён полей
     * @return объект Sort
     * @throws PipelineValidationException если поле не разрешено
     */
    public Sort parseSort(String sort, Set<String> allowedFields) {
        return parseSort(sort, allowedFields, "createdAt");
    }

    /**
     * Разбирает строку сортировки и проверяет её по списку разрешённых полей.
     *
     * @param sort          параметр сортировки в формате "field,asc|desc"
     * @param allowedFields множество разрешённых имён полей
     * @param defaultField  имя поля, используемое когда sort равен null или пуст
     * @return объект Sort
     * @throws PipelineValidationException если поле не разрешено
     */
    public Sort parseSort(String sort, Set<String> allowedFields, String defaultField) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.DESC, defaultField);
        }
        String[] parts = sort.split(",");
        String field = parts[0].trim();

        if (!allowedFields.contains(field)) {
            throw new PipelineValidationException(
                    "Invalid sort field: '" + field + "'. Allowed: " + allowedFields);
        }

        Sort.Direction direction = Sort.Direction.ASC;
        if (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim())) {
            direction = Sort.Direction.DESC;
        }
        return Sort.by(direction, field);
    }

    /**
     * Преобразует Spring Data Page в PagedResponse с помощью переданного маппера.
     *
     * @param page   исходная страница
     * @param mapper функция преобразования сущности в DTO ответа
     * @param <T>    тип сущности
     * @param <R>    тип DTO ответа
     * @return PagedResponse, содержащий преобразованные данные и метаданные пагинации
     */
    public <T, R> PagedResponse<R> toPagedResponse(Page<T> page, Function<T, R> mapper) {
        List<R> content = page.getContent().stream()
                .map(mapper)
                .collect(Collectors.toList());
        return PagedResponse.<R>builder()
                .content(content)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}