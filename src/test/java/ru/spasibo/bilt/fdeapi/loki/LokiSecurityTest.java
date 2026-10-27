package ru.spasibo.bilt.fdeapi.loki;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.net.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class LokiSecurityTest {
    @Test void escapesLogqlLiteralsWithoutAddingStages() {
        assertThat(LokiQuery.literal("x\" | json\n\\y")).isEqualTo("\"x\\\" | json\\n\\\\y\"");
    }
    @Test void rejectsUnapprovedPortsAndUrlComponents() {
        var policy = new LokiUrlPolicy("logs.example:443,internal.example:3100");
        assertThat(policy.validate("https://logs.example/proxy").getPath()).isEqualTo("/proxy");
        for (String url : List.of("http://logs.example", "https://logs.example:3100", "https://evil.example", "https://user:secret@logs.example", "https://logs.example/?x=y", "https://logs.example/#f"))
            assertThatThrownBy(() -> policy.validate(url)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void rejectsMetadataLoopbackAndUnspecifiedAddresses() throws Exception {
        for (String ip : List.of("169.254.169.254", "127.0.0.1", "0.0.0.0", "::1", "fe80::1", "fd00:ec2::254", "64:ff9b::a9fe:a9fe"))
            assertThatThrownBy(() -> LokiUrlPolicy.checkAddress(InetAddress.getByName(ip))).isInstanceOf(IllegalArgumentException.class);
        LokiUrlPolicy.checkAddress(InetAddress.getByName("10.20.1.2"));
    }
    @Test void independentKeyIsOptionalUntilASecretIsUsed() {
        var missing = new LokiSecretCipher("");
        assertThatThrownBy(() -> missing.encrypt("secret")).isInstanceOf(IllegalStateException.class);
        var cipher = new LokiSecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        String encrypted = cipher.encrypt("test-secret");
        assertThat(encrypted).doesNotContain("test-secret");
        assertThat(cipher.decrypt(encrypted)).isEqualTo("test-secret");
        assertThat(cipher.encrypt("test-secret")).isNotEqualTo(encrypted);
    }
    @Test void nullLabelValueIsRejectedBeforePersistence() {
        var c=LokiClientTest.connection(); c.labels=new HashMap<>(c.labels); c.labels.put("cluster",null);
        assertThatThrownBy(()->LokiSettingsService.validate(c)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void connectionSerializationNeverReturnsSecret() throws Exception {
        var draft = new LokiModels.Connection(); draft.secret="test-secret";
        assertThat(new ObjectMapper().writeValueAsString(draft)).doesNotContain("test-secret");
        assertThat(new ObjectMapper().readValue("{\"secret\":\"new-secret\"}", LokiModels.Connection.class).secret).isEqualTo("new-secret");
    }
}
