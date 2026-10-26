package ru.spasibo.bilt.fdeapi.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.BulkDatacenterRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.CreatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.TaskRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.UpdatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.*;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineSpecifications;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.TaskEntity;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceDefinition;
import ru.spasibo.bilt.fdeapi.domain.model.TaskPropsDefinition;
import ru.spasibo.bilt.fdeapi.observability.metrics.ApiMetrics;
import ru.spasibo.bilt.fdeapi.util.datetime.SpecificationHelper;
import ru.spasibo.bilt.fdeapi.util.pagination.PaginationUtils;
import ru.spasibo.bilt.fdeapi.util.rls.RlsFilterService;
import ru.spasibo.bilt.fdeapi.util.rls.RlsSpecificationBuilder;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Сервис управления пайплайнами и их задачами:
 * создание, обновление, удаление, постраничный поиск с RLS-фильтрацией.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {

    private static final String DEFAULT_DATACENTER = "SP";

    private static final Set<String> ALLOWED_DATACENTERS = Set.of("SC", "SP");

    private static final Set<String> ALLOWED_TYPE_CODES = Set.of(
            "SftpDownloadTask", "SftpUploadTask", "SftpDeleteTask",
            "SmbDownloadTask", "SmbUploadTask", "SmbDeleteTask",
            "FtpsDownloadTask", "FtpsUploadTask", "FtpsDeleteTask",
            "MinioDownloadTask", "MinioUploadTask", "MinioDeleteTask"
    );

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "pipelineName", "clientFrom", "clientTo",
            "createdAt", "updatedAt", "primaryDatacenter", "allOrNothing"
    );

    private final PipelineRepository pipelineRepository;
    private final AccessScopeService accessScopeService;
    private final ApiMetrics apiMetrics;
    private final RlsFilterService rlsFilterService;
    private final RlsSpecificationBuilder rlsSpecificationBuilder;

    /**
     * Создаёт новый пайплайн вместе с его задачами.
     *
     * @param request данные для создания пайплайна
     * @return созданный пайплайн
     */
    @Transactional
    public PipelineResponse create(CreatePipelineRequest request) {
        accessScopeService.requireParticipants(request.getClientFrom(), request.getClientTo());
        validateTasks(request.getTasks());

        PipelineEntity entity = PipelineEntity.builder()
                .pipelineName(request.getPipelineName())
                .clientFrom(request.getClientFrom())
                .clientTo(request.getClientTo())
                .primaryDatacenter(
                        request.getPrimaryDatacenter() != null ? request.getPrimaryDatacenter() : DEFAULT_DATACENTER)
                .allOrNothing(request.getAllOrNothing() != null ? request.getAllOrNothing() : false)
                .build();

        for (TaskRequest taskReq : request.getTasks()) {
            TaskEntity taskEntity = TaskEntity.builder()
                    .taskOrder(taskReq.getTaskOrder())
                    .typeCode(taskReq.getTypeCode())
                    .props(taskReq.getProps())
                    .build();
            entity.addTask(taskEntity);
        }

        accessScopeService.requireParticipants(entity.getClientFrom(), entity.getClientTo());
        PipelineEntity saved = saveWithUniqueNameCheck(entity);
        accessScopeService.requireSavedPipeline(saved.getId());
        apiMetrics.incrementPipelineCreated();
        log.info("Создан пайплайн: id={}, имя='{}'", saved.getId(), saved.getPipelineName());

        return toResponse(saved);
    }

    /**
     * Возвращает постраничный отфильтрованный список пайплайнов (без детализации задач).
     *
     * @param page              номер страницы
     * @param size              размер страницы
     * @param sort              правило сортировки
     * @param id                фильтр по идентификатору
     * @param pipelineName      фильтр по имени пайплайна
     * @param clientFrom        фильтр по клиенту-источнику
     * @param clientTo          фильтр по клиенту-получателю
     * @param primaryDatacenter фильтр по основному ЦОД
     * @param allOrNothing      фильтр по флагу "всё или ничего"
     * @param createdAt         фильтр по дате создания
     * @param updatedAt         фильтр по дате обновления
     * @param createdAtOperator оператор сравнения для даты создания
     * @param updatedAtOperator оператор сравнения для даты обновления
     * @return страница пайплайнов
     */
    @Transactional(readOnly = true)
    public PagedResponse<PipelinePageResponse> getAll(int page, int size, String sort,
                                                      UUID id, String pipelineName, String clientFrom,
                                                      String clientTo, String primaryDatacenter,
                                                      Boolean allOrNothing, String createdAt, String updatedAt,
                                                      String createdAtOperator, String updatedAtOperator) {
        log.debug("Получение пайплайнов с RLS-фильтрацией");
        String login = SecurityContextHolder.getContext().getAuthentication().getName();
        log.debug("Текущий пользователь: {}", login);

        Specification<PipelineEntity> spec = accessScopeService.pipelines();

        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS);
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        // Добавляем фильтры из параметров запроса
        if (id != null) {
            spec = spec.and(PipelineSpecifications.idEquals(id));
        }
        if (pipelineName != null && !pipelineName.isBlank()) {
            spec = spec.and(PipelineSpecifications.nameLike(pipelineName));
        }
        if (clientFrom != null && !clientFrom.isBlank()) {
            spec = spec.and(PipelineSpecifications.clientFromLike(clientFrom));
        }
        if (clientTo != null && !clientTo.isBlank()) {
            spec = spec.and(PipelineSpecifications.clientToLike(clientTo));
        }
        if (primaryDatacenter != null && !primaryDatacenter.isBlank()) {
            spec = spec.and(PipelineSpecifications.primaryDatacenterLike(primaryDatacenter));
        }

        if (allOrNothing != null) {
            spec = spec.and(PipelineSpecifications.allOrNothing(allOrNothing));
        }

        spec = SpecificationHelper.withDateFilter(spec, createdAt, createdAtOperator, PipelineSpecifications::createdAtCondition);
        spec = SpecificationHelper.withDateFilter(spec, updatedAt, updatedAtOperator, PipelineSpecifications::updatedAtCondition);

        Page<PipelineEntity> pageResult = pipelineRepository.findAll(spec, pageRequest);

        return PaginationUtils.toPagedResponse(pageResult, this::toPageResponse);
    }

    /**
     * Возвращает один пайплайн по идентификатору вместе с его задачами.
     *
     * @param id идентификатор пайплайна
     * @return найденный пайплайн
     */
    @Transactional(readOnly = true)
    public PipelineResponse getById(UUID id) {
        accessScopeService.requirePipeline(id);
        PipelineEntity entity = pipelineRepository.findById(id)
                .orElseThrow(() -> new PipelineNotFoundException(id));
        return toResponse(entity);
    }

    /**
     * Обновляет пайплайн. Обновляются только не-null поля.
     * Если передан список задач, он полностью заменяет существующие задачи.
     *
     * @param id      идентификатор пайплайна
     * @param request данные для обновления
     * @return обновлённый пайплайн
     */
    @Transactional
    public PipelineResponse update(UUID id, UpdatePipelineRequest request) {
        accessScopeService.requirePipeline(id);
        PipelineEntity entity = pipelineRepository.findById(id)
                .orElseThrow(() -> new PipelineNotFoundException(id));

        if (request.getPipelineName() != null) {
            if (request.getPipelineName().isBlank()) {
                throw new PipelineValidationException("Pipeline name cannot be blank");
            }
            entity.setPipelineName(request.getPipelineName());
        }
        if (request.getClientFrom() != null) {
            if (request.getClientFrom().isBlank()) {
                throw new PipelineValidationException("Client from cannot be blank");
            }
            entity.setClientFrom(request.getClientFrom());
        }
        if (request.getClientTo() != null) {
            if (request.getClientTo().isBlank()) {
                throw new PipelineValidationException("Client to cannot be blank");
            }
            entity.setClientTo(request.getClientTo());
        }
        if (request.getPrimaryDatacenter() != null) {
            if (request.getPrimaryDatacenter().isBlank()) {
                throw new PipelineValidationException("Primary datacenter cannot be blank");
            }
            entity.setPrimaryDatacenter(request.getPrimaryDatacenter());
        }

        if (request.getAllOrNothing() != null) {
            entity.setAllOrNothing(request.getAllOrNothing());
        }

        if (request.getTasks() != null) {
            if (request.getTasks().isEmpty()) {
                throw new PipelineValidationException("Tasks list cannot be empty");
            }
            validateTasks(request.getTasks());
            entity.getTasks().clear();
            pipelineRepository.flush(); // Принудительный DELETE перед INSERT, чтобы избежать нарушения ограничения uk_task
            for (TaskRequest taskReq : request.getTasks()) {
                TaskEntity taskEntity = TaskEntity.builder()
                        .taskOrder(taskReq.getTaskOrder())
                        .typeCode(taskReq.getTypeCode())
                        .props(taskReq.getProps())
                        .build();
                entity.addTask(taskEntity);
            }
        }

        accessScopeService.requireParticipants(entity.getClientFrom(), entity.getClientTo());
        PipelineEntity saved = saveWithUniqueNameCheck(entity);
        accessScopeService.requireSavedPipeline(saved.getId());
        log.info("Обновлён пайплайн: id={}", saved.getId());

        return toResponse(saved);
    }

    /**
     * Удаляет пайплайн по идентификатору.
     *
     * @param id идентификатор пайплайна
     */
    @Transactional
    public void delete(UUID id) {
        accessScopeService.requirePipeline(id);
        if (!pipelineRepository.existsById(id)) {
            throw new PipelineNotFoundException(id);
        }
        pipelineRepository.deleteById(id);
        apiMetrics.incrementPipelineDeleted();
        log.info("Удалён пайплайн: id={}", id);
    }

    /**
     * Массово переназначает основной ЦОД для указанных пайплайнов.
     *
     * @param request список идентификаторов пайплайнов и целевой ЦОД (SC или SP)
     * @return результат с количеством обновлённых пайплайнов и применённым ЦОД
     */
    @Transactional
    public BulkDatacenterResponse bulkUpdateDatacenter(BulkDatacenterRequest request) {
        String dc = request.getDatacenter().toUpperCase();
        if (!ALLOWED_DATACENTERS.contains(dc)) {
            throw new PipelineValidationException(
                    "Invalid datacenter: '" + dc + "'. Allowed: SC, SP");
        }

        request.getPipelineIds().forEach(accessScopeService::requirePipeline);
        int updatedCount = 0;
        if (!request.getPipelineIds().isEmpty()) {
            updatedCount = pipelineRepository.bulkUpdateDatacenter(dc, request.getPipelineIds());
        }

        log.info("Массовое обновление дата-центра: {} пайплайнов -> {}", updatedCount, dc);
        return BulkDatacenterResponse.builder()
                .updatedCount(updatedCount)
                .datacenter(dc)
                .build();
    }

    // --- Приватные вспомогательные методы ---

    private PipelineEntity saveWithUniqueNameCheck(PipelineEntity entity) {
        try {
            return pipelineRepository.saveAndFlush(entity);
        } catch (DataIntegrityViolationException ex) {
            if (ex.getMessage() != null && ex.getMessage().contains("uk_pipeline_name")) {
                throw new PipelineAlreadyExistsException(entity.getPipelineName());
            }
            throw ex;
        }
    }

    private void validateTasks(List<TaskRequest> tasks) {
        Set<Short> orders = new HashSet<>();
        for (TaskRequest task : tasks) {
            if (!orders.add(task.getTaskOrder())) {
                throw new PipelineValidationException(
                        "Duplicate task order: " + task.getTaskOrder());
            }
            if (!ALLOWED_TYPE_CODES.contains(task.getTypeCode())) {
                throw new PipelineValidationException(
                        "Invalid type code: '" + task.getTypeCode()
                                + "'. Allowed: " + ALLOWED_TYPE_CODES);
            }
        }

        // 1a. Первая задача (минимальный taskOrder) должна быть DownloadTask
        validateFirstTaskIsDownload(tasks);

        // 1b. Валидируем props в зависимости от типа задачи
        for (TaskRequest task : tasks) {
            validateTaskProps(task);
        }
    }

    /**
     * Проверяет, что задача с минимальным taskOrder оканчивается на "DownloadTask".
     */
    private void validateFirstTaskIsDownload(List<TaskRequest> tasks) {
        if (tasks.isEmpty()) {
            return;
        }
        TaskRequest firstTask = tasks.stream()
                .min(Comparator.comparing(TaskRequest::getTaskOrder))
                .orElseThrow();
        if (!firstTask.getTypeCode().endsWith("DownloadTask")) {
            throw new PipelineValidationException(
                    "First task (order=" + firstTask.getTaskOrder()
                            + ") must be a DownloadTask, but was: " + firstTask.getTypeCode());
        }
    }

    /**
     * Валидирует props задачи: отклоняет системные ключи, проверяет обязательные/опциональные ключи, проверяет значения.
     */
    private void validateTaskProps(TaskRequest task) {
        String typeCode = task.getTypeCode();
        Map<String, String> props = task.getProps();

        // Отклоняем системные ключи props
        for (String key : props.keySet()) {
            for (String prefix : TaskPropsDefinition.SYSTEM_PROP_PREFIXES) {
                if (key.startsWith(prefix)) {
                    throw new PipelineValidationException(
                            "Task '" + typeCode + "' (order=" + task.getTaskOrder()
                                    + "): system prop '" + key + "' is not allowed in user props");
                }
            }
            if (TaskPropsDefinition.SYSTEM_PROP_KEYS.contains(key)) {
                throw new PipelineValidationException(
                        "Task '" + typeCode + "' (order=" + task.getTaskOrder()
                                + "): system prop '" + key + "' is not allowed in user props");
            }
        }

        // Проверяем допустимые ключи
        Set<String> allowedKeys = TaskPropsDefinition.getAllowedProps(typeCode);
        for (String key : props.keySet()) {
            if (!allowedKeys.contains(key)) {
                throw new PipelineValidationException(
                        "Task '" + typeCode + "' (order=" + task.getTaskOrder()
                                + "): unknown prop '" + key + "'. Allowed: " + allowedKeys);
            }
        }

        // Проверяем, что обязательные ключи присутствуют и не пусты
        Set<String> requiredKeys = TaskPropsDefinition.REQUIRED_PROPS.getOrDefault(typeCode, Set.of());
        for (String requiredKey : requiredKeys) {
            String value = props.get(requiredKey);
            if (value == null || value.isBlank()) {
                throw new PipelineValidationException(
                        "Task '" + typeCode + "' (order=" + task.getTaskOrder()
                                + "): required prop '" + requiredKey + "' is missing or empty");
            }
        }

        // Валидируем перечислимые значения
        validateEnumProp(task, "maskType", TaskPropsDefinition.ALLOWED_MASK_TYPES);
        validateEnumProp(task, "recursive", TaskPropsDefinition.ALLOWED_BOOLEAN_VALUES);
        validateEnumProp(task, "preserveStructure", TaskPropsDefinition.ALLOWED_BOOLEAN_VALUES);

        // Кросс-полевая валидация: preserveStructure=true требует recursive=true
        if ("true".equals(props.get("preserveStructure")) && !"true".equals(props.get("recursive"))) {
            throw new PipelineValidationException(
                    "Task #" + task.getTaskOrder() + ": preserveStructure=true requires recursive=true");
        }
    }

    /**
     * Проверяет, что значение prop (если присутствует) входит в допустимый набор значений.
     */
    private void validateEnumProp(TaskRequest task, String propKey, Set<String> allowedValues) {
        String value = task.getProps().get(propKey);
        if (value != null && !allowedValues.contains(value)) {
            throw new PipelineValidationException(
                    "Task '" + task.getTypeCode() + "' (order=" + task.getTaskOrder()
                            + "): invalid value '" + value + "' for prop '" + propKey
                            + "'. Allowed: " + allowedValues);
        }
    }

    private PipelineResponse toResponse(PipelineEntity entity) {
        List<TaskResponse> taskResponses = entity.getTasks().stream()
                .map(t -> TaskResponse.builder()
                        .id(t.getId())
                        .taskOrder(t.getTaskOrder())
                        .typeCode(t.getTypeCode())
                        .props(t.getProps())
                        .build())
                .collect(Collectors.toList());

        return PipelineResponse.builder()
                .id(entity.getId())
                .pipelineName(entity.getPipelineName())
                .clientFrom(entity.getClientFrom())
                .clientTo(entity.getClientTo())
                .primaryDatacenter(entity.getPrimaryDatacenter())
                .allOrNothing(entity.isAllOrNothing())
                .tasks(taskResponses)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private PipelinePageResponse toPageResponse(PipelineEntity entity) {
        return PipelinePageResponse.builder()
                .id(entity.getId())
                .pipelineName(entity.getPipelineName())
                .clientFrom(entity.getClientFrom())
                .clientTo(entity.getClientTo())
                .primaryDatacenter(entity.getPrimaryDatacenter())
                .allOrNothing(entity.isAllOrNothing())
                .tasksCount(entity.getTasks().size())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}