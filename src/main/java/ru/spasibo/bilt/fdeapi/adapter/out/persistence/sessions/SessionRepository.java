package ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;

import java.util.UUID;

/**
 * Репозиторий для доступа к данным сессий выполнения пайплайнов.
 * Read-only репозиторий для сессий пайплайнов.
 * Операции записи заблокированы на уровне entity аннотацией @Immutable.
 */
public interface SessionRepository extends JpaRepository<PipelineSessionEntity, UUID>,
        JpaSpecificationExecutor<PipelineSessionEntity> {
}