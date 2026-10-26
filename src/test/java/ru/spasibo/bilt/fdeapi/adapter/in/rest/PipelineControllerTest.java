package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ru.spasibo.bilt.fdeapi.adapter.out.security.TokenServiceImpl;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import ru.spasibo.bilt.fdeapi.config.SecurityConfig;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.BulkDatacenterRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.CreatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.TaskRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.UpdatePipelineRequest;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.BulkDatacenterResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelinePageResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PipelineResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.TaskResponse;
import ru.spasibo.bilt.fdeapi.application.service.PipelineService;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PipelineController.class)
@Import(SecurityConfig.class)
@ActiveProfiles("test")
@WithMockUser
@DisplayName("PipelineController")
class PipelineControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private PipelineService pipelineService;

    @MockitoBean
    private TokenServiceImpl tokenServiceImpl;

    @MockitoBean(name = "permissionService")
    private PermissionService permissionService;

    private static final UUID PIPELINE_ID = UUID.randomUUID();
    private static final LocalDateTime NOW = LocalDateTime.now();

    @BeforeEach
    void setUp() {
        when(permissionService.currentUserHasPermission(anyString())).thenReturn(true);
        when(permissionService.currentUserHasRole(anyString())).thenReturn(true);
    }

    private PipelineResponse buildPipelineResponse() {
        return PipelineResponse.builder()
                .id(PIPELINE_ID)
                .pipelineName("test-pipeline")
                .clientFrom("pc")
                .clientTo("dwh")
                .primaryDatacenter("DC1")
                .tasks(List.of(
                        TaskResponse.builder()
                                .id(1L)
                                .taskOrder((short) 1)
                                .typeCode("SftpDownloadTask")
                                .props(Map.of("host", "localhost"))
                                .build()
                ))
                .createdAt(NOW)
                .updatedAt(NOW)
                .build();
    }

    @Nested
    @DisplayName("POST /api/v1/pipelines")
    class CreatePipeline {

        @Test
        @DisplayName("should return 201 when valid request body")
        void createPipeline_returns201() throws Exception {
            PipelineResponse response = buildPipelineResponse();
            when(pipelineService.create(any(CreatePipelineRequest.class))).thenReturn(response);

            String body = objectMapper.writeValueAsString(CreatePipelineRequest.builder()
                    .pipelineName("test-pipeline")
                    .clientFrom("pc")
                    .clientTo("dwh")
                    .tasks(List.of(TaskRequest.builder()
                            .taskOrder((short) 1)
                            .typeCode("SftpDownloadTask")
                            .props(Map.of("host", "localhost"))
                            .build()))
                    .build());

            mockMvc.perform(post("/api/v1/pipelines")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(PIPELINE_ID.toString()))
                    .andExpect(jsonPath("$.pipelineName").value("test-pipeline"))
                    .andExpect(jsonPath("$.tasks").isArray())
                    .andExpect(jsonPath("$.tasks.length()").value(1));
        }

        @Test
        @DisplayName("should return 400 when required fields are missing")
        void createPipeline_invalidBody_returns400() throws Exception {
            // Missing pipelineName, clientFrom, clientTo, tasks
            String body = "{}";

            mockMvc.perform(post("/api/v1/pipelines")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }

        @Test
        @DisplayName("should return 400 when no body provided")
        void createPipeline_noBody_returns400() throws Exception {
            mockMvc.perform(post("/api/v1/pipelines")
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/pipelines")
    class GetPipelines {

        @Test
        @DisplayName("should return 200 with paged response")
        void getPipelines_returns200() throws Exception {
            PagedResponse<PipelinePageResponse> response = PagedResponse.<PipelinePageResponse>builder()
                    .content(Collections.emptyList())
                    .page(0)
                    .size(20)
                    .totalElements(0)
                    .totalPages(0)
                    .build();

            when(pipelineService.getAll(anyInt(), anyInt(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(response);

            mockMvc.perform(get("/api/v1/pipelines"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.page").value(0))
                    .andExpect(jsonPath("$.size").value(20))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("should clamp page size to 100 when size > 100")
        void pageSizeOverMax_clampedTo100() throws Exception {
            PagedResponse<PipelinePageResponse> response = PagedResponse.<PipelinePageResponse>builder()
                    .content(Collections.emptyList())
                    .page(0)
                    .size(100)
                    .totalElements(0)
                    .totalPages(0)
                    .build();

            when(pipelineService.getAll(eq(0), eq(100), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                    .thenReturn(response);

            mockMvc.perform(get("/api/v1/pipelines").param("size", "999"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.size").value(100));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/pipelines/{id}")
    class GetPipelineById {

        @Test
        @DisplayName("should return 200 when pipeline exists")
        void getPipelineById_returns200() throws Exception {
            PipelineResponse response = buildPipelineResponse();
            when(pipelineService.getById(PIPELINE_ID)).thenReturn(response);

            mockMvc.perform(get("/api/v1/pipelines/{id}", PIPELINE_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PIPELINE_ID.toString()))
                    .andExpect(jsonPath("$.pipelineName").value("test-pipeline"));
        }

        @Test
        @DisplayName("should return 400 when id is not a valid UUID")
        void getPipelineById_invalidUuid_returns400() throws Exception {
            mockMvc.perform(get("/api/v1/pipelines/{id}", "not-a-uuid"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }

        @Test
        @DisplayName("should return 404 when pipeline not found")
        void getPipelineById_notFound_returns404() throws Exception {
            when(pipelineService.getById(PIPELINE_ID))
                    .thenThrow(new PipelineNotFoundException(PIPELINE_ID));

            mockMvc.perform(get("/api/v1/pipelines/{id}", PIPELINE_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.message").value("Pipeline not found: " + PIPELINE_ID));
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/pipelines/{id}")
    class UpdatePipeline {

        @Test
        @DisplayName("should return 200 when update is valid")
        void updatePipeline_returns200() throws Exception {
            PipelineResponse response = buildPipelineResponse();
            when(pipelineService.update(eq(PIPELINE_ID), any(UpdatePipelineRequest.class)))
                    .thenReturn(response);

            String body = objectMapper.writeValueAsString(UpdatePipelineRequest.builder()
                    .pipelineName("updated-name")
                    .build());

            mockMvc.perform(put("/api/v1/pipelines/{id}", PIPELINE_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(PIPELINE_ID.toString()));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/pipelines/{id}")
    class DeletePipeline {

        @Test
        @DisplayName("should return 204 when pipeline deleted successfully")
        void deletePipeline_returns204() throws Exception {
            doNothing().when(pipelineService).delete(PIPELINE_ID);

            mockMvc.perform(delete("/api/v1/pipelines/{id}", PIPELINE_ID))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("should return 404 when pipeline not found")
        void deletePipeline_notFound_returns404() throws Exception {
            doThrow(new PipelineNotFoundException(PIPELINE_ID))
                    .when(pipelineService).delete(PIPELINE_ID);

            mockMvc.perform(delete("/api/v1/pipelines/{id}", PIPELINE_ID))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404));
        }
    }

    @Nested
    @DisplayName("PATCH /api/v1/pipelines/datacenter")
    class BulkChangeDatacenter {

        @Test
        @DisplayName("should return 200 when admin updates datacenter for filtered pipelines")
        void bulkChangeDatacenter_asAdmin_updatesFilteredPipelines() throws Exception {
            BulkDatacenterResponse response = BulkDatacenterResponse.builder()
                    .updatedCount(5)
                    .datacenter("SC")
                    .build();
            when(pipelineService.bulkUpdateDatacenter(any(BulkDatacenterRequest.class)))
                    .thenReturn(response);

            String body = objectMapper.writeValueAsString(BulkDatacenterRequest.builder()
                    .datacenter("SC")
                    .pipelineIds(List.of(UUID.randomUUID()))
                    .build());

            mockMvc.perform(patch("/api/v1/pipelines/datacenter")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.updatedCount").value(5))
                    .andExpect(jsonPath("$.datacenter").value("SC"));
        }

        @Test
        @DisplayName("should return 400 when datacenter is blank")
        void bulkChangeDatacenter_blankDc_returns400() throws Exception {
            String body = objectMapper.writeValueAsString(BulkDatacenterRequest.builder()
                    .datacenter("")
                    .build());

            mockMvc.perform(patch("/api/v1/pipelines/datacenter")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("should return 400 when service throws PipelineValidationException for invalid DC")
        void bulkChangeDatacenter_invalidDc_returns400() throws Exception {
            when(pipelineService.bulkUpdateDatacenter(any(BulkDatacenterRequest.class)))
                    .thenThrow(new PipelineValidationException("Invalid datacenter: 'XX'. Allowed: SC, SP"));

            String body = objectMapper.writeValueAsString(BulkDatacenterRequest.builder()
                    .datacenter("XX")
                    .pipelineIds(List.of(UUID.randomUUID()))
                    .build());

            mockMvc.perform(patch("/api/v1/pipelines/datacenter")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid datacenter: 'XX'. Allowed: SC, SP"));
        }

        @Test
        @DisplayName("should return 403 when non-admin attempts bulk datacenter change")
        void bulkChangeDatacenter_nonAdmin_returns403() throws Exception {
            when(permissionService.currentUserHasRole("ADMIN")).thenReturn(false);

            String body = objectMapper.writeValueAsString(BulkDatacenterRequest.builder()
                    .datacenter("SC")
                    .pipelineIds(List.of(UUID.randomUUID()))
                    .build());

            mockMvc.perform(patch("/api/v1/pipelines/datacenter")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isForbidden());
        }
    }
}