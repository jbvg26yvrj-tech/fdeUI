package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * JPA entity, представляющая пользователя в схеме auth.
 */
@Entity
@Table(name = "users", schema = "auth")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserEntity {

    @jakarta.persistence.Version
    private long version;

    @Column(name = "auth_source", nullable = false, length = 8)
    @Builder.Default
    private String authSource = "LOCAL";

    @Column(name = "external_id", length = 255)
    private String externalId;

    @Column(name = "directory_disabled", nullable = false)
    private boolean directoryDisabled;

    @Column(name = "manual_disabled", nullable = false)
    private boolean manualDisabled;

    @Column(name = "display_name")
    private String displayName;

    @Column(length = 320)
    private String email;

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String login;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    @Builder.Default
    private boolean activated = false;

    @Column(name = "password_change_required", nullable = false)
    @Builder.Default
    private boolean passwordChangeRequired = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
