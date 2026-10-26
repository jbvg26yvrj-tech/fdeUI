package ru.spasibo.bilt.fdeapi.ldap;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;

public interface LdapSettingsRepository extends JpaRepository<LdapSettingsEntity, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from LdapSettingsEntity s where s.id = 1")
    Optional<LdapSettingsEntity> lock();
}
