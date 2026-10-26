package ru.spasibo.bilt.fdeapi.ldap;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.UserRepository;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import java.util.Objects;

@Service @RequiredArgsConstructor
public class LdapSettingsService {
    private final LdapSettingsRepository repository;
    private final UserRepository users;
    private final SecretCipher cipher;
    private final ObjectMapper mapper;
    private final LdapDirectory directory;

    public LdapSettings get() { return decode(entity()); }
    public boolean enabled() { return get().isEnabled(); }
    LdapSettingsEntity entity() { return repository.findById(1).orElseThrow(); }
    LdapSettings decode(LdapSettingsEntity entity) {
        try {
            LdapSettings settings = mapper.readValue(entity.getConfigJson(), LdapSettings.class);
            settings.setBindPasswordConfigured(entity.getEncryptedPassword() != null);
            return settings;
        } catch (Exception ex) { throw new IllegalStateException("Не удалось прочитать настройки LDAP"); }
    }
    String password(LdapSettingsEntity entity) {
        return entity.getEncryptedPassword() == null ? "" : cipher.decrypt(entity.getEncryptedPassword());
    }
    @Transactional
    public LdapSettings save(LdapSettings settings) {
        validate(settings);
        LdapSettingsEntity entity = repository.lock().orElseThrow();
        LdapSettings previous = decode(entity);
        if (users.existsByAuthSource("LDAP") && (!Objects.equals(previous.getUrl(), settings.getUrl())
                || !Objects.equals(previous.getBaseDn(), settings.getBaseDn())
                || !Objects.equals(previous.getIdAttribute(), settings.getIdAttribute())
                || !Objects.equals(previous.getDirectoryType(), settings.getDirectoryType())))
            throw new ValidationException("Нельзя заменить каталог с существующими доменными пользователями");
        if (settings.getBindPassword() != null && !settings.getBindPassword().isEmpty())
            entity.setEncryptedPassword(cipher.encrypt(settings.getBindPassword()));
        if ((settings.isEnabled() || settings.isSyncEnabled()) && entity.getEncryptedPassword() == null)
            throw new ValidationException("Укажите пароль служебной учётной записи LDAP");
        try {
            settings.setBindPasswordConfigured(entity.getEncryptedPassword() != null);
            entity.setConfigJson(mapper.writeValueAsString(settings));
        } catch (Exception ex) { throw new IllegalStateException("Не удалось сохранить настройки LDAP"); }
        repository.saveAndFlush(entity);
        return decode(entity);
    }
    public TestResult test(LdapSettings settings) {
        validate(settings);
        try {
            String secret = settings.getBindPassword();
            if (secret == null || secret.isEmpty()) secret = password(entity());
            directory.test(settings, secret);
            return new TestResult(true, "Подключение, bind и поиск LDAP выполнены успешно");
        } catch (DirectoryException | IllegalStateException ex) {
            return new TestResult(false, "Не удалось проверить LDAP: проверьте TLS, DN, права поиска и пароль");
        }
    }
    private void validate(LdapSettings settings) {
        try { settings.validate(); }
        catch (IllegalArgumentException ex) { throw new ValidationException(ex.getMessage()); }
    }
    public record TestResult(boolean success, String message) {}
}
