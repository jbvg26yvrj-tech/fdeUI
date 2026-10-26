package ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines;

import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilter;
import ru.spasibo.bilt.fdeapi.util.datetime.DateFilterSpecifications;
import ru.spasibo.bilt.fdeapi.util.jpa.SpecificationUtils;

import java.util.UUID;

public final class PipelineSpecifications {

    private PipelineSpecifications() {
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