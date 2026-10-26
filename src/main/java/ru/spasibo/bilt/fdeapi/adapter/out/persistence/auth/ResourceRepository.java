package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Spring Data JPA репозиторий для {@link ResourceEntity}.
 */
@Repository
public interface ResourceRepository extends JpaRepository<ResourceEntity, UUID>, JpaSpecificationExecutor<ResourceEntity> {

    Optional<ResourceEntity> findByCode(String code);

    List<ResourceEntity> findByType(String type);

    boolean existsByCode(String code);

    List<ResourceEntity> findByCodeIn(Collection<String> codes);

    /**
     * Возвращает коды ресурсов, назначенных любой из указанных ролей.
     * Один пакетный запрос вместо N+1 выборок.
     */
    @Query("SELECT DISTINCT res.code FROM ResourceEntity res " +
            "JOIN RoleResourceEntity rr ON res.id = rr.resourceId " +
            "WHERE rr.roleId IN :roleIds")
    Set<String> findResourceCodesByRoleIds(@Param("roleIds") Collection<UUID> roleIds);

    /**
     * Возвращает все коды ресурсов без загрузки полных сущностей.
     * Эффективнее, чем загружать все сущности и извлекать коды на стороне Java.
     */
    @Query("SELECT r.code FROM ResourceEntity r")
    Set<String> findAllCodes();

    /**
     * Возвращает пары «ID ресурса — код» для указанных ID.
     * Используется для пакетной загрузки кодов ресурсов, чтобы избежать N+1 запросов при агрегации RLS.
     */
    @Query("SELECT r.id, r.code FROM ResourceEntity r WHERE r.id IN :ids")
    List<Object[]> findIdAndCodeByIdIn(@Param("ids") Collection<UUID> ids);
}