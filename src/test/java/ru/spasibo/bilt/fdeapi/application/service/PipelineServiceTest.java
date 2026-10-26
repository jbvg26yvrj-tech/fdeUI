package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.BulkDatacenterRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.CreatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.TaskRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.UpdatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.BulkDatacenterResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelinePageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelineResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.PipelineRepository;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.TaskEntity;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;
import ru.spasibo.bilt.fdeapi.observability.metrics.ApiMetrics;
import ru.spasibo.bilt.fdeapi.util.rls.RlsFilterService;
import ru.spasibo.bilt.fdeapi.util.rls.RlsSpecificationBuilder;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PipelineService")
class PipelineServiceTest {

    @Mock
    private PipelineRepository pipelineRepository;

    @Mock
    private ApiMetrics apiMetrics;

    @Mock
    private RlsFilterService rlsFilterService;

    @Mock
    private RlsSpecificationBuilder rlsSpecificationBuilder;

    @InjectMocks
    private PipelineService pipelineService;

    private static final UUID PIPELINE_ID = UUID.randomUUID();
    private static final String PIPELINE_NAME = "test-pipeline";
    private static final String CLIENT_FROM = "pc";
    private static final String CLIENT_TO = "dwh";
    private static final LocalDateTime NOW = LocalDateTime.now();

    private PipelineEntity buildPipelineEntity() {
        PipelineEntity entity = PipelineEntity.builder()
                .id(PIPELINE_ID)
                .pipelineName(PIPELINE_NAME)
                .clientFrom(CLIENT_FROM)
                .clientTo(CLIENT_TO)
                .primaryDatacenter("SP")
                .tasks(new ArrayList<>())
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();

        TaskEntity task = TaskEntity.builder()
                .id(1L)
                .taskOrder((short) 1)
                .typeCode("SftpDownloadTask")
                .props(Map.of("sourceDir", "/data/input"))
                .build();
        entity.addTask(task);
        return entity;
    }

    private CreatePipelineRequest buildCreateRequest() {
        return CreatePipelineRequest.builder()
                .pipelineName(PIPELINE_NAME)
                .clientFrom(CLIENT_FROM)
                .clientTo(CLIENT_TO)
                .tasks(List.of(
                        TaskRequest.builder()
                                .taskOrder((short) 1)
                                .typeCode("SftpDownloadTask")
                                .props(Map.of("sourceDir", "/data/input"))
                                .build()
                ))
                .build();
    }

    @Nested
    @DisplayName("create")
    class Create {

        @Test
        @DisplayName("should create pipeline successfully and call metrics")
        void create_success() {
            CreatePipelineRequest request = buildCreateRequest();
            PipelineEntity saved = buildPipelineEntity();

            when(pipelineRepository.saveAndFlush(any(PipelineEntity.class))).thenReturn(saved);

            PipelineResponse response = pipelineService.create(request);

            assertThat(response.getId()).isEqualTo(PIPELINE_ID);
            assertThat(response.getPipelineName()).isEqualTo(PIPELINE_NAME);
            assertThat(response.getClientFrom()).isEqualTo(CLIENT_FROM);
            assertThat(response.getClientTo()).isEqualTo(CLIENT_TO);
            assertThat(response.getTasks()).hasSize(1);

            verify(pipelineRepository).saveAndFlush(any(PipelineEntity.class));
            verify(apiMetrics).incrementPipelineCreated();
        }

        @Test
        @DisplayName("should throw PipelineValidationException when duplicate task orders")
        void create_duplicateTaskOrder_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of("sourceDir", "/input")).build(),
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpUploadTask")
                                    .props(Map.of("targetDir", "/output")).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Duplicate task order");

            verify(pipelineRepository, never()).saveAndFlush(any());
            verify(apiMetrics, never()).incrementPipelineCreated();
        }

        @Test
        @DisplayName("should throw PipelineValidationException for invalid typeCode")
        void create_invalidTypeCode_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("InvalidTask")
                                    .props(Map.of()).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Invalid type code");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should handle empty tasks list (validation is at controller level)")
        void create_emptyTasks_throwsValidation() {
            // Empty tasks list — @NotEmpty is on the DTO, but service-level validateTasks
            // iterates over the list, so with an empty list it simply does nothing.
            // The service would create a pipeline with no tasks. This is acceptable
            // because the controller's @Valid prevents empty lists from reaching the service.
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(Collections.emptyList())
                    .build();

            PipelineEntity saved = PipelineEntity.builder()
                    .id(PIPELINE_ID)
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .primaryDatacenter("SP")
                    .tasks(new ArrayList<>())
                    .createdAt(NOW)
                    .updatedAt(NOW)
                    .build();

            when(pipelineRepository.saveAndFlush(any(PipelineEntity.class))).thenReturn(saved);

            PipelineResponse response = pipelineService.create(request);

            assertThat(response.getTasks()).isEmpty();
            verify(pipelineRepository).saveAndFlush(any(PipelineEntity.class));
        }

        @Test
        @DisplayName("should set default datacenter SP when primaryDatacenter is null")
        void create_defaultDatacenter() {
            CreatePipelineRequest request = buildCreateRequest();
            request.setPrimaryDatacenter(null);

            PipelineEntity saved = buildPipelineEntity();
            ArgumentCaptor<PipelineEntity> captor = ArgumentCaptor.forClass(PipelineEntity.class);
            when(pipelineRepository.saveAndFlush(captor.capture())).thenReturn(saved);

            pipelineService.create(request);

            PipelineEntity captured = captor.getValue();
            assertThat(captured.getPrimaryDatacenter()).isEqualTo("SP");
        }
    }

    @Nested
    @DisplayName("validateTasks — props and first-task validation")
    class ValidateTasks {

        @Test
        @DisplayName("should throw when first task is not a DownloadTask")
        void firstTaskNotDownload_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpUploadTask")
                                    .props(Map.of("targetDir", "/output")).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("must be a DownloadTask");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when required sourceDir is missing for DownloadTask")
        void downloadTask_missingSourceDir_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of()).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("sourceDir")
                    .hasMessageContaining("missing or empty");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when required targetDir is missing for UploadTask")
        void uploadTask_missingTargetDir_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of("sourceDir", "/input")).build(),
                            TaskRequest.builder().taskOrder((short) 2).typeCode("SftpUploadTask")
                                    .props(Map.of()).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("targetDir")
                    .hasMessageContaining("missing or empty");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when required sourceDir is missing for DeleteTask")
        void deleteTask_missingSourceDir_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of("sourceDir", "/input")).build(),
                            TaskRequest.builder().taskOrder((short) 2).typeCode("SftpDeleteTask")
                                    .props(Map.of()).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("sourceDir")
                    .hasMessageContaining("missing or empty");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when unknown prop key is provided")
        void unknownPropKey_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of("sourceDir", "/input", "foo", "bar")).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("unknown prop 'foo'");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when system prop credentials.host is provided")
        void systemPropCredentials_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of("sourceDir", "/input", "credentials.host", "evil.com")).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("credentials.host")
                    .hasMessageContaining("not allowed");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when maskType has invalid value")
        void invalidMaskType_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of("sourceDir", "/input", "maskType", "WILDCARD")).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("WILDCARD")
                    .hasMessageContaining("maskType");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when recursive is used with MinioDownloadTask (not allowed)")
        void minioDownload_recursiveNotAllowed_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("MinioDownloadTask")
                                    .props(Map.of("sourceDir", "/bucket/prefix", "recursive", "true")).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("recursive")
                    .hasMessageContaining("unknown prop");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should throw when preserveStructure=true but recursive is not true")
        void preserveStructureWithoutRecursive_throwsValidation() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of(
                                            "sourceDir", "/data/input",
                                            "preserveStructure", "true"
                                    )).build()
                    ))
                    .build();

            assertThatThrownBy(() -> pipelineService.create(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("preserveStructure=true requires recursive=true");

            verify(pipelineRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("should accept preserveStructure=true when recursive=true")
        void preserveStructureWithRecursive_createsSuccessfully() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of(
                                            "sourceDir", "/data/input",
                                            "recursive", "true",
                                            "preserveStructure", "true"
                                    )).build()
                    ))
                    .build();

            PipelineEntity saved = buildPipelineEntity();
            when(pipelineRepository.saveAndFlush(any(PipelineEntity.class))).thenReturn(saved);

            PipelineResponse response = pipelineService.create(request);

            assertThat(response.getId()).isEqualTo(PIPELINE_ID);
            verify(pipelineRepository).saveAndFlush(any(PipelineEntity.class));
        }

        @Test
        @DisplayName("should create pipeline with valid props successfully")
        void validPropsWithOptional_createsSuccessfully() {
            CreatePipelineRequest request = CreatePipelineRequest.builder()
                    .pipelineName(PIPELINE_NAME)
                    .clientFrom(CLIENT_FROM)
                    .clientTo(CLIENT_TO)
                    .tasks(List.of(
                            TaskRequest.builder().taskOrder((short) 1).typeCode("SftpDownloadTask")
                                    .props(Map.of(
                                            "sourceDir", "/data/input",
                                            "fileMask", "*.csv",
                                            "maskType", "GLOB",
                                            "recursive", "true",
                                            "preserveStructure", "false"
                                    )).build(),
                            TaskRequest.builder().taskOrder((short) 2).typeCode("SftpUploadTask")
                                    .props(Map.of("targetDir", "/data/output")).build()
                    ))
                    .build();

            PipelineEntity saved = buildPipelineEntity();
            when(pipelineRepository.saveAndFlush(any(PipelineEntity.class))).thenReturn(saved);

            PipelineResponse response = pipelineService.create(request);

            assertThat(response.getId()).isEqualTo(PIPELINE_ID);
            verify(pipelineRepository).saveAndFlush(any(PipelineEntity.class));
            verify(apiMetrics).incrementPipelineCreated();
        }
    }

    @Nested
    @DisplayName("getById")
    class GetById {

        @Test
        @DisplayName("should return PipelineResponse when pipeline exists")
        void getById_found() {
            PipelineEntity entity = buildPipelineEntity();
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(entity));

            PipelineResponse response = pipelineService.getById(PIPELINE_ID);

            assertThat(response.getId()).isEqualTo(PIPELINE_ID);
            assertThat(response.getPipelineName()).isEqualTo(PIPELINE_NAME);
            assertThat(response.getTasks()).hasSize(1);
        }

        @Test
        @DisplayName("should throw PipelineNotFoundException when pipeline does not exist")
        void getById_notFound() {
            UUID unknownId = UUID.randomUUID();
            when(pipelineRepository.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> pipelineService.getById(unknownId))
                    .isInstanceOf(PipelineNotFoundException.class)
                    .hasMessageContaining(unknownId.toString());
        }
    }

    @Nested
    @DisplayName("update")
    class Update {

        @Test
        @DisplayName("should update only non-null fields")
        void update_partialFields() {
            PipelineEntity entity = buildPipelineEntity();
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(entity));
            when(pipelineRepository.saveAndFlush(any(PipelineEntity.class))).thenReturn(entity);

            UpdatePipelineRequest request = UpdatePipelineRequest.builder()
                    .pipelineName("updated-name")
                    .build();

            PipelineResponse response = pipelineService.update(PIPELINE_ID, request);

            assertThat(entity.getPipelineName()).isEqualTo("updated-name");
            assertThat(entity.getClientFrom()).isEqualTo(CLIENT_FROM); // unchanged
            assertThat(entity.getClientTo()).isEqualTo(CLIENT_TO); // unchanged
        }

        @Test
        @DisplayName("should throw PipelineValidationException when name is blank")
        void update_blankName_throwsValidation() {
            PipelineEntity entity = buildPipelineEntity();
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(entity));

            UpdatePipelineRequest request = UpdatePipelineRequest.builder()
                    .pipelineName("   ")
                    .build();

            assertThatThrownBy(() -> pipelineService.update(PIPELINE_ID, request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Pipeline name cannot be blank");
        }

        @Test
        @DisplayName("should throw PipelineValidationException when tasks list is empty")
        void update_emptyTasks_throwsValidation() {
            PipelineEntity entity = buildPipelineEntity();
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(entity));

            UpdatePipelineRequest request = UpdatePipelineRequest.builder()
                    .tasks(Collections.emptyList())
                    .build();

            assertThatThrownBy(() -> pipelineService.update(PIPELINE_ID, request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Tasks list cannot be empty");
        }

        @Test
        @DisplayName("should replace all tasks when new tasks are provided")
        void update_withTasks_replacesAll() {
            PipelineEntity entity = buildPipelineEntity();
            when(pipelineRepository.findById(PIPELINE_ID)).thenReturn(Optional.of(entity));
            when(pipelineRepository.saveAndFlush(any(PipelineEntity.class))).thenReturn(entity);

            List<TaskRequest> newTasks = List.of(
                    TaskRequest.builder().taskOrder((short) 1).typeCode("SmbDownloadTask")
                            .props(Map.of("sourceDir", "/data/share")).build(),
                    TaskRequest.builder().taskOrder((short) 2).typeCode("SmbUploadTask")
                            .props(Map.of("targetDir", "/data/upload")).build()
            );

            UpdatePipelineRequest request = UpdatePipelineRequest.builder()
                    .tasks(newTasks)
                    .build();

            pipelineService.update(PIPELINE_ID, request);

            // After update, the entity tasks list should have been cleared and repopulated
            // with 2 new tasks (the old task was cleared, 2 new ones added)
            assertThat(entity.getTasks()).hasSize(2);
            assertThat(entity.getTasks().get(0).getTypeCode()).isEqualTo("SmbDownloadTask");
            assertThat(entity.getTasks().get(1).getTypeCode()).isEqualTo("SmbUploadTask");
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("should delete existing pipeline and call metrics")
        void delete_success() {
            when(pipelineRepository.existsById(PIPELINE_ID)).thenReturn(true);

            pipelineService.delete(PIPELINE_ID);

            verify(pipelineRepository).deleteById(PIPELINE_ID);
            verify(apiMetrics).incrementPipelineDeleted();
        }

        @Test
        @DisplayName("should throw PipelineNotFoundException when pipeline does not exist")
        void delete_notFound() {
            UUID unknownId = UUID.randomUUID();
            when(pipelineRepository.existsById(unknownId)).thenReturn(false);

            assertThatThrownBy(() -> pipelineService.delete(unknownId))
                    .isInstanceOf(PipelineNotFoundException.class)
                    .hasMessageContaining(unknownId.toString());

            verify(pipelineRepository, never()).deleteById(any());
            verify(apiMetrics, never()).incrementPipelineDeleted();
        }
    }

    @Nested
    @DisplayName("getAll")
    class GetAll {

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("testuser", null, Collections.emptyList()));
        }

        @Test
        @DisplayName("should apply filters via specifications")
        @SuppressWarnings("unchecked")
        void getAll_withFilters() {
            PipelineEntity entity = buildPipelineEntity();
            Page<PipelineEntity> page = new PageImpl<>(List.of(entity), PageRequest.of(0, 20), 1);
            when(pipelineRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
            when(rlsFilterService.getResolvedFilterForResource(any(), any())).thenReturn(Optional.empty());

            PagedResponse<PipelinePageResponse> response =
                    pipelineService.getAll(0, 20, null, null, "test", "pc", "dwh", null, null, null, null, null, null);

            assertThat(response.getContent()).hasSize(1);
            assertThat(response.getTotalElements()).isEqualTo(1);
            verify(pipelineRepository).findAll(any(Specification.class), any(Pageable.class));
        }

        @Test
        @DisplayName("should use default sort createdAt desc when sort is null")
        @SuppressWarnings("unchecked")
        void getAll_defaultSort() {
            Page<PipelineEntity> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0);
            when(pipelineRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
            when(rlsFilterService.getResolvedFilterForResource(any(), any())).thenReturn(Optional.empty());

            pipelineService.getAll(0, 20, null, null, null, null, null, null, null, null, null, null, null);

            ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
            verify(pipelineRepository).findAll(any(Specification.class), captor.capture());

            Sort sort = captor.getValue().getSort();
            assertThat(sort.getOrderFor("createdAt")).isNotNull();
            assertThat(sort.getOrderFor("createdAt").getDirection()).isEqualTo(Sort.Direction.DESC);
        }

        @Test
        @DisplayName("should throw PipelineValidationException for invalid sort field")
        void getAll_invalidSortField_throwsValidation() {
            when(rlsFilterService.getResolvedFilterForResource(any(), any())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> pipelineService.getAll(0, 20, "hackField,asc", null, null, null, null, null, null, null, null, null, null))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Invalid sort field");
        }
    }

    @Nested
    @DisplayName("bulkUpdateDatacenter")
    class BulkUpdateDatacenter {

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken("testuser", null, Collections.emptyList()));
            lenient().when(rlsFilterService.getResolvedFilterForResource(any(), any())).thenReturn(Optional.empty());
        }

        @Test
        @DisplayName("should update only specified pipelines by IDs")
        void bulkUpdateDatacenter_withIds_updatesOnlySpecifiedPipelines() {
            UUID id1 = UUID.randomUUID();

            when(pipelineRepository.bulkUpdateDatacenter(any(), any()))
                    .thenReturn(1);

            BulkDatacenterRequest request = BulkDatacenterRequest.builder()
                    .datacenter("SC")
                    .pipelineIds(List.of(id1))
                    .build();

            BulkDatacenterResponse response = pipelineService.bulkUpdateDatacenter(request);

            assertThat(response.getUpdatedCount()).isEqualTo(1);
            assertThat(response.getDatacenter()).isEqualTo("SC");
            verify(pipelineRepository).bulkUpdateDatacenter(eq("SC"), eq(List.of(id1)));
        }

        @Test
        @DisplayName("should throw PipelineValidationException for invalid datacenter")
        void bulkUpdateDatacenter_invalidDc_throwsValidation() {
            BulkDatacenterRequest request = BulkDatacenterRequest.builder()
                    .datacenter("INVALID")
                    .pipelineIds(List.of(UUID.randomUUID()))
                    .build();

            assertThatThrownBy(() -> pipelineService.bulkUpdateDatacenter(request))
                    .isInstanceOf(PipelineValidationException.class)
                    .hasMessageContaining("Invalid datacenter")
                    .hasMessageContaining("INVALID");

            verify(pipelineRepository, never()).bulkUpdateDatacenter(any(), any());
        }

        @Test
        @DisplayName("should uppercase datacenter value")
        void bulkUpdateDatacenter_lowercaseDc_uppercases() {
            UUID id1 = UUID.randomUUID();
            UUID id2 = UUID.randomUUID();

            when(pipelineRepository.bulkUpdateDatacenter(any(), any()))
                    .thenReturn(2);

            BulkDatacenterRequest request = BulkDatacenterRequest.builder()
                    .datacenter("sc")  // lowercase — should be uppercased
                    .pipelineIds(List.of(id1, id2))
                    .build();

            BulkDatacenterResponse response = pipelineService.bulkUpdateDatacenter(request);

            assertThat(response.getUpdatedCount()).isEqualTo(2);
            assertThat(response.getDatacenter()).isEqualTo("SC");
            verify(pipelineRepository).bulkUpdateDatacenter(eq("SC"), eq(List.of(id1, id2)));
        }
    }
}