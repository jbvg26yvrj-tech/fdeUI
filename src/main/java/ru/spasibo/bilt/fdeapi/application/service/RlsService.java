package ru.spasibo.bilt.fdeapi.application.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.RlsFilterResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.exception.ResourceNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.RoleNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.RlsFilter;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;
import ru.spasibo.bilt.fdeapi.domain.port.RlsPort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;
import ru.spasibo.bilt.fdeapi.util.datetime.SpecificationHelper;
import ru.spasibo.bilt.fdeapi.util.pagination.PaginationUtils;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Сервис приложения для управления фильтрами Row-Level Security (RLS).
 * Оркестрирует валидацию, сохранение и разрешение шаблонов.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RlsService {

    private final RlsPort rlsPort;
    private final RolePort rolePort;
    private final ResourcePort resourcePort;
    private final ObjectMapper objectMapper;
    private final RlsRepository rlsRepository;

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("resourceCode", "resourceName", "createdAt");

    /**
     * Возвращает постраничный и отфильтрованный список RLS-фильтров указанной роли.
     *
     * @param roleId            идентификатор роли (UUID)
     * @param page              номер страницы (начиная с нуля)
     * @param size              размер страницы
     * @param sort              выражение сортировки
     * @param resourceCode      фильтр по коду ресурса
     * @param resourceName      фильтр по имени ресурса
     * @param createdAt         фильтр по дате создания
     * @param createdAtOperator оператор для фильтра по дате (eq, gt, lt и т.п.)
     * @return постраничный ответ с RLS-фильтрами роли
     * @throws RoleNotFoundException если роль не найдена
     */
    public PagedResponse<RlsFilterResponse> getAllByRoleId(UUID roleId, int page, int size, String sort,
                                                           String resourceCode, String resourceName,
                                                           String  createdAt, String createdAtOperator) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }

        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        Specification<RoleRlsEntity> spec = Specification.allOf();

        if (roleId != null) {
            spec = spec.and(RlsSpecifications.roleIdEquals(roleId));
        }

        if (resourceCode != null) {
            spec = spec.and(RlsSpecifications.resourceCodeLike(resourceCode));
        }

        if (resourceName != null) {
            spec = spec.and(RlsSpecifications.resourceNameLike(resourceName));
        }

        spec = SpecificationHelper.withDateFilter(spec, createdAt, createdAtOperator, RlsSpecifications::createdAtCondition);

        Page<RoleRlsEntity> pageResult = rlsRepository.findAll(spec, pageRequest);
        return PaginationUtils.toPagedResponse(pageResult, this::toPageResponse);
    }

    /**
     * Возвращает агрегированные RLS-фильтры пользователя по всем назначенным ему ролям.
     *
     * @param userId идентификатор пользователя (UUID)
     * @return агрегированный RLS
     */
    public UserRls getUserRls(UUID userId) {
        return rlsPort.getUserRls(userId);
    }

    /**
     * Возвращает все RLS-фильтры указанной роли.
     *
     * @param roleId идентификатор роли (UUID)
     * @return список RLS-фильтров
     * @throws RoleNotFoundException если роль не существует
     */
    public List<RlsFilter> getRlsForRole(UUID roleId) {
        validateRoleExists(roleId);
        return rlsPort.getRlsForRole(roleId);
    }

    /**
     * Возвращает RLS-фильтр для конкретной пары роль-ресурс.
     *
     * @param roleId     идентификатор роли (UUID)
     * @param resourceId идентификатор ресурса (UUID)
     * @return JSON-строка фильтра, если найдена
     * @throws RoleNotFoundException     если роль не существует
     * @throws ResourceNotFoundException если ресурс не существует
     */
    public Optional<String> getRlsFilter(UUID roleId, UUID resourceId) {
        validateRoleExists(roleId);
        validateResourceExists(resourceId);
        return rlsPort.getRlsFilter(roleId, resourceId);
    }

    /**
     * Создаёт или обновляет RLS-фильтр для пары роль-ресурс.
     * Проверяет существование роли и ресурса, а также корректность JSON фильтра.
     *
     * @param roleId     идентификатор роли (UUID)
     * @param resourceId идентификатор ресурса (UUID)
     * @param filterJson JSON-строка фильтра
     * @throws RoleNotFoundException     если роль не существует
     * @throws ResourceNotFoundException если ресурс не существует
     * @throws ValidationException       если фильтр не является корректным JSON
     */
    @Transactional
    public void saveRlsFilter(UUID roleId, UUID resourceId, String filterJson) {
        validateRoleExists(roleId);
        validateResourceExists(resourceId);
        validateJson(filterJson);

        rlsPort.saveRlsFilter(roleId, resourceId, filterJson);
        log.info("Сохранён RLS-фильтр для роли {} на ресурсе {}", roleId, resourceId);
    }

    /**
     * Удаляет RLS-фильтр для пары роль-ресурс.
     *
     * @param id - уникальный идентификатор RLS (UUID)
     * @throws RoleNotFoundException     если роль не существует
     * @throws ResourceNotFoundException если ресурс не существует
     */
    @Transactional
    public void deleteRlsFilter(UUID id) {
        rlsPort.deleteRlsFilter(id);
        log.info("Удалён RLS-фильтр id = {}",  id);
    }

    /**
     * Разрешает переменные шаблона в JSON-строке фильтра.
     * Поддерживаемые переменные: {@code ${currentUser.id}}, {@code ${currentUser.login}}.
     * Все подставляемые значения экранируются под JSON для предотвращения инъекции в шаблон.
     *
     * @param filterJson исходный JSON фильтра
     * @param user       принципал пользователя для подстановки переменных
     * @return разрешённая JSON-строка фильтра
     */
    public String resolveFilter(String filterJson, UserPrincipal user) {
        if (filterJson == null || filterJson.isBlank()) {
            return filterJson;
        }

        String resolved = filterJson;
        resolved = resolved.replace("${currentUser.id}", jsonEscape(user.id().toString()));
        resolved = resolved.replace("${currentUser.login}", jsonEscape(user.login()));
        return resolved;
    }

    /**
     * Экранирует строковое значение под JSON для предотвращения инъекции при подстановке в JSON-шаблоны.
     * Использует Jackson для корректной обработки специальных символов (кавычки, обратные слэши, управляющие символы).
     *
     * @param value исходное значение
     * @return значение, экранированное под JSON (без окружающих кавычек)
     */
    private String jsonEscape(String value) {
        try {
            // writeValueAsString оборачивает в кавычки и экранирует специальные символы
            String escaped = objectMapper.writeValueAsString(value);
            // Убираем окружающие кавычки, так как вставляем в существующий JSON
            return escaped.substring(1, escaped.length() - 1);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Cannot JSON-escape value: " + value, e);
        }
    }

    private void validateRoleExists(UUID roleId) {
        if (!rolePort.existsById(roleId)) {
            throw new RoleNotFoundException("Role not found: " + roleId);
        }
    }

    private void validateResourceExists(UUID resourceId) {
        if (!resourcePort.existsById(resourceId)) {
            throw new ResourceNotFoundException("Resource not found: " + resourceId);
        }
    }

    private static final int MAX_FILTER_SIZE = 10_000;

    private void validateJson(String json) {
        if (json == null || json.isBlank()) {
            throw new ValidationException("Filter must not be blank");
        }
        // Отклоняем слишком большие фильтры для предотвращения злоупотребления памятью
        if (json.length() > MAX_FILTER_SIZE) {
            throw new ValidationException(
                    "RLS filter exceeds maximum size of " + MAX_FILTER_SIZE + " characters");
        }
        try {
            objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new ValidationException("Filter is not valid JSON: " + e.getOriginalMessage());
        }
    }

    private RlsFilterResponse toPageResponse(RoleRlsEntity entity) {
        return RlsFilterResponse.builder()
                .id(entity.getId())
                .roleId(entity.getRoleId())
                .resourceId(entity.getResourceId())
                .resourceCode(entity.getResource().getCode())
                .resourceName(entity.getResource().getName())
                .filter(entity.getFilter().toString())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}