package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Репозиторий для доступа к данным пользователей.
 */
@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID>,
        JpaSpecificationExecutor<UserEntity> {

    Optional<UserEntity> findByLogin(String login);

    boolean existsByLogin(String login);

    Optional<UserEntity> findByLoginIgnoreCase(String login);
    Optional<UserEntity> findByAuthSourceAndExternalId(String authSource, String externalId);
    boolean existsByAuthSource(String authSource);
    org.springframework.data.domain.Page<UserEntity> findByAuthSource(String authSource, org.springframework.data.domain.Pageable pageable);


}
