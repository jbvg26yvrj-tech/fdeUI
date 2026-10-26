package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Spring Data JPA репозиторий для {@link RoleUserEntity}.
 */
@Repository
public interface RoleUserRepository extends JpaRepository<RoleUserEntity, UUID> {

    List<RoleUserEntity> findByUserId(UUID userId);

    List<RoleUserEntity> findByRoleId(UUID roleId);

    boolean existsByRoleIdAndUserId(UUID roleId, UUID userId);

    @Modifying
    @Transactional
    void deleteByRoleIdAndUserId(UUID roleId, UUID userId);

    @Query("SELECT DISTINCT u.login FROM UserEntity u " +
            "JOIN RoleUserEntity ru ON u.id = ru.userId " +
            "WHERE ru.roleId IN :roleIds")
    Set<String> findUserCodesByRoleIds(@Param("roleIds") Collection<UUID> roleIds);
}