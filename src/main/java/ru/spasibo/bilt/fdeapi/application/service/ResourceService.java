package ru.spasibo.bilt.fdeapi.application.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ResourceResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.exception.ResourceNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.RoleNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceData;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceType;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;
import ru.spasibo.bilt.fdeapi.util.datetime.SpecificationHelper;
import ru.spasibo.bilt.fdeapi.util.pagination.PaginationUtils;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Сервис приложения для запросов ресурсов (разрешений).
 * Ресурсы управляются системой и наполняются при запуске; этот сервис доступен только для чтения.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourcePort resourcePort;
    private final RolePort rolePort;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "type", "code", "name", "description", "createdAt");

    /**
     * Возвращает список всех ресурсов.
     *
     * @return список данных ресурсов
     */
    @Transactional(readOnly = true)
    public List<ResourceData> getResourcesList() {
        return resourcePort.findAll().stream().toList();
    }

    /**
     * Возвращает постраничный список ресурсов с фильтрацией.
     */
    public PagedResponse<ResourceResponse> getResourcesByPage(int page, int size, String sort, String type, String code, String name,
                                                  String description, String createdAt, String createdAtOperator) {
        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        Specification<ResourceEntity> spec = buildSpecification(type, code, name, description, createdAt, createdAtOperator);
        Page<ResourceEntity> pageResult = resourceRepository.findAll(spec, pageRequest);

        return PaginationUtils.toPagedResponse(pageResult, this::toPageResponse);
    }

    /**
     * Возвращает постраничный и отфильтрованный список ресурсов, назначенных указанной роли.
     *
     * @param roleId идентификатор роли (UUID)
     * @param page номер страницы (начиная с нуля)
     * @param size размер страницы
     * @param sort выражение сортировки (например, "code,asc")
     * @param type фильтр по типу ресурса
     * @param code фильтр по коду ресурса
     * @param name фильтр по имени ресурса
     * @param description фильтр по описанию ресурса
     * @param createdAt фильтр по дате создания
     * @param createdAtOperator оператор для фильтра по дате (eq, gt, lt и т.п.)
     * @return постраничный ответ с ресурсами, назначенными роли
     * @throws RoleNotFoundException если роль не существует
     */
    public PagedResponse<ResourceResponse> getAllByRoleId(UUID roleId, int page, int size, String sort,
                                                       String type, String code, String name,
                                                       String description, String createdAt, String createdAtOperator) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }

        Set<String> resourceCodes = resourcePort.findResourceCodesByRoleIds(Set.of(roleId));
        if (resourceCodes.isEmpty()) {
            return new PagedResponse<>(List.of(), 0, 0, 0, 0);
        }

        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        Specification<ResourceEntity> spec = buildSpecification(type, code, name, description, createdAt, createdAtOperator);
        spec = spec.and(ResourceSpecifications.codeIn(resourceCodes));

        Page<ResourceEntity> pageResult = resourceRepository.findAll(spec, pageRequest);
        return PaginationUtils.toPagedResponse(pageResult, this::toPageResponse);
    }

    /**
     * Строит спецификацию для фильтрации ресурсов.
     */
    private Specification<ResourceEntity> buildSpecification(String type, String code, String name,
                                                             String description, String createdAt, String createdAtOperator) {
        Specification<ResourceEntity> spec = Specification.allOf();

        if (type != null) {
            spec = spec.and(ResourceSpecifications.typeEquals(type));
        }
        if (code != null) {
            spec = spec.and(ResourceSpecifications.codeLike(code));
        }
        if (name != null) {
            spec = spec.and(ResourceSpecifications.nameLike(name));
        }
        if (description != null) {
            spec = spec.and(ResourceSpecifications.descriptionLike(description));
        }

        spec = SpecificationHelper.withDateFilter(spec, createdAt, createdAtOperator, ResourceSpecifications::createdAtCondition);
        return spec;
    }

    /**
     * Возвращает все ресурсы указанного типа.
     * Проверяет, что параметр type соответствует корректному ResourceType.
     *
     * @param type тип ресурса (например, "API", "PAGE")
     * @return отфильтрованный список ресурсов
     * @throws ValidationException если тип не является корректным ResourceType
     */
    public List<ResourceData> getByType(String type) {
        validateResourceType(type);
        return resourcePort.findByType(type);
    }

    /**
     * Возвращает ресурс по идентификатору.
     *
     * @param id идентификатор ресурса (UUID)
     * @return данные ресурса
     * @throws ResourceNotFoundException если ресурс не найден
     */
    public ResourceData getById(UUID id) {
        return resourcePort.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found: " + id));
    }

    /**
     * Проверяет, что строка типа соответствует корректному значению перечисления {@link ResourceType}.
     *
     * @param type проверяемая строка типа
     * @throws ValidationException если тип некорректен
     */
    private void validateResourceType(String type) {
        try {
            ResourceType.valueOf(type);
        } catch (IllegalArgumentException e) {
            throw new ValidationException(
                    "Invalid resource type: '" + type + "'. Valid types: " +
                            java.util.Arrays.toString(ResourceType.values()));
        }
    }

    private ResourceResponse toPageResponse(ResourceEntity entity) {
        return ResourceResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .type(entity.getType())
                .name(entity.getName())
                .description(entity.getDescription())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}