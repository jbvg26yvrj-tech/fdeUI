package ru.spasibo.bilt.fdeapi.ldap;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.assertj.core.api.Assertions.*;

class LdapSecurityTest {
    @Test void secretRoundTripsWithRandomNonceAndNeverAppearsInSettingsJson() throws Exception {
        SecretCipher cipher = new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        String encrypted = cipher.encrypt("bind-password");
        assertThat(encrypted).doesNotContain("bind-password");
        assertThat(cipher.decrypt(encrypted)).isEqualTo("bind-password");
        assertThat(cipher.encrypt("bind-password")).isNotEqualTo(encrypted);
        LdapSettings settings = new LdapSettings();
        settings.setBindPassword("bind-password");
        assertThat(new ObjectMapper().writeValueAsString(settings)).doesNotContain("bind-password", "bindPassword\"");
    }

    @Test void missingKeyCannotPersistSecret() {
        assertThatThrownBy(() -> new SecretCipher("").encrypt("secret")).isInstanceOf(IllegalStateException.class);
    }

    @Test void tamperedCiphertextFailsClosed() {
        SecretCipher cipher = new SecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        byte[] bytes = Base64.getDecoder().decode(cipher.encrypt("secret"));
        bytes[bytes.length - 1] ^= 1;
        assertThatThrownBy(() -> cipher.decrypt(Base64.getEncoder().encodeToString(bytes)))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test void settingsRejectPlaintextAndUnboundedTimeouts() {
        LdapSettings settings = new LdapSettings();
        settings.setEnabled(true);
        settings.setUrl("ldap://directory.example:389");
        settings.setBaseDn("dc=example,dc=com");
        settings.setBindDn("cn=service,dc=example,dc=com");
        assertThatThrownBy(settings::validate).isInstanceOf(IllegalArgumentException.class);
        settings.setTlsMode("STARTTLS");
        settings.validate();
        settings.setReadTimeoutMs(300001);
        assertThatThrownBy(settings::validate).isInstanceOf(IllegalArgumentException.class);
    }
}
