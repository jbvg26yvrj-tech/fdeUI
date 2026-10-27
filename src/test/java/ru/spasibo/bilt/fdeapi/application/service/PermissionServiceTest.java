package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.Test;
import ru.spasibo.bilt.fdeapi.domain.port.*;
import ru.spasibo.bilt.fdeapi.domain.model.RoleData;
import java.time.LocalDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PermissionServiceTest {
    final UUID user = UUID.randomUUID(), role = UUID.randomUUID();
    final RolePort roles = mock(RolePort.class);
    final ResourcePort resources = mock(ResourcePort.class);
    final PermissionService service = new PermissionService(roles, resources, mock(CurrentUserPort.class));

    void client(Set<String> codes) {
        when(roles.findRoleCodesByUserId(user)).thenReturn(Set.of("CUSTOM"));
        when(roles.findRoleIdsByUserId(user)).thenReturn(Set.of(role));
        when(roles.findById(role)).thenReturn(Optional.of(new RoleData(role, "CUSTOM", "Custom", "", false, LocalDateTime.now(), codes)));
    }
    @Test void clientGetsStandardReadsWithoutAnyResourceAssignments() {
        client(Set.of(" dwh "));
        for (String read : Set.of("api.pipelines.list", "api.pipelines.get", "api.sessions.list", "api.sessions.get", "api.analytics.read", "api.schedules.get", "page.analytics")) {
            assertTrue(service.hasPermission(user, read), read);
            assertTrue(service.getUserPermissions(user).resourceCodes().contains(read), read);
        }
        verifyNoInteractions(resources);
    }
    @Test void legacyWriteAndAdminGrantsCannotElevateClient() {
        client(Set.of("PC"));
        var forbidden = Set.of("api.pipelines.create", "api.pipelines.update", "api.pipelines.delete", "api.triggers.manual", "api.triggers.stop", "api.schedules.create", "api.schedules.update", "api.schedules.delete", "api.permissions.view", "api.users.list", "page.users", "page.logs", "api.logs.read");
        when(resources.findResourceCodesByRoleIds(Set.of(role))).thenReturn(forbidden);
        for (String code : forbidden) assertFalse(service.hasPermission(user, code), code);
        verify(resources, never()).findResourceCodesByRoleIds(any());
    }
    @Test void noScopeCannotUseEvenLegacyReads() {
        client(Set.of("  "));
        when(resources.findResourceCodesByRoleIds(Set.of(role))).thenReturn(Set.of("api.pipelines.list"));
        assertFalse(service.hasPermission(user, "api.pipelines.list"));
        assertEquals(Set.of("api.user-settings.manage", "api.user-context.get"), service.getUserPermissions(user).resourceCodes());
    }
    @Test void adminGetsRegisteredResourcesWithoutExplicitAssignments() {
        when(roles.findRoleCodesByUserId(user)).thenReturn(Set.of("ADMIN"));
        when(resources.findAllCodes()).thenReturn(Set.of("api.pipelines.create", "api.triggers.stop", "api.schedules.update", "api.users.list"));
        for (String code : resources.findAllCodes()) assertTrue(service.hasPermission(user, code), code);
        assertTrue(service.hasPermission(user, "api.schedules.get"));
        verify(roles, never()).findRoleIdsByUserId(user);
    }
    @Test void roleWithNoScopeDoesNotCancelAnotherRolesScope() {
        client(Set.of());
        UUID second = UUID.randomUUID();
        when(roles.findRoleIdsByUserId(user)).thenReturn(Set.of(role, second));
        when(roles.findById(second)).thenReturn(Optional.of(new RoleData(second, "SECOND", "Second", "", false, LocalDateTime.now(), Set.of("OFD"))));
        assertTrue(service.hasPermission(user, "api.pipelines.list"));
    }
}
