package ru.spasibo.bilt.fdeapi.adapter.in.rest;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ru.spasibo.bilt.fdeapi.adapter.out.security.TokenServiceImpl;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.spasibo.bilt.fdeapi.domain.exception.AccountNotActivatedException;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.exception.DispatcherUnavailableException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.PipelineValidationException;
import ru.spasibo.bilt.fdeapi.domain.exception.SessionNotFoundException;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestExceptionController.class)
@Import({GlobalExceptionHandler.class, GlobalExceptionHandlerTest.TestExceptionController.class,
        ru.spasibo.bilt.fdeapi.config.SecurityConfig.class})
@ActiveProfiles("test")
@DisplayName("GlobalExceptionHandler")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TokenServiceImpl tokenServiceImpl;

    @MockitoBean
    private ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort authUserPort;

    @MockitoBean(name = "permissionService")
    private ru.spasibo.bilt.fdeapi.application.service.PermissionService permissionService;

    /**
     * Test controller that throws specific exceptions for each endpoint.
     */
    @RestController
    @RequestMapping("/test/exceptions")
    static class TestExceptionController {

        @GetMapping("/pipeline-not-found")
        public void pipelineNotFound() {
            throw new PipelineNotFoundException(UUID.randomUUID());
        }

        @GetMapping("/pipeline-validation")
        public void pipelineValidation() {
            throw new PipelineValidationException("Field X is invalid");
        }

        @GetMapping("/pipeline-already-exists")
        public void pipelineAlreadyExists() {
            throw new PipelineAlreadyExistsException("test-pipeline");
        }

        @GetMapping("/session-not-found")
        public void sessionNotFound() {
            throw new SessionNotFoundException(UUID.randomUUID());
        }

        @GetMapping("/dispatcher-unavailable")
        public void dispatcherUnavailable() {
            throw new DispatcherUnavailableException("Connection refused");
        }

        @GetMapping("/account-not-activated")
        public void accountNotActivated() {
            throw new AccountNotActivatedException("Аккаунт не активирован. Обратитесь к администратору");
        }

        @GetMapping("/authentication-failed")
        public void authenticationFailed() {
            throw new AuthenticationException("Неверный логин или пароль");
        }

        @PostMapping(value = "/some-endpoint", consumes = "application/json")
        public void someEndpoint() {
            // exists only for method-not-allowed and unsupported-media-type tests
        }
    }

    @Test
    @DisplayName("PipelineNotFoundException should return 404")
    void pipelineNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/exceptions/pipeline-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    @DisplayName("PipelineValidationException should return 400")
    void pipelineValidation_returns400() throws Exception {
        mockMvc.perform(get("/test/exceptions/pipeline-validation"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Field X is invalid"));
    }

    @Test
    @DisplayName("PipelineAlreadyExistsException should return 409")
    void pipelineAlreadyExists_returns409() throws Exception {
        mockMvc.perform(get("/test/exceptions/pipeline-already-exists"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("SessionNotFoundException should return 404")
    void sessionNotFound_returns404() throws Exception {
        mockMvc.perform(get("/test/exceptions/session-not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("DispatcherUnavailableException should return 502")
    void dispatcherUnavailable_returns502() throws Exception {
        mockMvc.perform(get("/test/exceptions/dispatcher-unavailable"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.status").value(502))
                .andExpect(jsonPath("$.error").value("Bad Gateway"))
                .andExpect(jsonPath("$.message").value("Connection refused"));
    }

    @Test
    @DisplayName("AccountNotActivatedException should return 403")
    void accountNotActivated_returns403() throws Exception {
        mockMvc.perform(get("/test/exceptions/account-not-activated"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("Аккаунт не активирован. Обратитесь к администратору"));
    }

    @Test
    @DisplayName("AuthenticationException should return 401")
    void authenticationFailed_returns401() throws Exception {
        mockMvc.perform(get("/test/exceptions/authentication-failed"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Неверный логин или пароль"));
    }

    @Test
    @DisplayName("Method not allowed should return 405")
    void methodNotAllowed_returns405() throws Exception {
        // POST-only endpoint hit with DELETE
        mockMvc.perform(delete("/test/exceptions/some-endpoint"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.status").value(405));
    }

    @Test
    @DisplayName("Unsupported media type should return 415")
    void unsupportedMediaType_returns415() throws Exception {
        mockMvc.perform(post("/test/exceptions/some-endpoint")
                        .contentType(MediaType.APPLICATION_XML)
                        .content("<data/>"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415));
    }
}
