package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import java.util.UUID;

/**
 * Spring Data JPA репозиторий для {@link RoleResourceEntity}.
 */
@Repository
public interface RlsRepository extends JpaRepository<RoleRlsEntity, UUID>, JpaSpecificationExecutor<RoleRlsEntity> {

}