package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA репозиторий для {@link RoleResourceEntity}.
 */
@Repository
public interface RoleResourceRepository extends JpaRepository<RoleResourceEntity, UUID> {

    List<RoleResourceEntity> findByRoleId(UUID roleId);

    List<RoleResourceEntity> findByRoleIdIn(Collection<UUID> roleIds);

    boolean existsByRoleIdAndResourceId(UUID roleId, UUID resourceId);

    @Modifying
    @Transactional
    void deleteByRoleIdAndResourceId(UUID roleId, UUID resourceId);
}