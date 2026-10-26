package ru.spasibo.bilt.fdeapi.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.spasibo.bilt.fdeapi.domain.exception.ResourceNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.RoleNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.RlsFilter;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;
import ru.spasibo.bilt.fdeapi.domain.port.ResourcePort;
import ru.spasibo.bilt.fdeapi.domain.port.RlsPort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RlsService")
class RlsServiceTest {

    @Mock
    private RlsPort rlsPort;

    @Mock
    private RolePort rolePort;

    @Mock
    private ResourcePort resourcePort;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private RlsService rlsService;


    private static final UUID ID = UUID.randomUUID();
    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ROLE_ID = UUID.randomUUID();
    private static final UUID RESOURCE_ID = UUID.randomUUID();
    private static final String VALID_FILTER = "{\"conditions\":[{\"field\":\"name\",\"operator\":\"eq\",\"value\":\"test\"}]}";

    @Nested
    @DisplayName("getUserRls")
    class GetUserRls {

        @Test
        @DisplayName("should return user RLS from port")
        void shouldReturnUserRls() throws Exception {
            JsonNode filterNode = new ObjectMapper().readTree(VALID_FILTER);
            UserRls expected = new UserRls(Map.of("page.pipelines", filterNode));
            when(rlsPort.getUserRls(USER_ID)).thenReturn(expected);

            UserRls result = rlsService.getUserRls(USER_ID);

            assertThat(result.filters()).containsKey("page.pipelines");
        }

        @Test
        @DisplayName("should return empty RLS when no filters")
        void shouldReturnEmptyRls() {
            when(rlsPort.getUserRls(USER_ID)).thenReturn(new UserRls(Collections.emptyMap()));

            UserRls result = rlsService.getUserRls(USER_ID);

            assertThat(result.filters()).isEmpty();
        }
    }

    @Nested
    @DisplayName("getRlsForRole")
    class GetRlsForRole {

        @Test
        @DisplayName("should return RLS filters for existing role")
        void shouldReturnFiltersForRole() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);

            LocalDateTime now = LocalDateTime.now();
            List<RlsFilter> filters = List.of(
                    new RlsFilter(ROLE_ID, RESOURCE_ID, "page.pipelines", VALID_FILTER, now, now));
            when(rlsPort.getRlsForRole(ROLE_ID)).thenReturn(filters);

            List<RlsFilter> result = rlsService.getRlsForRole(ROLE_ID);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).resourceCode()).isEqualTo("page.pipelines");
        }

        @Test
        @DisplayName("should throw RoleNotFoundException when role does not exist")
        void shouldThrowWhenRoleNotFound() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(false);

            assertThatThrownBy(() -> rlsService.getRlsForRole(ROLE_ID))
                    .isInstanceOf(RoleNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("getRlsFilter")
    class GetRlsFilter {

        @Test
        @DisplayName("should return filter for existing role-resource pair")
        void shouldReturnFilter() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(true);
            when(rlsPort.getRlsFilter(ROLE_ID, RESOURCE_ID)).thenReturn(Optional.of(VALID_FILTER));

            Optional<String> result = rlsService.getRlsFilter(ROLE_ID, RESOURCE_ID);

            assertThat(result).isPresent().contains(VALID_FILTER);
        }

        @Test
        @DisplayName("should return empty when no filter exists")
        void shouldReturnEmpty() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(true);
            when(rlsPort.getRlsFilter(ROLE_ID, RESOURCE_ID)).thenReturn(Optional.empty());

            Optional<String> result = rlsService.getRlsFilter(ROLE_ID, RESOURCE_ID);

            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("should throw when role not found")
        void shouldThrowWhenRoleNotFound() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(false);

            assertThatThrownBy(() -> rlsService.getRlsFilter(ROLE_ID, RESOURCE_ID))
                    .isInstanceOf(RoleNotFoundException.class);
        }

        @Test
        @DisplayName("should throw when resource not found")
        void shouldThrowWhenResourceNotFound() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(false);

            assertThatThrownBy(() -> rlsService.getRlsFilter(ROLE_ID, RESOURCE_ID))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("saveRlsFilter")
    class SaveRlsFilter {

        @Test
        @DisplayName("should save valid filter")
        void shouldSaveValidFilter() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(true);

            rlsService.saveRlsFilter(ROLE_ID, RESOURCE_ID, VALID_FILTER);

            verify(rlsPort).saveRlsFilter(ROLE_ID, RESOURCE_ID, VALID_FILTER);
        }

        @Test
        @DisplayName("should throw ValidationException for invalid JSON")
        void shouldThrowForInvalidJson() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(true);

            assertThatThrownBy(() -> rlsService.saveRlsFilter(ROLE_ID, RESOURCE_ID, "not-json"))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("not valid JSON");
        }

        @Test
        @DisplayName("should throw ValidationException for blank filter")
        void shouldThrowForBlankFilter() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(true);

            assertThatThrownBy(() -> rlsService.saveRlsFilter(ROLE_ID, RESOURCE_ID, "  "))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("must not be blank");
        }

        @Test
        @DisplayName("should throw when role not found")
        void shouldThrowWhenRoleNotFound() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(false);

            assertThatThrownBy(() -> rlsService.saveRlsFilter(ROLE_ID, RESOURCE_ID, VALID_FILTER))
                    .isInstanceOf(RoleNotFoundException.class);
        }

        @Test
        @DisplayName("should throw when resource not found")
        void shouldThrowWhenResourceNotFound() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(false);

            assertThatThrownBy(() -> rlsService.saveRlsFilter(ROLE_ID, RESOURCE_ID, VALID_FILTER))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("should throw ValidationException when filter exceeds max size")
        void shouldThrowWhenFilterExceedsMaxSize() {
            when(rolePort.existsById(ROLE_ID)).thenReturn(true);
            when(resourcePort.existsById(RESOURCE_ID)).thenReturn(true);

            String oversizedFilter = "{\"data\":\"" + "x".repeat(10_001) + "\"}";

            assertThatThrownBy(() -> rlsService.saveRlsFilter(ROLE_ID, RESOURCE_ID, oversizedFilter))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("exceeds maximum size");
        }
    }

    @Nested
    @DisplayName("deleteRlsFilter")
    class DeleteRlsFilter {

        @Test
        @DisplayName("should delete filter")
        void shouldDeleteFilter() {
            rlsService.deleteRlsFilter(ID);

            verify(rlsPort).deleteRlsFilter(ID);
        }
    }

    @Nested
    @DisplayName("resolveFilter")
    class ResolveFilter {

        @Test
        @DisplayName("should replace currentUser.id template variable")
        void shouldReplaceUserId() {
            UserPrincipal user = new UserPrincipal(USER_ID, "admin", true, false);
            String filter = "{\"field\":\"owner_id\",\"value\":\"${currentUser.id}\"}";

            String result = rlsService.resolveFilter(filter, user);

            assertThat(result).contains(USER_ID.toString());
            assertThat(result).doesNotContain("${currentUser.id}");
        }

        @Test
        @DisplayName("should replace currentUser.login template variable")
        void shouldReplaceUserLogin() {
            UserPrincipal user = new UserPrincipal(USER_ID, "admin", true, false);
            String filter = "{\"field\":\"created_by\",\"value\":\"${currentUser.login}\"}";

            String result = rlsService.resolveFilter(filter, user);

            assertThat(result).contains("admin");
            assertThat(result).doesNotContain("${currentUser.login}");
        }

        @Test
        @DisplayName("should handle null filter")
        void shouldHandleNullFilter() {
            UserPrincipal user = new UserPrincipal(USER_ID, "admin", true, false);

            String result = rlsService.resolveFilter(null, user);

            assertThat(result).isNull();
        }

        @Test
        @DisplayName("should handle blank filter")
        void shouldHandleBlankFilter() {
            UserPrincipal user = new UserPrincipal(USER_ID, "admin", true, false);

            String result = rlsService.resolveFilter("  ", user);

            assertThat(result).isEqualTo("  ");
        }

        @Test
        @DisplayName("should handle filter without template variables")
        void shouldHandleFilterWithoutTemplates() {
            UserPrincipal user = new UserPrincipal(USER_ID, "admin", true, false);
            String filter = "{\"field\":\"status\",\"value\":\"active\"}";

            String result = rlsService.resolveFilter(filter, user);

            assertThat(result).isEqualTo(filter);
        }

        @Test
        @DisplayName("should JSON-escape login with special characters to prevent injection")
        void shouldJsonEscapeLoginWithSpecialChars() {
            UserPrincipal user = new UserPrincipal(USER_ID, "user\",\"admin\":true,\"x\":\"", true, false);
            String filter = "{\"field\":\"created_by\",\"value\":\"${currentUser.login}\"}";

            String result = rlsService.resolveFilter(filter, user);

            // The result must be valid JSON — special chars should be escaped
            assertThat(result).doesNotContain("${currentUser.login}");
            assertThat(result).contains("\\\""); // escaped quotes
        }

        @Test
        @DisplayName("should JSON-escape backslashes and control characters")
        void shouldJsonEscapeBackslashesAndControlChars() {
            UserPrincipal user = new UserPrincipal(USER_ID, "user\\path\nnewline", true, false);
            String filter = "{\"field\":\"created_by\",\"value\":\"${currentUser.login}\"}";

            String result = rlsService.resolveFilter(filter, user);

            assertThat(result).contains("\\\\"); // escaped backslash
            assertThat(result).contains("\\n");   // escaped newline
        }
    }
}