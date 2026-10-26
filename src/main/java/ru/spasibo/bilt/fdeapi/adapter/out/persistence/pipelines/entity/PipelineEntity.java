package ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;
import org.hibernate.annotations.BatchSize;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pipelines", schema = "pipelines")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PipelineEntity {

    @Id
    @EqualsAndHashCode.Include
    private UUID id;

    @Column(name = "pipeline_name", nullable = false)
    private String pipelineName;

    @Column(name = "client_from", nullable = false, length = 100)
    private String clientFrom;

    @Column(name = "client_to", nullable = false, length = 100)
    private String clientTo;

    @Column(name = "primary_datacenter", nullable = false, length = 10)
    private String primaryDatacenter;

    @Column(name = "all_or_nothing", nullable = false)
    private boolean allOrNothing = false;

    @OneToMany(mappedBy = "pipeline", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("taskOrder ASC")
    @BatchSize(size = 50)
    @ToString.Exclude
    @Builder.Default
    private List<TaskEntity> tasks = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Добавляет задачу и устанавливает двунаправленную связь.
     */
    public void addTask(TaskEntity task) {
        tasks.add(task);
        task.setPipeline(this);
    }
}