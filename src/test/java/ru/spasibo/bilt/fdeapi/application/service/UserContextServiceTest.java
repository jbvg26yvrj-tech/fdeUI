package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.spasibo.bilt.fdeapi.domain.exception.UserNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.UserContext;
import ru.spasibo.bilt.fdeapi.domain.model.UserPermissions;
import ru.spasibo.bilt.fdeapi.domain.model.UserRls;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.PermissionPort;
import ru.spasibo.bilt.fdeapi.domain.port.RlsPort;
import ru.spasibo.bilt.fdeapi.domain.port.UserSettingPort;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserContextService")
class UserContextServiceTest {

    @Mock
    private AuthUserPort authUserPort;

    @Mock
    private UserSettingPort userSettingPort;

    @Mock
    private PermissionPort permissionPort;

    @Mock
    private RlsPort rlsPort;

    @InjectMocks
    private UserContextService userContextService;

    private static final UUID USER_ID = UUID.randomUUID();

    @Test
    @DisplayName("should return user context with user data, settings, permissions, and RLS")
    void shouldReturnUserContext() throws Exception {
        AuthUserData user = new AuthUserData(USER_ID, "testuser", "$2a$10$hash", true, false);
        Map<String, String> settings = Map.of("theme", "dark", "lang", "ru");
        UserPermissions permissions = new UserPermissions(Collections.emptySet(), Collections.emptySet());
        JsonNode filterNode = new ObjectMapper().readTree("{\"conditions\":[]}");
        UserRls rls = new UserRls(Map.of("page.pipelines", filterNode));

        when(authUserPort.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userSettingPort.getAll(USER_ID)).thenReturn(settings);
        when(permissionPort.getUserPermissions(USER_ID)).thenReturn(permissions);
        when(rlsPort.getUserRls(USER_ID)).thenReturn(rls);

        UserContext result = userContextService.getUserContext(USER_ID);

        assertThat(result.user().login()).isEqualTo("testuser");
        assertThat(result.settings()).containsEntry("theme", "dark");
        assertThat(result.settings()).containsEntry("lang", "ru");
        assertThat(result.permissions()).isNotNull();
        assertThat(result.rls()).isNotNull();
        assertThat(result.rls().filters()).containsKey("page.pipelines");
    }

    @Test
    @DisplayName("should return empty RLS when user has no roles")
    void shouldReturnEmptyRls() {
        AuthUserData user = new AuthUserData(USER_ID, "testuser", "$2a$10$hash", true, false);
        UserPermissions permissions = new UserPermissions(Collections.emptySet(), Collections.emptySet());
        UserRls rls = new UserRls(Collections.emptyMap());

        when(authUserPort.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userSettingPort.getAll(USER_ID)).thenReturn(Collections.emptyMap());
        when(permissionPort.getUserPermissions(USER_ID)).thenReturn(permissions);
        when(rlsPort.getUserRls(USER_ID)).thenReturn(rls);

        UserContext result = userContextService.getUserContext(USER_ID);

        assertThat(result.rls().filters()).isEmpty();
    }

    @Test
    @DisplayName("should throw when user not found")
    void shouldThrowWhenNotFound() {
        when(authUserPort.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userContextService.getUserContext(USER_ID))
                .isInstanceOf(UserNotFoundException.class);
    }
}