package ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Read-only JPA entity, отображённая на таблицу sessions.task_sessions.
 * Этой entity управляет fde-executor; fde-api только читает её.
 */
@Entity
@Table(name = "task_sessions", schema = "sessions")
@Immutable
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class TaskSessionEntity {

    @Id
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_session_id", nullable = false)
    @ToString.Exclude
    private PipelineSessionEntity pipelineSession;

    @Column(name = "task_order", nullable = false)
    private Short taskOrder;

    @Column(name = "type_code", nullable = false, length = 50)
    private String typeCode;

    @Column(name = "is_done", nullable = false)
    private Boolean isDone;

    @Column(name = "props", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private Map<String, String> props = new HashMap<>();

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "taskSession", fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    @BatchSize(size = 100)
    @ToString.Exclude
    private List<ProcessedFileEntity> processedFiles = new ArrayList<>();
}