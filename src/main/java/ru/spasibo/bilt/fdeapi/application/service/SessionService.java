package ru.spasibo.bilt.fdeapi.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ProcessedFileResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.SessionPageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.SessionResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.TaskSessionResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.ProcessedFileEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.SessionRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.SessionSpecifications;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.TaskSessionEntity;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;
import ru.spasibo.bilt.fdeapi.domain.exception.SessionNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceDefinition;
import ru.spasibo.bilt.fdeapi.domain.model.SessionStatus;
import ru.spasibo.bilt.fdeapi.util.datetime.SpecificationHelper;
import ru.spasibo.bilt.fdeapi.util.pagination.PaginationUtils;
import ru.spasibo.bilt.fdeapi.util.rls.RlsFilterService;
import ru.spasibo.bilt.fdeapi.util.rls.RlsSpecificationBuilder;

import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Сервис только для чтения, предназначенный для запроса сессий выполнения пайплайнов.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            "id", "pipelineId", "startDt", "status", "createdAt", "updatedAt"
    );

    private final SessionRepository sessionRepository;
    private final AccessScopeService accessScopeService;
    private final PipelineRepository pipelineRepository;
    private final RlsFilterService rlsFilterService;
    private final RlsSpecificationBuilder rlsSpecificationBuilder;

    /**
     * Возвращает постраничный отфильтрованный список сессий пайплайнов.
     *
     * @param page              номер страницы
     * @param size              размер страницы
     * @param sort              правило сортировки
     * @param id                фильтр по идентификатору сессии
     * @param pipelineId        фильтр по идентификатору пайплайна
     * @param status            фильтр по статусу сессии
     * @param startDt           фильтр по дате запуска
     * @param createdAt         фильтр по дате создания
     * @param updatedAt         фильтр по дате обновления
     * @param startDtOperator   оператор сравнения для даты запуска
     * @param createdAtOperator оператор сравнения для даты создания
     * @param updatedAtOperator оператор сравнения для даты обновления
     * @return страница сессий
     */
    @Transactional(readOnly = true)
    public PagedResponse<SessionPageResponse> getAll(int page, int size, String sort, UUID id, UUID pipelineId,
                                                     String status, String startDt, String createdAt, String updatedAt,
                                                     String startDtOperator, String createdAtOperator, String updatedAtOperator) {
        log.debug("Получение сессий с RLS-фильтрацией");
        String login = SecurityContextHolder.getContext().getAuthentication().getName();
        log.debug("Текущий пользователь: {}", login);

        Specification<PipelineSessionEntity> spec = accessScopeService.sessions();

        // Валидация статуса
        if (status != null && !status.isBlank()) {
            validateStatus(status);
        }

        Sort sortOrder = PaginationUtils.parseSort(sort, ALLOWED_SORT_FIELDS, "startDt");
        PageRequest pageRequest = PageRequest.of(page, size, sortOrder);

        // Добавляем фильтры из параметров запроса
        if (id != null) {
            spec = spec.and(SessionSpecifications.idEquals(id));
        }
        if (pipelineId != null) {
            spec = spec.and(SessionSpecifications.pipelineIdEquals(pipelineId));
        }
        if (status != null && !status.isBlank()) {
            spec = spec.and(SessionSpecifications.statusEquals(status));
        }

        spec = SpecificationHelper.withDateFilter(spec, startDt, startDtOperator, SessionSpecifications::startDtCondition);
        spec = SpecificationHelper.withDateFilter(spec, createdAt, createdAtOperator, SessionSpecifications::createdAtCondition);
        spec = SpecificationHelper.withDateFilter(spec, updatedAt, updatedAtOperator, SessionSpecifications::updatedAtCondition);

        Page<PipelineSessionEntity> pageResult = sessionRepository.findAll(spec, pageRequest);

        // Пакетная загрузка имён пайплайнов для всех сессий на странице
        Set<UUID> pipelineIds = pageResult.getContent().stream()
                .map(PipelineSessionEntity::getPipelineId)
                .collect(Collectors.toSet());
        Map<UUID, String> pipelineNames = pipelineRepository.findAllById(pipelineIds).stream()
                .collect(Collectors.toMap(PipelineEntity::getId, PipelineEntity::getPipelineName));

        return PaginationUtils.toPagedResponse(pageResult,
                entity -> toPageResponse(entity, pipelineNames.get(entity.getPipelineId())));
    }

    /**
     * Возвращает одну сессию по идентификатору вместе с её задачами (task sessions).
     *
     * @param sessionId идентификатор сессии
     * @return найденная сессия
     */
    @Transactional(readOnly = true)
    public SessionResponse getById(UUID sessionId) {
        Specification<PipelineSessionEntity> rlsSpec = accessScopeService.sessions();

        PipelineSessionEntity entity = sessionRepository.findOne(rlsSpec.and(SessionSpecifications.idEquals(sessionId)))
                .orElseThrow(() -> new SessionNotFoundException(sessionId));

        String pipelineName = pipelineRepository.findById(entity.getPipelineId())
                .map(PipelineEntity::getPipelineName)
                .orElse(null);

        return toResponse(entity, pipelineName);
    }

    // --- Приватные вспомогательные методы ---

    private void validateStatus(String status) {
        try {
            SessionStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new PipelineValidationException(
                    "Invalid session status: '" + status + "'. Allowed: "
                            + List.of(SessionStatus.values()));
        }
    }

    private SessionResponse toResponse(PipelineSessionEntity entity, String pipelineName) {
        List<TaskSessionResponse> taskResponses = entity.getTaskSessions().stream()
                .map(this::toTaskResponse)
                .collect(Collectors.toList());

        // Дедупликация файлов по имени между задачами, чтобы избежать двойного подсчёта (download + upload)
        Map<String, Long> uniqueFiles = new LinkedHashMap<>();
        for (TaskSessionResponse task : taskResponses) {
            for (ProcessedFileResponse file : task.getProcessedFiles()) {
                uniqueFiles.putIfAbsent(file.getFileName(), file.getFileSize());
            }
        }
        int sessionTotalFiles = uniqueFiles.size();
        long sessionTotalBytes = uniqueFiles.values().stream().mapToLong(Long::longValue).sum();

        return SessionResponse.builder()
                .id(entity.getId())
                .pipelineId(entity.getPipelineId())
                .pipelineName(pipelineName)
                .replicaId(entity.getReplicaId())
                .startDt(entity.getStartDt())
                .status(entity.getStatus())
                .errorMessage(entity.getErrorMessage())
                .tasks(taskResponses)
                .totalFiles(sessionTotalFiles)
                .totalBytes(sessionTotalBytes)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private TaskSessionResponse toTaskResponse(TaskSessionEntity taskSession) {
        List<ProcessedFileResponse> fileResponses = taskSession.getProcessedFiles().stream()
                .map(this::toFileResponse)
                .collect(Collectors.toList());

        int taskTotalFiles = fileResponses.size();
        long taskTotalBytes = taskSession.getProcessedFiles().stream()
                .mapToLong(ProcessedFileEntity::getFileSize)
                .sum();

        return TaskSessionResponse.builder()
                .id(taskSession.getId())
                .taskOrder(taskSession.getTaskOrder())
                .typeCode(taskSession.getTypeCode())
                .isDone(taskSession.getIsDone())
                .processedFiles(fileResponses)
                .totalFiles(taskTotalFiles)
                .totalBytes(taskTotalBytes)
                .createdAt(taskSession.getCreatedAt())
                .updatedAt(taskSession.getUpdatedAt())
                .build();
    }

    private ProcessedFileResponse toFileResponse(ProcessedFileEntity file) {
        return ProcessedFileResponse.builder()
                .fileName(file.getFileName())
                .sourceFileName(file.getSourceFileName())
                .fileSize(file.getFileSize())
                .status(file.getStatus())
                .errorMessage(file.getErrorMessage())
                .createdAt(file.getCreatedAt())
                .build();
    }

    private SessionPageResponse toPageResponse(PipelineSessionEntity entity, String pipelineName) {
        return SessionPageResponse.builder()
                .id(entity.getId())
                .pipelineId(entity.getPipelineId())
                .pipelineName(pipelineName)
                .replicaId(entity.getReplicaId())
                .startDt(entity.getStartDt())
                .status(entity.getStatus())
                .errorMessage(entity.getErrorMessage())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}