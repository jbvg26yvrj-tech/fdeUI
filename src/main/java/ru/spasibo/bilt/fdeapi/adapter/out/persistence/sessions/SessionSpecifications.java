package ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions;

import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;

import java.util.UUID;

import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSpecifications;

/**
 * JPA Specification для фильтрации сессий пайплайнов в запросах списков.
 */
public final class SessionSpecifications {

    private SessionSpecifications() {
    }

    /**
     * Точное совпадение по ID.
     */
    public static Specification<PipelineSessionEntity> idEquals(UUID id) {
        return (root, query, cb) ->
                cb.equal(root.get("id"), id);
    }

    /**
     * Точное совпадение по ID пайплайна.
     */
    public static Specification<PipelineSessionEntity> pipelineIdEquals(UUID pipelineId) {
        return (root, query, cb) ->
                cb.equal(root.get("pipelineId"), pipelineId);
    }

    /**
     * Точное совпадение по статусу сессии (без учёта регистра).
     */
    public static Specification<PipelineSessionEntity> statusEquals(String status) {
        return (root, query, cb) ->
                cb.equal(cb.upper(root.get("status")), status.toUpperCase());
    }

    public static Specification<PipelineSessionEntity> startDtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("startDt", dateFilter);
    }

    public static Specification<PipelineSessionEntity> createdAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("createdAt", dateFilter);
    }

    public static Specification<PipelineSessionEntity> updatedAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("updatedAt", dateFilter);
    }



}