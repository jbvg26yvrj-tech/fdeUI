package ru.spasibo.bilt.fdeapi.ldap;

import org.junit.jupiter.api.*;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import ru.spasibo.bilt.fdeapi.domain.exception.UserAlreadyExistsException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LdapIdentityServiceTest {
    UserRepository users = mock(UserRepository.class);
    LdapSettingsRepository settings = mock(LdapSettingsRepository.class);
    TokenPort tokens = mock(TokenPort.class);
    LdapIdentityService service = new LdapIdentityService(users, settings, tokens);
    DirectoryIdentity alice = new DirectoryIdentity("stable-id", "alice", "Alice", "alice@example.com", true);

    @BeforeEach void defaults() {
        when(settings.lock()).thenReturn(Optional.of(new LdapSettingsEntity()));
        when(users.saveAndFlush(any())).thenAnswer(call -> {
            UserEntity user = call.getArgument(0);
            if (user.getId() == null) user.setId(UUID.randomUUID());
            return user;
        });
    }
    @Test void firstLoginCreatesActiveDomainIdentityWithoutPasswordChange() {
        var result = service.loginIdentity(alice);
        assertThat(result.authSource()).isEqualTo("LDAP");
        assertThat(result.activated()).isTrue();
        assertThat(result.passwordChangeRequired()).isFalse();
        assertThat(result.passwordHash()).startsWith("!LDAP:");
    }
    @Test void collisionNeverLinksExistingLocalUser() {
        when(users.findByLoginIgnoreCase("alice")).thenReturn(Optional.of(UserEntity.builder().login("alice").build()));
        assertThatThrownBy(() -> service.loginIdentity(alice)).isInstanceOf(UserAlreadyExistsException.class);
    }
    @Test void renameUsesStableIdAndManualBlockSurvivesDirectoryReactivation() {
        UUID id = UUID.randomUUID();
        UserEntity user = UserEntity.builder().id(id).login("old-login").authSource("LDAP")
                .externalId("stable-id").manualDisabled(true).directoryDisabled(true).activated(false).build();
        when(users.findByAuthSourceAndExternalId("LDAP", "stable-id")).thenReturn(Optional.of(user));
        var result = service.loginIdentity(alice);
        assertThat(result.id()).isEqualTo(id);
        assertThat(result.login()).isEqualTo("alice");
        assertThat(result.activated()).isFalse();
        assertThat(user.isDirectoryDisabled()).isFalse();
    }
    @Test void missingDirectoryIdentityDeactivatesAndRevokesRefresh() {
        UserEntity user = UserEntity.builder().id(UUID.randomUUID()).authSource("LDAP").activated(true).build();
        service.applyDirectoryState(user, Optional.empty());
        assertThat(user.isActivated()).isFalse();
        assertThat(user.isDirectoryDisabled()).isTrue();
        verify(tokens).revokeRefreshToken(user.getId());
    }
}
