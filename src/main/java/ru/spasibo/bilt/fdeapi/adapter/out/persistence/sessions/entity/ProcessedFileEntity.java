package ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Read-only JPA entity, отображённая на таблицу sessions.processed_files.
 * Этой entity управляет fde-executor; fde-api только читает её.
 */
@Entity
@Table(name = "processed_files", schema = "sessions")
@Immutable
@Data
@NoArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ProcessedFileEntity {

    @Id
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_session_id", nullable = false)
    @ToString.Exclude
    private TaskSessionEntity taskSession;

    @Column(name = "file_name", nullable = false, length = 500)
    private String fileName;

    @Column(name = "source_file_name", length = 500)
    private String sourceFileName;

    @Column(name = "file_size", nullable = false)
    private Long fileSize;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
