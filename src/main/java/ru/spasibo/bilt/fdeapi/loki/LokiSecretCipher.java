package ru.spasibo.bilt.fdeapi.loki;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.*;
import java.nio.charset.StandardCharsets;

@Component
public class LokiSecretCipher {
    private final String configuredKey;
    private final SecureRandom random=new SecureRandom();
    public LokiSecretCipher(@Value("${FDE_LOKI_ENCRYPTION_KEY:}") String key) { configuredKey=key; }
    private SecretKeySpec key() {
        try {
            byte[] bytes=Base64.getDecoder().decode(configuredKey);
            if(bytes.length!=32) throw new IllegalArgumentException();
            return new SecretKeySpec(bytes,"AES");
        } catch(Exception e) { throw new IllegalStateException("Не настроен ключ шифрования Loki"); }
    }
    public String encrypt(String secret) {
        try {
            byte[] nonce=new byte[12]; random.nextBytes(nonce);
            var cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE,key(),new GCMParameterSpec(128,nonce));
            byte[] encrypted=cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            byte[] payload=Arrays.copyOf(nonce,nonce.length+encrypted.length);
            System.arraycopy(encrypted,0,payload,nonce.length,encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch(Exception e) { throw new IllegalStateException("Не удалось зашифровать секрет Loki; проверьте отдельный ключ"); }
    }
    public String decrypt(String payload) {
        try {
            byte[] bytes=Base64.getDecoder().decode(payload);
            if(bytes.length<29) throw new IllegalArgumentException();
            var cipher=Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,Arrays.copyOf(bytes,12)));
            return new String(cipher.doFinal(bytes,12,bytes.length-12),StandardCharsets.UTF_8);
        } catch(Exception e) { throw new IllegalStateException("Не удалось расшифровать секрет Loki; проверьте отдельный ключ"); }
    }
}
