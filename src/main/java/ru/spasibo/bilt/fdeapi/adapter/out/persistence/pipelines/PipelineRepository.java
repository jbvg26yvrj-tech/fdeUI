package ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;

import java.util.Collection;
import java.util.UUID;

/**
 * Репозиторий для доступа к данным пайплайнов.
 */
public interface PipelineRepository extends JpaRepository<PipelineEntity, UUID>,
        JpaSpecificationExecutor<PipelineEntity> {

    @Modifying
    @Query("UPDATE PipelineEntity p SET p.primaryDatacenter = :dc WHERE p.id IN :ids")
    int bulkUpdateDatacenter(@Param("dc") String datacenter, @Param("ids") Collection<UUID> ids);
}