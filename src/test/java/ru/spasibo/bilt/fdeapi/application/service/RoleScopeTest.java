package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.Test;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.port.*;
import ru.spasibo.bilt.fdeapi.domain.model.*;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class RoleScopeTest {
    @Test void adapterNormalizesAndPersistsExplicitClientCodes() {
        var repo = mock(RoleRepository.class);
        var adapter = new RoleAdapter(repo, mock(RoleResourceRepository.class), mock(RoleUserRepository.class));
        UUID id = UUID.randomUUID();
        var entity = RoleEntity.builder().id(id).code("CUSTOM").build();
        when(repo.findById(id)).thenReturn(Optional.of(entity));
        when(repo.save(entity)).thenReturn(entity);
        assertEquals(Set.of("DWH", "PC"), adapter.updateClientCodes(id, Set.of(" dwh ", "pc", "DWH")).clientCodes());
        assertTrue(adapter.updateClientCodes(id, Set.of()).clientCodes().isEmpty());
    }

    @Test void omittedUpdatePreservesScopesAndEmptyUpdateClears() {
        var port = mock(RolePort.class);
        var service = new RoleService(port, mock(ResourcePort.class), mock(RoleRepository.class), mock(AuthUserPort.class));
        UUID id = UUID.randomUUID();
        var role = new RoleData(id, "CUSTOM", "name", "", false, null, Set.of("DWH"));
        when(port.findById(id)).thenReturn(Optional.of(role));
        when(port.update(id, "name", null)).thenReturn(role);
        assertEquals(Set.of("DWH"), service.update(id, "name", null, null).clientCodes());
        verify(port, never()).updateClientCodes(any(), any());
        when(port.updateClientCodes(id, Set.of())).thenReturn(new RoleData(id, "CUSTOM", "name", "", false, null, Set.of()));
        assertTrue(service.update(id, "name", null, Set.of()).clientCodes().isEmpty());
    }

    @Test void roleManagementPermissionWithoutAdminRoleCannotManageRoles() {
        var roles = mock(RolePort.class);
        var service = new PermissionService(roles, mock(ResourcePort.class), mock(CurrentUserPort.class));
        var user = new UserPrincipal(UUID.randomUUID(), "ordinary", true, false);
        when(roles.findRoleCodesByUserId(user.id())).thenReturn(Set.of("DWH"));
        assertThrows(AccessDeniedException.class, () -> service.requireAdmin(user));
        when(roles.findRoleCodesByUserId(user.id())).thenReturn(Set.of("ADMIN"));
        assertDoesNotThrow(() -> service.requireAdmin(user));
    }
}
