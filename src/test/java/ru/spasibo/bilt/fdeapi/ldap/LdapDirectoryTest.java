package ru.spasibo.bilt.fdeapi.ldap;

import com.unboundid.ldap.listener.*;
import com.unboundid.ldap.sdk.*;
import com.unboundid.util.ssl.*;
import org.junit.jupiter.api.*;
import java.io.File;
import static org.assertj.core.api.Assertions.*;

class LdapDirectoryTest {
    InMemoryDirectoryServer server;
    LdapSettings settings;
    LdapDirectory directory;
    static File keyStore;
    static SSLUtil ssl;
    java.util.concurrent.atomic.AtomicBoolean incomplete = new java.util.concurrent.atomic.AtomicBoolean();

    @BeforeAll static void certificate() throws Exception {
        keyStore = java.nio.file.Files.createTempDirectory("ldap-test-tls").resolve("test.jks").toFile();
        Process process = new ProcessBuilder(System.getProperty("java.home") + "/bin/keytool", "-genkeypair",
                "-alias", "test", "-keyalg", "RSA", "-keystore", keyStore.getAbsolutePath(), "-storetype", "JKS",
                "-storepass", "test-password", "-keypass", "test-password", "-dname", "CN=localhost",
                "-ext", "SAN=dns:localhost,ip:127.0.0.1", "-validity", "1", "-noprompt")
                .redirectErrorStream(true).start();
        assertThat(process.waitFor(15, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
        assertThat(process.exitValue()).isZero();
        ssl = new SSLUtil(new KeyStoreKeyManager(keyStore, "test-password".toCharArray()),
                new TrustStoreTrustManager(keyStore, "test-password".toCharArray(), "JKS", true));
    }

    @BeforeEach void startDirectory() throws Exception {
        InMemoryDirectoryServerConfig config = new InMemoryDirectoryServerConfig("dc=example,dc=com");
        config.setSchema(null);
        config.addAdditionalBindCredentials("cn=service,dc=example,dc=com", "service-password");
        config.setListenerConfigs(InMemoryListenerConfig.createLDAPSConfig("tls", 0, ssl.createSSLServerSocketFactory()),
                InMemoryListenerConfig.createLDAPConfig("starttls", null, 0, ssl.createSSLSocketFactory()));
        config.addInMemoryOperationInterceptor(new com.unboundid.ldap.listener.interceptor.InMemoryOperationInterceptor() {
            @Override public void processSearchResult(com.unboundid.ldap.listener.interceptor.InMemoryInterceptedSearchResult result) {
                if (incomplete.get()) result.setResult(new LDAPResult(0, ResultCode.SIZE_LIMIT_EXCEEDED));
            }
        });
        server = new InMemoryDirectoryServer(config);
        server.startListening();
        server.add("dn: dc=example,dc=com", "objectClass: domain", "dc: example");
        addUser("alice", "id-1");
        settings = new LdapSettings();
        settings.setEnabled(true);
        settings.setDirectoryType("LDAP");
        settings.setUrl("ldaps://localhost:" + server.getListenPort("tls"));
        settings.setBaseDn("dc=example,dc=com");
        settings.setBindDn("cn=service,dc=example,dc=com");
        settings.setLoginAttribute("uid");
        settings.setIdAttribute("entryUUID");
        settings.setUserFilter("(objectClass=person)");
        settings.setActiveFilter("(!(description=disabled))");
        directory = new LdapDirectory(ssl.createSSLSocketFactory());
    }
    void addUser(String name, String id) throws Exception {
        server.add("dn: cn=" + name + ",dc=example,dc=com", "objectClass: person", "cn: " + name,
                "sn: User", "uid: " + name, "entryUUID: " + id, "userPassword: password");
    }
    @AfterEach void stopDirectory() { if (server != null) server.shutDown(true); }

    @Test void authenticatesThroughRealTlsBindAndKeepsIdentityAfterRename() {
        DirectoryIdentity identity = directory.authenticate(settings, "service-password", "alice", "password");
        assertThat(identity.externalId()).isEqualTo("id-1");
        assertThat(identity.active()).isTrue();
        assertThatThrownBy(() -> directory.authenticate(settings, "service-password", "alice", "wrong"))
                .isInstanceOf(DirectoryException.class);
        assertThatThrownBy(() -> directory.authenticate(settings, "service-password", "alice", ""))
                .isInstanceOf(DirectoryException.class);
    }
    @Test void escapesSearchAndRejectsAmbiguousUsers() throws Exception {
        assertThatThrownBy(() -> directory.authenticate(settings, "service-password", "*)(uid=*)", "password"))
                .isInstanceOf(DirectoryException.class);
        addUser("alice2", "id-2");
        server.modify("cn=alice2,dc=example,dc=com", new Modification(ModificationType.REPLACE, "uid", "alice"));
        assertThatThrownBy(() -> directory.authenticate(settings, "service-password", "alice", "password"))
                .isInstanceOf(DirectoryException.class);
    }
    @Test void lookupDistinguishesDisabledDeletedRenamedAndFailure() throws Exception {
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "uid", "renamed"));
        assertThat(directory.findById(settings, "service-password", "id-1").orElseThrow().login()).isEqualTo("renamed");
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "description", "disabled"));
        assertThat(directory.findById(settings, "service-password", "id-1").orElseThrow().active()).isFalse();
        server.delete("cn=alice,dc=example,dc=com");
        assertThat(directory.findById(settings, "service-password", "id-1")).isEmpty();
        assertThatThrownBy(() -> directory.findById(settings, "incorrect", "id-1"))
                .isInstanceOf(DirectoryException.class);
    }

    @Test void synchronizationRespectsEligibilityFilterWithoutDependingOnOldLogin() throws Exception {
        settings.setUserFilter("(&(objectClass=person)(uid={login})(!(description=excluded)))");
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "uid", "renamed"));
        assertThat(directory.findById(settings, "service-password", "id-1")).isPresent();
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "description", "excluded"));
        assertThat(directory.findById(settings, "service-password", "id-1")).isEmpty();
    }

    @Test void startTlsBindsAndUntrustedCertificateIsRejected() {
        assertThatThrownBy(() -> new LdapDirectory().authenticate(settings, "service-password", "alice", "password"))
                .isInstanceOf(DirectoryException.class);
        settings.setTlsMode("STARTTLS");
        settings.setUrl("ldap://localhost:" + server.getListenPort("starttls"));
        assertThat(directory.authenticate(settings, "service-password", "alice", "password").active()).isTrue();
    }

    @Test void adDisabledAndExpiredAccountsAreInactive() throws Exception {
        byte[] guid = new byte[16]; guid[0] = 1;
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "objectGUID", guid),
                new Modification(ModificationType.REPLACE, "userAccountControl", "512"),
                new Modification(ModificationType.REPLACE, "accountExpires", Long.toString(Long.MAX_VALUE)));
        settings.setDirectoryType("AD"); settings.setIdAttribute("objectGUID");
        assertThat(directory.authenticate(settings, "service-password", "alice", "password").active()).isTrue();
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "userAccountControl", "514"));
        assertThat(directory.authenticate(settings, "service-password", "alice", "password").active()).isFalse();
        server.modify("cn=alice,dc=example,dc=com", new Modification(ModificationType.REPLACE, "userAccountControl", "512"),
                new Modification(ModificationType.REPLACE, "accountExpires", "1"));
        assertThat(directory.authenticate(settings, "service-password", "alice", "password").active()).isFalse();
    }

    @Test void batchesHundredsOfStableIdsAndRejectsPartialSearchResponses() throws Exception {
        java.util.List<String> ids = new java.util.ArrayList<>(); ids.add("id-1");
        for (int i = 2; i <= 202; i++) { addUser("user" + i, "id-" + i); ids.add("id-" + i); }
        assertThat(directory.findAllByIds(settings, "service-password", ids)).hasSize(202)
                .allSatisfy((id, identity) -> assertThat(identity).isPresent());
        incomplete.set(true);
        assertThatThrownBy(() -> directory.findAllByIds(settings, "service-password", ids))
                .isInstanceOf(DirectoryException.class);
    }
}
