package ru.spasibo.bilt.fdeapi.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.ProcessedFileResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.SessionPageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.SessionResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.TaskSessionResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.SessionRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.SessionSpecifications;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.ProcessedFileEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.TaskSessionEntity;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;
import ru.spasibo.bilt.fdeapi.domain.exception.SessionNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.model.ResourceDefinition;
import ru.spasibo.bilt.fdeapi.util.rls.RlsFilterService;
import ru.spasibo.bilt.fdeapi.util.rls.RlsSpecificationBuilder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SessionService")
class SessionServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private PipelineRepository pipelineRepository;

    @Mock
    private RlsFilterService rlsFilterService;

    @Mock
    private RlsSpecificationBuilder rlsSpecificationBuilder;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private AccessScopeService accessScopeService;

    @InjectMocks
    private SessionService sessionService;

    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final UUID PIPELINE_ID = UUID.randomUUID();
    private static final String PIPELINE_NAME = "test-pipeline";
    private static final String LOGIN = "test-user";
    private static final LocalDateTime NOW = LocalDateTime.now();

    private PipelineSessionEntity buildSessionEntity() {
        PipelineSessionEntity entity = new PipelineSessionEntity();
        entity.setId(SESSION_ID);
        entity.setPipelineId(PIPELINE_ID);
        entity.setReplicaId("replica-1");
        entity.setStartDt(NOW);
        entity.setStatus("ACTIVE");
        entity.setErrorMessage(null);
        entity.setCreatedAt(NOW);
        entity.setUpdatedAt(NOW);

        TaskSessionEntity task = new TaskSessionEntity();
        task.setId(1L);
        task.setPipelineSession(entity);
        task.setTaskOrder((short) 1);
        task.setTypeCode("SftpDownloadTask");
        task.setIsDone(false);
        task.setCreatedAt(NOW);
        task.setUpdatedAt(NOW);

        entity.setTaskSessions(new ArrayList<>(List.of(task)));
        return entity;
    }

    private PipelineEntity buildPipelineEntity() {
        return PipelineEntity.builder()
                .id(PIPELINE_ID)
                .pipelineName(PIPELINE_NAME)
                .clientFrom("pc")
                .clientTo("dwh")
                .primaryDatacenter("DC1")
                .tasks(new ArrayList<>())
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();
    }

    private void mockSecurityContext() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn(LOGIN);
        SecurityContextHolder.setContext(securityContext);
    }

    private void mockNoRlsFilter() {
        when(accessScopeService.sessions()).thenReturn(Specification.allOf());
    }

    @Nested
    @DisplayName("getById")
    class GetById {

        @Test
        @DisplayName("should return SessionResponse with pipelineName when session and pipeline exist")
        void getById_found() {
            mockNoRlsFilter();

            PipelineSessionEntity session = buildSessionEntity();
            PipelineEntity pipeline = buildPipelineEntity();

            when(sessionRepository.findOne(any(Specification.class))).thenReturn(Optional.of(session));
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(pipeline));

            SessionResponse response = sessionService.getById(SESSION_ID);

            assertThat(response.getId()).isEqualTo(SESSION_ID);
            assertThat(response.getPipelineId()).isEqualTo(PIPELINE_ID);
            assertThat(response.getPipelineName()).isEqualTo(PIPELINE_NAME);
            assertThat(response.getStatus()).isEqualTo("ACTIVE");
            assertThat(response.getReplicaId()).isEqualTo("replica-1");
            assertThat(response.getErrorMessage()).isNull();
            assertThat(response.getTasks()).hasSize(1);
            TaskSessionResponse taskResponse = response.getTasks().get(0);
            assertThat(taskResponse.getId()).isEqualTo(1L);
            assertThat(taskResponse.getTypeCode()).isEqualTo("SftpDownloadTask");
            assertThat(taskResponse.getIsDone()).isFalse();
            assertThat(taskResponse.getProcessedFiles()).isEmpty();
            assertThat(taskResponse.getTotalFiles()).isZero();
            assertThat(taskResponse.getTotalBytes()).isZero();
            assertThat(response.getTotalFiles()).isZero();
            assertThat(response.getTotalBytes()).isZero();
        }

        @Test
        @DisplayName("should throw SessionNotFoundException when session does not exist")
        void getById_notFound() {
            mockNoRlsFilter();
            UUID unknownId = UUID.randomUUID();

            when(sessionRepository.findOne(any(Specification.class))).thenReturn(Optional.empty());

            assertThatThrownBy(() -> sessionService.getById(unknownId))
                    .isInstanceOf(SessionNotFoundException.class)
                    .hasMessageContaining(unknownId.toString());
        }

        @Test
        @DisplayName("should return pipelineName = null when pipeline was deleted")
        void getById_pipelineDeleted() {
            mockNoRlsFilter();

            PipelineSessionEntity session = buildSessionEntity();

            when(sessionRepository.findOne(any(Specification.class))).thenReturn(Optional.of(session));
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.empty());

            SessionResponse response = sessionService.getById(SESSION_ID);

            assertThat(response.getPipelineName()).isNull();
            assertThat(response.getPipelineId()).isEqualTo(PIPELINE_ID);
        }

        @Test
        @DisplayName("should return processed files with totals when task has files")
        void getById_withProcessedFiles() {
            mockNoRlsFilter();

            PipelineSessionEntity session = buildSessionEntity();
            TaskSessionEntity task = session.getTaskSessions().get(0);

            ProcessedFileEntity file1 = new ProcessedFileEntity();
            file1.setId(10L);
            file1.setTaskSession(task);
            file1.setFileName("output.csv");
            file1.setSourceFileName("data.csv");
            file1.setFileSize(1024L);
            file1.setStatus("SUCCESS");
            file1.setCreatedAt(NOW);

            ProcessedFileEntity file2 = new ProcessedFileEntity();
            file2.setId(11L);
            file2.setTaskSession(task);
            file2.setFileName("report.xlsx");
            file2.setSourceFileName("report_src.xlsx");
            file2.setFileSize(2048L);
            file2.setStatus("FAILED");
            file2.setErrorMessage("Connection timeout");
            file2.setCreatedAt(NOW);

            task.setProcessedFiles(new ArrayList<>(List.of(file1, file2)));

            PipelineEntity pipeline = buildPipelineEntity();

            when(sessionRepository.findOne(any(Specification.class))).thenReturn(Optional.of(session));
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(pipeline));

            SessionResponse response = sessionService.getById(SESSION_ID);

            // Session-level totals
            assertThat(response.getTotalFiles()).isEqualTo(2);
            assertThat(response.getTotalBytes()).isEqualTo(3072L);

            // Task-level totals
            TaskSessionResponse taskResponse = response.getTasks().get(0);
            assertThat(taskResponse.getTotalFiles()).isEqualTo(2);
            assertThat(taskResponse.getTotalBytes()).isEqualTo(3072L);

            // Processed files content
            assertThat(taskResponse.getProcessedFiles()).hasSize(2);

            ProcessedFileResponse fileResp1 = taskResponse.getProcessedFiles().get(0);
            assertThat(fileResp1.getFileName()).isEqualTo("output.csv");
            assertThat(fileResp1.getSourceFileName()).isEqualTo("data.csv");
            assertThat(fileResp1.getFileSize()).isEqualTo(1024L);
            assertThat(fileResp1.getStatus()).isEqualTo("SUCCESS");
            assertThat(fileResp1.getErrorMessage()).isNull();

            ProcessedFileResponse fileResp2 = taskResponse.getProcessedFiles().get(1);
            assertThat(fileResp2.getFileName()).isEqualTo("report.xlsx");
            assertThat(fileResp2.getStatus()).isEqualTo("FAILED");
            assertThat(fileResp2.getErrorMessage()).isEqualTo("Connection timeout");
        }
    }

    @Nested
    @DisplayName("getAll")
    class GetAll {

        @Test
        @DisplayName("should filter by pipelineId")
        @SuppressWarnings("unchecked")
        void getAll_withPipelineIdFilter() {
            mockSecurityContext();
            mockNoRlsFilter();

            PipelineSessionEntity session = buildSessionEntity();
            Page<PipelineSessionEntity> page = new PageImpl<>(List.of(session), PageRequest.of(0, 20), 1);
            PipelineEntity pipeline = buildPipelineEntity();

            when(sessionRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
            when(pipelineRepository.findAllById(anyCollection())).thenReturn(List.of(pipeline));

            PagedResponse<SessionPageResponse> response = sessionService.getAll(
                    0, 20, null, null, PIPELINE_ID, null, null, null, null, null, null, null);

            assertThat(response.getContent()).hasSize(1);
            SessionPageResponse pageResponse = response.getContent().get(0);
            assertThat(pageResponse.getPipelineId()).isEqualTo(PIPELINE_ID);
            assertThat(pageResponse.getPipelineName()).isEqualTo(PIPELINE_NAME);
            assertThat(pageResponse.getReplicaId()).isEqualTo("replica-1");
            assertThat(pageResponse.getErrorMessage()).isNull();
            verify(sessionRepository).findAll(any(Specification.class), any(Pageable.class));
        }

        @Test
        @DisplayName("should filter by status")
        @SuppressWarnings("unchecked")
        void getAll_withStatusFilter() {
            mockSecurityContext();
            mockNoRlsFilter();

            Page<PipelineSessionEntity> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0);

            when(sessionRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
            when(pipelineRepository.findAllById(anyCollection())).thenReturn(Collections.emptyList());

            PagedResponse<SessionPageResponse> response = sessionService.getAll(
                    0, 20, null, null, null, "ACTIVE", null, null, null, null, null, null);

            assertThat(response.getContent()).isEmpty();
            verify(sessionRepository).findAll(any(Specification.class), any(Pageable.class));
        }

        @Test
        @DisplayName("should throw PipelineValidationException for invalid status")
        void getAll_invalidStatus_throwsValidation() {
            mockSecurityContext();

            assertThatThrownBy(() -> sessionService.getAll(
                    0, 20, null, null, null, "INVALID_STATUS", null, null, null, null, null, null))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Invalid session status: 'INVALID_STATUS'");
        }
    }
}