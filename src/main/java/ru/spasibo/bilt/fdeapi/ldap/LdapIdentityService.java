package ru.spasibo.bilt.fdeapi.ldap;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.exception.UserAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import java.util.*;

@Service @RequiredArgsConstructor
public class LdapIdentityService {
    private final UserRepository users;
    private final LdapSettingsRepository settings;
    private final TokenPort tokens;

    @Transactional
    public AuthUserData loginIdentity(DirectoryIdentity identity) {
        return loginIdentity(identity, null);
    }

    @Transactional
    public AuthUserData loginIdentity(DirectoryIdentity identity, String expectedConfiguration) {
        // The singleton row serializes first logins across API instances; unique ID index is the final guard.
        LdapSettingsEntity current = settings.lock().orElseThrow();
        if (expectedConfiguration != null && !expectedConfiguration.equals(current.getConfigJson()))
            throw new ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException("Настройки LDAP изменились. Повторите вход");
        UserEntity user = users.findByAuthSourceAndExternalId("LDAP", identity.externalId()).orElse(null);
        ensureLoginAvailable(identity.login(), user == null ? null : user.getId());
        if (user == null) {
            if (!identity.active()) throw new ru.spasibo.bilt.fdeapi.domain.exception.AccountNotActivatedException("Доменная учётная запись отключена");
            user = UserEntity.builder().authSource("LDAP").externalId(identity.externalId())
                    .login(identity.login()).password("!LDAP:" + UUID.randomUUID())
                    .activated(true).passwordChangeRequired(false).build();
        }
        applyDirectoryState(user, Optional.of(identity));
        user = users.saveAndFlush(user);
        return new AuthUserData(user.getId(), user.getLogin(), user.getPassword(), user.isActivated(), false, "LDAP");
    }

    boolean applyDirectoryState(UserEntity user, Optional<DirectoryIdentity> found) {
        boolean before = user.isActivated();
        boolean oldDisabled = user.isDirectoryDisabled();
        String oldLogin = user.getLogin(), oldName = user.getDisplayName(), oldEmail = user.getEmail();
        boolean disabled = found.isEmpty() || !found.get().active();
        found.ifPresent(identity -> {
            ensureLoginAvailable(identity.login(), user.getId());
            user.setLogin(identity.login());
            user.setDisplayName(identity.displayName());
            user.setEmail(identity.email());
        });
        user.setDirectoryDisabled(disabled);
        user.setActivated(!disabled && !user.isManualDisabled());
        if (!user.isActivated() && user.getId() != null) tokens.revokeRefreshToken(user.getId());
        return before != user.isActivated() || oldDisabled != disabled || !Objects.equals(oldLogin, user.getLogin())
                || !Objects.equals(oldName, user.getDisplayName()) || !Objects.equals(oldEmail, user.getEmail());
    }
    private void ensureLoginAvailable(String login, UUID ownId) {
        users.findByLoginIgnoreCase(login).ifPresent(collision -> {
            if (!Objects.equals(collision.getId(), ownId) || ownId == null)
                throw new UserAlreadyExistsException("Логин уже занят. Обратитесь к администратору");
        });
    }
}
