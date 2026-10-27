package ru.spasibo.bilt.fdeapi.loki;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.application.service.*;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.SessionRepository;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static ru.spasibo.bilt.fdeapi.loki.LokiModels.*;

class LokiServiceTest {
    final LokiSettingsService settings=mock(LokiSettingsService.class);
    final LokiClient client=mock(LokiClient.class);
    final AccessScopeService scope=mock(AccessScopeService.class);
    final SessionRepository sessions=mock(SessionRepository.class);
    final PermissionService permissions=mock(PermissionService.class);
    final LokiService service=new LokiService(settings,client,new LokiSessionAuthorization(scope,sessions),permissions);
    @Test void unauthorizedUserCannotListOrQuery() {
        assertThatThrownBy(service::connections).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(()->service.search(LokiClientTest.search(null,100))).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(client,settings);
    }
    @Test void readerMustChooseSessionAndCannotQueryForbiddenSession() {
        when(permissions.currentUserHasPermission("api.logs.read")).thenReturn(true);
        assertThatThrownBy(()->service.search(LokiClientTest.search(null,100))).isInstanceOf(AccessDeniedException.class);
        var c=LokiClientTest.connection();
        when(settings.required(any())).thenReturn(new LokiRepository.Stored(c,null));
        when(scope.sessions()).thenReturn(Specification.allOf());
        when(sessions.findOne(any(Specification.class))).thenReturn(Optional.empty());
        assertThatThrownBy(()->service.search(LokiClientTest.search(LokiClientTest.SESSION,100))).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(client);
    }
    @Test void allowedSessionStillUsesScopedResultFiltering() {
        when(permissions.currentUserHasPermission("api.logs.read")).thenReturn(true);
        var c=LokiClientTest.connection(); var saved=new LokiRepository.Stored(c,null);
        when(settings.required(any())).thenReturn(saved);
        when(scope.sessions()).thenReturn(Specification.allOf());
        var session=new ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity();
        session.setId(LokiClientTest.SESSION);
        when(sessions.findOne(any(Specification.class))).thenReturn(Optional.of(session));
        when(client.query(eq(saved),any(),eq(true))).thenReturn(new LogsResponse(List.of(),false,null));
        assertThat(service.search(LokiClientTest.search(LokiClientTest.SESSION,100)).entries()).isEmpty();
        verify(client).query(eq(saved),any(),eq(true));
    }
    @Test void adminMayReadGeneralLogsWithoutSeparatePermissionAssignment() {
        when(permissions.currentUserHasRole("ADMIN")).thenReturn(true);
        var c=LokiClientTest.connection(); var saved=new LokiRepository.Stored(c,null);
        when(settings.required(any())).thenReturn(saved);
        when(client.query(eq(saved),any(),eq(false))).thenReturn(new LogsResponse(List.of(),false,null));
        assertThat(service.search(LokiClientTest.search(null,100)).entries()).isEmpty();
        verifyNoInteractions(sessions);
    }
    @Test void nonAdminCannotManageOrTestConnections() {
        var controller=new LokiSettingsController(settings,permissions);
        assertThatThrownBy(controller::list).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(()->controller.test(LokiClientTest.connection())).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(()->controller.create(LokiClientTest.connection())).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(settings);
    }
    @Test void blankSecretPreservesCiphertextAndExplicitClearRemovesIt() {
        var repo=mock(LokiRepository.class);
        var cipher=new LokiSecretCipher(Base64.getEncoder().encodeToString(new byte[32]));
        var service=new LokiSettingsService(repo,cipher,client);
        var previous=LokiClientTest.connection(); previous.authType=AuthType.BEARER;
        String encrypted=cipher.encrypt("test-secret");
        when(repo.find(previous.id)).thenReturn(Optional.of(new LokiRepository.Stored(previous,encrypted)));
        var draft=LokiClientTest.connection(); draft.authType=AuthType.BEARER; draft.secret="";
        var result=service.save(previous.id,draft);
        assertThat(result.secret).isNull(); assertThat(result.secretConfigured).isTrue();
        verify(repo).save(draft,encrypted);
        draft.authType=AuthType.NONE;
        assertThat(service.save(previous.id,draft).secretConfigured).isTrue();
        draft.clearSecret=true;
        assertThat(service.save(previous.id,draft).secretConfigured).isFalse();
        verify(repo).save(draft,null);
    }
}
