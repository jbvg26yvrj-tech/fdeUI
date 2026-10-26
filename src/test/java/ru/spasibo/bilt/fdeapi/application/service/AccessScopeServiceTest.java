package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.Test;
import java.util.Set;
import java.util.UUID;
import java.util.Optional;
import java.time.LocalDateTime;
import ru.spasibo.bilt.fdeapi.domain.port.*;
import ru.spasibo.bilt.fdeapi.domain.model.RoleData;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.util.rls.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class AccessScopeServiceTest {
    @Test void eitherParticipantMatchesExactlyIgnoringCaseAndOuterWhitespace() {
        assertTrue(AccessScopeService.matches(Set.of("DWH"), " dwh ", "PC"));
        assertTrue(AccessScopeService.matches(Set.of("DWH"), "OFD", "DWH"));
        assertFalse(AccessScopeService.matches(Set.of("DWH"), "PC", "OFD"));
        assertFalse(AccessScopeService.matches(Set.of("DWH"), "DWH-TEST", "PC"));
    }
    @Test void multipleScopesUnionAndEmptyScopesDeny() {
        assertTrue(AccessScopeService.matches(Set.of("DWH", "PC"), "PC", "OFD"));
        assertFalse(AccessScopeService.matches(Set.of(), "DWH", "PC"));
    }

    @Test void currentRoleAssignmentsUnionAndRoleNameDoesNotGrantScope() {
        var current = mock(CurrentUserPort.class);
        var roles = mock(RolePort.class);
        UUID user = UUID.randomUUID(), one = UUID.randomUUID(), two = UUID.randomUUID();
        when(current.getCurrentUserId()).thenReturn(Optional.of(user));
        when(roles.findRoleIdsByUserId(user)).thenReturn(Set.of(one, two));
        when(roles.findById(one)).thenReturn(Optional.of(new RoleData(one, "CUSTOM", "Custom", "", false, LocalDateTime.now(), Set.of(" dwh "))));
        when(roles.findById(two)).thenReturn(Optional.of(new RoleData(two, "PC", "PC", "", false, LocalDateTime.now(), Set.of("pc"))));
        var policy = new AccessScopeService(current, roles, mock(PipelineRepository.class), mock(RlsFilterService.class), mock(RlsSpecificationBuilder.class));
        assertEquals(Set.of("DWH", "PC"), policy.clientCodes());
        assertDoesNotThrow(() -> policy.requireParticipants("OFD", "dwh"));
        assertThrows(AccessDeniedException.class, () -> policy.requireParticipants("LKPP", "SDP"));
        when(roles.findById(two)).thenReturn(Optional.of(new RoleData(two, "PC", "PC", "", false, LocalDateTime.now(), Set.of())));
        assertThrows(AccessDeniedException.class, () -> policy.requireParticipants("PC", "SDP"));
    }

    @Test void adminBypassesClientScopesButAnonymousFailsClosed() {
        var current = mock(CurrentUserPort.class);
        var roles = mock(RolePort.class);
        UUID user = UUID.randomUUID();
        when(current.getCurrentUserId()).thenReturn(Optional.of(user));
        when(roles.findRoleCodesByUserId(user)).thenReturn(Set.of("ADMIN"));
        var policy = new AccessScopeService(current, roles, mock(PipelineRepository.class), mock(RlsFilterService.class), mock(RlsSpecificationBuilder.class));
        assertDoesNotThrow(() -> policy.requireParticipants("ANY", "OTHER"));
        verify(roles, never()).findRoleIdsByUserId(user);
        when(current.getCurrentUserId()).thenReturn(Optional.empty());
        assertThrows(AccessDeniedException.class, policy::pipelines);
    }
}
