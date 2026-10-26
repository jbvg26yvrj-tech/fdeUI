package ru.spasibo.bilt.fdeapi.ldap;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.spasibo.bilt.fdeapi.config.security.JwtAuthenticationFilter;
import ru.spasibo.bilt.fdeapi.domain.model.*;
import ru.spasibo.bilt.fdeapi.domain.port.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class JwtActiveUserTest {
    @Test void validJwtCannotAuthenticateDeactivatedOrDeletedUser() throws Exception {
        TokenPort tokens = mock(TokenPort.class); AuthUserPort users = mock(AuthUserPort.class);
        UUID id = UUID.randomUUID();
        when(tokens.validateAccessToken("token")).thenReturn(true);
        when(tokens.extractUserFromAccessToken("token")).thenReturn(new UserPrincipal(id, "alice", true, false));
        when(users.findById(id)).thenReturn(Optional.of(new AuthUserData(id, "alice", "hash", false, false)), Optional.empty());
        JwtAuthenticationFilter filter = new JwtAuthenticationFilter(tokens, users);
        for (int i = 0; i < 2; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/pipelines");
            request.addHeader("Authorization", "Bearer token");
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) ->
                    assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull());
        }
    }
}
