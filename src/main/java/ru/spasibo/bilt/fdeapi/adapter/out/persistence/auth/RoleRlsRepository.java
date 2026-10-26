package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA репозиторий для {@link RoleRlsEntity}.
 */
@Repository
public interface RoleRlsRepository extends JpaRepository<RoleRlsEntity, UUID> {

    List<RoleRlsEntity> findByRoleId(UUID roleId);

    Optional<RoleRlsEntity> findByRoleIdAndResourceId(UUID roleId, UUID resourceId);

    /**
     * Пакетно загружает все RLS-фильтры для набора идентификаторов ролей.
     * Используется для агрегации RLS на уровне пользователя из всех назначенных ролей.
     */
    @Query("SELECT r FROM RoleRlsEntity r WHERE r.roleId IN :roleIds")
    List<RoleRlsEntity> findByRoleIdIn(@Param("roleIds") Collection<UUID> roleIds);

    @Modifying
    @Query("DELETE FROM RoleRlsEntity r WHERE r.id = :id")
    void deleteById(@Param("id") UUID id);
}