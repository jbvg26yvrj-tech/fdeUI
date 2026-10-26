package ru.spasibo.bilt.fdeapi.ldap;

import org.junit.jupiter.api.Test;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class LdapSettingsAccessTest {
    @Test void settingsDenyUsersWithoutActualAdminRoleEvenWithDelegatedPermission() {
        PermissionService permissions = mock(PermissionService.class);
        LdapSettingsService settings = mock(LdapSettingsService.class);
        LdapSyncService sync = mock(LdapSyncService.class);
        LdapSettingsController controller = new LdapSettingsController(settings, sync, permissions);
        when(permissions.currentUserHasRole("ADMIN")).thenReturn(false);
        assertThatThrownBy(controller::get).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.save(new LdapSettings())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> controller.test(new LdapSettings())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(controller::sync).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(controller::status).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(settings, sync);
    }
}
