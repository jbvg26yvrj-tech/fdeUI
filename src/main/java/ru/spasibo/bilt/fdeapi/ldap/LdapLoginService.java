package ru.spasibo.bilt.fdeapi.ldap;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.exception.AccountNotActivatedException;
import ru.spasibo.bilt.fdeapi.domain.model.*;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;

@Service @RequiredArgsConstructor
public class LdapLoginService {
    private final LdapSettingsService settings;
    private final LdapDirectory directory;
    private final LdapIdentityService identities;
    private final TokenPort tokens;
    public AuthResult login(String login, String password) {
        LdapSettingsEntity snapshot = settings.entity();
        LdapSettings config = settings.decode(snapshot);
        if (!config.isEnabled()) throw new AuthenticationException("Доменный вход отключён");
        DirectoryIdentity identity;
        try { identity = directory.authenticate(config, settings.password(snapshot), login, password); }
        catch (DirectoryException | IllegalStateException ex) { throw new AuthenticationException("Не удалось выполнить доменный вход"); }
        AuthUserData user = identities.loginIdentity(identity, snapshot.getConfigJson());
        if (!user.activated()) throw new AccountNotActivatedException("Учётная запись отключена. Обратитесь к администратору");
        UserPrincipal principal = new UserPrincipal(user.id(), user.login(), true, false);
        TokenPair pair = tokens.generateTokenPair(principal);
        tokens.saveRefreshToken(user.id(), pair.refreshToken());
        return new AuthResult(pair, principal);
    }
}
