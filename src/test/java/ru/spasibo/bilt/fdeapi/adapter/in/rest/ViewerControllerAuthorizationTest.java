package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.security.authorization.method.AuthorizationManagerBeforeMethodInterceptor;
import org.springframework.security.authorization.method.PreAuthorizeAuthorizationManager;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.spasibo.bilt.fdeapi.application.service.*;
import ru.spasibo.bilt.fdeapi.domain.port.*;
import ru.spasibo.bilt.fdeapi.domain.model.RoleData;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import java.time.LocalDateTime;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ViewerControllerAuthorizationTest {
    final UUID user = UUID.randomUUID(), role = UUID.randomUUID(), pipeline = UUID.randomUUID();
    final RolePort roles = mock(RolePort.class);
    final ResourcePort resources = mock(ResourcePort.class);
    final CurrentUserPort current = mock(CurrentUserPort.class);
    final DispatcherPort dispatcher = mock(DispatcherPort.class);
    final AccessScopeService scope = mock(AccessScopeService.class);

    <T> T secured(T target) {
        when(current.getCurrentUserId()).thenReturn(Optional.of(user));
        when(roles.findRoleCodesByUserId(user)).thenReturn(Set.of("CLIENT"));
        when(roles.findRoleIdsByUserId(user)).thenReturn(Set.of(role));
        when(roles.findById(role)).thenReturn(Optional.of(new RoleData(role, "CLIENT", "Client", "", false, LocalDateTime.now(), Set.of("PC"))));
        when(resources.findResourceCodesByRoleIds(Set.of(role))).thenReturn(Set.of("api.schedules.create", "api.schedules.delete", "api.triggers.manual", "api.triggers.stop"));
        var factory = new DefaultListableBeanFactory();
        factory.registerSingleton("permissionService", new PermissionService(roles, resources, current));
        var handler = new DefaultMethodSecurityExpressionHandler();
        var context = new org.springframework.context.support.GenericApplicationContext(factory);
        context.refresh();
        handler.setApplicationContext(context);
        var manager = new PreAuthorizeAuthorizationManager();
        manager.setExpressionHandler(handler);
        var proxy = new ProxyFactory(target);
        proxy.setProxyTargetClass(true);
        proxy.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize(manager));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("client", "unused", List.of()));
        return (T) proxy.getProxy();
    }
    @org.junit.jupiter.api.AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void schedulesEnforceScopeBeforeProxyAndRejectLegacyMutationGrants() {
        var controller = secured(new ScheduleProxyController(dispatcher, mock(PipelineRepository.class), new ObjectMapper(), scope));
        controller.getSchedule(pipeline);
        verify(dispatcher).proxyGet("/api/v1/schedules/" + pipeline);
        reset(dispatcher);
        doThrow(new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("denied")).when(scope).requirePipeline(pipeline);
        assertThrows(ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException.class, () -> controller.getSchedule(pipeline));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.createSchedule("{}"));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.updateSchedule(pipeline, "{}"));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.deleteSchedule(pipeline));
        verifyNoInteractions(dispatcher);
    }
    @Test void adminCanMutateSchedules() {
        var controller = secured(new ScheduleProxyController(dispatcher, mock(PipelineRepository.class), new ObjectMapper(), scope));
        when(roles.findRoleCodesByUserId(user)).thenReturn(Set.of("ADMIN"));
        controller.deleteSchedule(pipeline);
        verify(dispatcher).proxyDelete("/api/v1/schedules/" + pipeline);
    }
    @Test void legacyTriggerGrantsNeverStartOrStopClientExecution() {
        var sessions = mock(SessionService.class);
        var controller = secured(new TriggerProxyController(dispatcher, mock(PipelineRepository.class), sessions, new ObjectMapper(), scope));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.manualTrigger("{}"));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.stopTrigger("{}"));
        verifyNoInteractions(dispatcher, sessions, scope);
    }
    @Test void pipelineMutationsRequireAdminEvenWithLegacyGrants() {
        var pipelines = mock(PipelineService.class);
        var controller = secured(new PipelineController(pipelines));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.create(null));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.update(pipeline, null));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> controller.delete(pipeline));
        verifyNoInteractions(pipelines);
        when(roles.findRoleCodesByUserId(user)).thenReturn(Set.of("ADMIN"));
        controller.delete(pipeline);
        verify(pipelines).delete(pipeline);
    }

}
