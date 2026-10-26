package ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Immutable;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pipeline_sessions", schema = "sessions")
@Immutable
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PipelineSessionEntity {

    @Id
    @EqualsAndHashCode.Include
    private UUID id;

    // Связь с пайплайном (для JOIN)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    @ToString.Exclude
    private PipelineEntity pipeline;

    // Если нужно поле ID для прямого доступа – оставляем (только для чтения)
    @Column(name = "pipeline_id", insertable = false, updatable = false)
    private UUID pipelineId;

    @Column(name = "replica_id", length = 100)
    private String replicaId;

    @Column(name = "start_dt", nullable = false)
    private LocalDateTime startDt;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "error_message")
    private String errorMessage;

    @OneToMany(mappedBy = "pipelineSession", fetch = FetchType.LAZY)
    @OrderBy("taskOrder ASC")
    @BatchSize(size = 50)
    @ToString.Exclude
    private List<TaskSessionEntity> taskSessions = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}