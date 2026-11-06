package ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines;

import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSpecifications;
import ru.spasibo.bilt.fdeapi.util.jpa.SpecificationUtils;

import java.util.UUID;
import java.time.LocalDateTime;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;

public final class PipelineSpecifications {

    private PipelineSpecifications() {
    }

    /** Count visible failures with no later visible success, before list pagination. */
    public static Specification<PipelineEntity> needsAttention(Specification<PipelineSessionEntity> sessionRestrictions) {
        return (pipeline, query, cb) -> {
            var failures = query.subquery(Long.class);
            var failed = failures.from(PipelineSessionEntity.class);
            var successes = failures.subquery(UUID.class);
            var success = successes.from(PipelineSessionEntity.class);
            var later = cb.or(cb.greaterThan(success.<LocalDateTime>get("startDt"), failed.get("startDt")),
                    cb.and(cb.equal(success.get("startDt"), failed.get("startDt")),
                            cb.greaterThan(success.<UUID>get("id"), failed.get("id"))));
            var successAccess = sessionRestrictions.toPredicate(success, query, cb);
            successes.select(success.get("id")).where(cb.equal(success.get("pipelineId"), failed.get("pipelineId")),
                    cb.equal(success.get("status"), "SUCCESS"), later,
                    successAccess == null ? cb.conjunction() : successAccess);
            var failedAccess = sessionRestrictions.toPredicate(failed, query, cb);
            failures.select(cb.countDistinct(failed.get("id"))).where(cb.equal(failed.get("pipelineId"), pipeline.get("id")),
                    cb.equal(failed.get("status"), "FAILED"), cb.isNotNull(failed.get("startDt")),
                    cb.not(cb.exists(successes)), failedAccess == null ? cb.conjunction() : failedAccess);
            return cb.ge(failures, 2L);
        };
    }

    public static Specification<PipelineEntity> idEquals(UUID id) {
        return (root, query, cb) -> cb.equal(root.get("id"), id);
    }

    public static Specification<PipelineEntity> nameLike(String pipelineName) {
        return SpecificationUtils.like("pipelineName", pipelineName);
    }

    public static Specification<PipelineEntity> clientFromLike(String clientFrom) {
        return SpecificationUtils.like("clientFrom", clientFrom);
    }

    public static Specification<PipelineEntity> clientToLike(String clientTo) {
        return SpecificationUtils.like("clientTo", clientTo);
    }

    public static Specification<PipelineEntity> primaryDatacenterLike(String primaryDatacenter) {
        return SpecificationUtils.like("primaryDatacenter", primaryDatacenter);
    }

    public static Specification<PipelineEntity> allOrNothing(Boolean allOrNothing) {
        return (root, query, cb) -> cb.equal(root.get("allOrNothing"), allOrNothing);
    }

    public static Specification<PipelineEntity> createdAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("createdAt", dateFilter);
    }

    public static Specification<PipelineEntity> updatedAtCondition(DateFilter dateFilter) {
        return DateFilterSpecifications.buildDateCondition("updatedAt", dateFilter);
    }
}