package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Репозиторий для доступа к данным ролей.
 */
public interface RoleRepository extends JpaRepository<RoleEntity, UUID>,
        JpaSpecificationExecutor<RoleEntity> {
    Optional<RoleEntity> findByCode(String code);

    boolean existsByCode(String code);

    /**
     * Возвращает коды ролей, назначенных пользователю через связующую таблицу role_users.
     * Один запрос вместо N+1 обращений.
     */
    @Query("SELECT r.code FROM RoleEntity r JOIN RoleUserEntity ru ON r.id = ru.roleId WHERE ru.userId = :userId")
    Set<String> findRoleCodesByUserId(@Param("userId") UUID userId);

    /**
     * Возвращает идентификаторы ролей, назначенных пользователю.
     */
    @Query("SELECT ru.roleId FROM RoleUserEntity ru WHERE ru.userId = :userId")
    Set<UUID> findRoleIdsByUserId(@Param("userId") UUID userId);
}