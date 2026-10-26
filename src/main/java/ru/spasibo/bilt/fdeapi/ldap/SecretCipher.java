package ru.spasibo.bilt.fdeapi.ldap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

@Component
public class SecretCipher {
    private final String configuredKey;
    private final SecureRandom random = new SecureRandom();
    public SecretCipher(@Value("${FDE_LDAP_ENCRYPTION_KEY:}") String key) { configuredKey = key; }
    private SecretKeySpec key() {
        try {
            byte[] bytes = Base64.getDecoder().decode(configuredKey);
            if (bytes.length != 32) throw new IllegalArgumentException();
            return new SecretKeySpec(bytes, "AES");
        } catch (Exception ex) { throw new IllegalStateException("Не настроен ключ шифрования LDAP"); }
    }
    public String encrypt(String secret) {
        try {
            byte[] nonce = new byte[12]; random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, nonce));
            byte[] ciphertext = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            byte[] payload = Arrays.copyOf(nonce, nonce.length + ciphertext.length);
            System.arraycopy(ciphertext, 0, payload, nonce.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception ex) { throw new IllegalStateException("Не удалось зашифровать пароль LDAP"); }
    }
    public String decrypt(String payload) {
        try {
            byte[] bytes = Base64.getDecoder().decode(payload);
            if (bytes.length < 29) throw new IllegalArgumentException();
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Arrays.copyOf(bytes, 12)));
            return new String(cipher.doFinal(bytes, 12, bytes.length - 12), StandardCharsets.UTF_8);
        } catch (Exception ex) { throw new IllegalStateException("Не удалось расшифровать пароль LDAP"); }
    }
}
