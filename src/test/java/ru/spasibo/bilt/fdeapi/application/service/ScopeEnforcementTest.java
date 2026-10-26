package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.Test;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.*;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.*;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import ru.spasibo.bilt.fdeapi.domain.port.DispatcherPort;
import ru.spasibo.bilt.fdeapi.observability.metrics.ApiMetrics;
import ru.spasibo.bilt.fdeapi.util.rls.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

class ScopeEnforcementTest {
    @Test void deniedIdCannotReadUpdateDeleteOrPartiallyApplyBatch() {
        var repository = mock(PipelineRepository.class);
        var scope = mock(AccessScopeService.class);
        var service = new PipelineService(repository, scope, mock(ApiMetrics.class), mock(RlsFilterService.class), mock(RlsSpecificationBuilder.class));
        UUID allowed = UUID.randomUUID(), denied = UUID.randomUUID();
        doThrow(new AccessDeniedException("denied")).when(scope).requirePipeline(denied);
        assertThrows(AccessDeniedException.class, () -> service.getById(denied));
        assertThrows(AccessDeniedException.class, () -> service.update(denied, new UpdatePipelineRequest()));
        assertThrows(AccessDeniedException.class, () -> service.delete(denied));
        var request = BulkDatacenterRequest.builder().pipelineIds(List.of(allowed, denied)).datacenter("SP").build();
        assertThrows(AccessDeniedException.class, () -> service.bulkUpdateDatacenter(request));
        verifyNoInteractions(repository);
    }

    @Test void deniedScopeStopsManualTriggersSchedulesAndSessionStopBeforeProxy() {
        var dispatcher = mock(DispatcherPort.class);
        var repository = mock(PipelineRepository.class);
        var scope = mock(AccessScopeService.class);
        var sessions = mock(SessionService.class);
        UUID id = UUID.randomUUID();
        doThrow(new AccessDeniedException("denied")).when(scope).requirePipeline(id);
        doThrow(new AccessDeniedException("denied")).when(sessions).getById(id);
        var mapper = new ObjectMapper();
        var trigger = new TriggerProxyController(dispatcher, repository, sessions, mapper, scope);
        var schedule = new ScheduleProxyController(dispatcher, repository, mapper, scope);
        String body = "{\"pipelineId\":\"" + id + "\"}";
        assertThrows(AccessDeniedException.class, () -> trigger.manualTrigger(body));
        assertThrows(AccessDeniedException.class, () -> trigger.stopTrigger("{\"sessionId\":\""+id+"\"}"));
        assertThrows(AccessDeniedException.class, () -> schedule.createSchedule(body));
        assertThrows(AccessDeniedException.class, () -> schedule.getSchedule(id));
        assertThrows(AccessDeniedException.class, () -> schedule.updateSchedule(id, "{}"));
        assertThrows(AccessDeniedException.class, () -> schedule.deleteSchedule(id));
        verifyNoInteractions(dispatcher);
    }
}
