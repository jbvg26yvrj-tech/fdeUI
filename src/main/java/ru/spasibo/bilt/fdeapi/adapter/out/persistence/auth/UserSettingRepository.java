package ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data repository для entity настроек пользователя в схеме auth.
 */
@Repository
public interface UserSettingRepository extends JpaRepository<UserSettingEntity, UUID> {

    List<UserSettingEntity> findByUserId(UUID userId);

    Optional<UserSettingEntity> findByUserIdAndSettingKey(UUID userId, String settingKey);

    /**
     * Использует явный JPQL DELETE вместо derived delete, чтобы избежать
     * предварительной загрузки entity (SELECT + DELETE -> единственный DELETE).
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM UserSettingEntity e WHERE e.userId = :userId AND e.settingKey = :settingKey")
    void deleteByUserIdAndSettingKey(@Param("userId") UUID userId, @Param("settingKey") String settingKey);
}