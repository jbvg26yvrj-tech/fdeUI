package ru.spasibo.bilt.fdeapi.ldap;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity @Table(name = "ldap_settings", schema = "auth") @Getter @Setter
public class LdapSettingsEntity {
    @Id private Integer id = 1;
    @Column(name = "config_json", nullable = false, columnDefinition = "text") private String configJson = "{}";
    @Column(name = "encrypted_password", columnDefinition = "text") private String encryptedPassword;
    @Version private long version;
    private String leaseOwner;
    private Instant leaseUntil;
    private Instant nextSyncAt;
    private String syncStatus = "NEVER";
    private String syncMessage = "Синхронизация ещё не выполнялась";
    private int syncChecked;
    private int syncUpdated;
    private int syncDeactivated;
    private Instant syncFinishedAt;
}
