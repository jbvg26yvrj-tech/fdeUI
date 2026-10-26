package ru.spasibo.bilt.fdeapi.ldap;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(classes = LdapPersistenceTest.Application.class, webEnvironment = SpringBootTest.WebEnvironment.NONE, properties = {
        "spring.datasource.url=jdbc:h2:mem:ldap;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;INIT=CREATE SCHEMA IF NOT EXISTS auth",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop",
        "management.endpoint.health.validate-group-membership=false",
        "FDE_LDAP_ENCRYPTION_KEY=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
})
class LdapPersistenceTest {
    @SpringBootConfiguration @EnableAutoConfiguration
    @EntityScan(basePackageClasses = {UserEntity.class, LdapSettingsEntity.class})
    @EnableJpaRepositories(basePackageClasses = {UserRepository.class, LdapSettingsRepository.class})
    @Import({LdapSettingsService.class, LdapIdentityService.class, LdapSyncService.class, SecretCipher.class})
    static class Application {}

    @Autowired LdapSettingsRepository settingsRepository;
    @Autowired UserRepository users;
    @Autowired LdapSettingsService settings;
    @Autowired LdapIdentityService identities;
    @Autowired LdapSyncService sync;
    @MockitoBean LdapDirectory directory;
    @MockitoBean TokenPort tokens;

    @BeforeEach void prepare() {
        users.deleteAll(); settingsRepository.deleteAll(); settingsRepository.saveAndFlush(new LdapSettingsEntity());
        LdapSettings config = new LdapSettings(); config.setEnabled(true); config.setSyncEnabled(true);
        config.setUrl("ldaps://localhost:636"); config.setBaseDn("dc=example,dc=com");
        config.setBindDn("cn=service,dc=example,dc=com"); config.setBindPassword("secret"); settings.save(config);
        when(directory.findAllByIds(any(), any(), any())).thenAnswer(call -> {
            Map<String, Optional<DirectoryIdentity>> results = new LinkedHashMap<>();
            for (String id : (List<String>) call.getArgument(2))
                results.put(id, directory.findById(call.getArgument(0), call.getArgument(1), id));
            return results;
        });
    }
    UserEntity user(String login, String id) {
        return users.saveAndFlush(UserEntity.builder().login(login).password("!LDAP").authSource("LDAP")
                .externalId(id).activated(true).passwordChangeRequired(false).build());
    }
    @Test void syncFailureNeverAppliesPartialMissingUsers() {
        UserEntity first = user("alice", "1"), second = user("bob", "2");
        when(directory.findById(any(), any(), eq("1"))).thenReturn(Optional.empty());
        when(directory.findById(any(), any(), eq("2"))).thenThrow(new DirectoryException());
        assertThat(sync.runNow().status()).isEqualTo("FAILED");
        assertThat(users.findById(first.getId()).orElseThrow().isActivated()).isTrue();
        assertThat(users.findById(second.getId()).orElseThrow().isActivated()).isTrue();
        verify(tokens, never()).revokeRefreshToken(any());
        assertThat(sync.status().status()).isEqualTo("FAILED");
    }
    @Test void syncDeactivatesMissingUsersAndReactivatesOnlyWithoutManualBlock() {
        UserEntity alice = user("alice", "1");
        when(directory.findById(any(), any(), eq("1"))).thenReturn(Optional.empty());
        assertThat(sync.runNow().deactivated()).isEqualTo(1);
        assertThat(users.findById(alice.getId()).orElseThrow().isActivated()).isFalse();
        verify(tokens).revokeRefreshToken(alice.getId());
        when(directory.findById(any(), any(), eq("1"))).thenReturn(Optional.of(new DirectoryIdentity("1", "renamed", null, null, true)));
        assertThat(sync.runNow().status()).isEqualTo("SUCCESS");
        UserEntity current = users.findById(alice.getId()).orElseThrow();
        assertThat(current.isActivated()).isTrue(); assertThat(current.getLogin()).isEqualTo("renamed");
        current.setManualDisabled(true); current.setActivated(false); users.saveAndFlush(current);
        sync.runNow();
        assertThat(users.findById(alice.getId()).orElseThrow().isActivated()).isFalse();
    }
    @Test void settingsPreserveCiphertextWhenPasswordOmittedAndForbidDirectoryReplacement() {
        String secret = settingsRepository.findById(1).orElseThrow().getEncryptedPassword();
        LdapSettings config = settings.get(); config.setBindPassword(""); settings.save(config);
        assertThat(settingsRepository.findById(1).orElseThrow().getEncryptedPassword()).isEqualTo(secret);
        assertThat(settings.get().getBindPassword()).isNull();
        user("alice", "1"); config.setBaseDn("dc=other,dc=com");
        assertThatThrownBy(() -> settings.save(config)).isInstanceOf(ru.spasibo.bilt.fdeapi.domain.exception.ValidationException.class);
    }
    @Test void concurrentFirstLoginsProvisionOneStableIdentity() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            DirectoryIdentity identity = new DirectoryIdentity("stable", "alice", null, null, true);
            var one = executor.submit(() -> identities.loginIdentity(identity));
            var two = executor.submit(() -> identities.loginIdentity(identity));
            assertThat(one.get(10, TimeUnit.SECONDS).id()).isEqualTo(two.get(10, TimeUnit.SECONDS).id());
            assertThat(users.count()).isEqualTo(1);
        } finally { executor.shutdownNow(); }
    }

    @Test void existingDatabaseLeasePreventsOverlappingSync() {
        var row = settingsRepository.findById(1).orElseThrow();
        row.setLeaseOwner("another-instance"); row.setLeaseUntil(java.time.Instant.now().plusSeconds(60));
        row.setSyncStatus("RUNNING"); settingsRepository.saveAndFlush(row);
        assertThat(sync.runNow().status()).isEqualTo("RUNNING");
        verifyNoInteractions(directory);
    }

    @Test void settingsChangeDuringCollectionDiscardsResults() throws Exception {
        UserEntity alice = user("alice", "1");
        CountDownLatch collecting = new CountDownLatch(1), resume = new CountDownLatch(1);
        doAnswer(call -> {
            collecting.countDown(); resume.await(5, TimeUnit.SECONDS);
            return Map.of("1", Optional.<DirectoryIdentity>empty());
        }).when(directory).findAllByIds(any(), any(), any());
        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            var result = executor.submit(sync::runNow);
            assertThat(collecting.await(5, TimeUnit.SECONDS)).isTrue();
            LdapSettings config = settings.get(); config.setActiveFilter("(!(description=disabled))"); settings.save(config);
            resume.countDown();
            assertThat(result.get(10, TimeUnit.SECONDS).status()).isEqualTo("FAILED");
            assertThat(users.findById(alice.getId()).orElseThrow().isActivated()).isTrue();
        } finally { resume.countDown(); executor.shutdownNow(); }
    }
}
