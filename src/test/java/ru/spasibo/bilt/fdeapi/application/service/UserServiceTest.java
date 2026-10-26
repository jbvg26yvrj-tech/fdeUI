package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.PagedResponse;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.UserEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.UserRepository;
import ru.spasibo.bilt.fdeapi.domain.exception.UserAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.exception.UserNotFoundException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.RolePort;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import ru.spasibo.bilt.fdeapi.domain.port.UserManagementPort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserManagementPort userManagementPort;

    @Mock
    private AuthUserPort authUserPort;

    @Mock
    private TokenPort tokenPort;

    @Mock
    private RolePort rolePort;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final UUID ADMIN_ID = UUID.randomUUID();

    private static final UserPrincipal ADMIN_PRINCIPAL = new UserPrincipal(
            ADMIN_ID, "admin", true, false);

    private static final AuthUserData SAMPLE_USER = new AuthUserData(
            USER_ID, "testuser", "$2a$10$hash", true, false);

    private static UserEntity sampleUserEntity() {
        return UserEntity.builder()
                .id(USER_ID)
                .login("testuser")
                .password("$2a$10$hash")
                .activated(true)
                .passwordChangeRequired(false)
                .build();
    }

    // ---- getAll ----

    @Nested
    @DisplayName("getAll")
    class GetAllTests {

        @Test
        @DisplayName("should return paginated users")
        @SuppressWarnings("unchecked")
        void shouldReturnPaginatedUsers() {
            Page<UserEntity> page = new PageImpl<>(List.of(sampleUserEntity()));
            when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            PagedResponse<UserResponse> result = userService.getAll(0, 20, "login", null, null, null);

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getLogin()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("should cap page size at 100")
        @SuppressWarnings("unchecked")
        void shouldCapPageSize() {
            Page<UserEntity> page = new PageImpl<>(List.of());
            when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            userService.getAll(0, 500, "login", null, null, null);

            verify(userRepository).findAll(any(Specification.class), any(Pageable.class));
        }

        @Test
        @DisplayName("should reject invalid sort field")
        void shouldRejectInvalidSortField() {
            assertThatThrownBy(() -> userService.getAll(0, 20, "password", null, null, null))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Invalid sort field");
        }

        @Test
        @DisplayName("should accept valid sort fields")
        @SuppressWarnings("unchecked")
        void shouldAcceptValidSortFields() {
            Page<UserEntity> page = new PageImpl<>(List.of());
            when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            // Should not throw for any allowed field
            userService.getAll(0, 20, "login", null, null, null);
            userService.getAll(0, 20, "activated", null, null, null);
            userService.getAll(0, 20, "createdAt", null, null, null);
            userService.getAll(0, 20, "updatedAt", null, null, null);
            userService.getAll(0, 20, "createdAt,desc", null, null, null);
        }

        @Test
        @DisplayName("should use default sort when null")
        @SuppressWarnings("unchecked")
        void shouldUseDefaultSortWhenNull() {
            Page<UserEntity> page = new PageImpl<>(List.of());
            when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

            userService.getAll(0, 20, null, null, null, null);

            verify(userRepository).findAll(any(Specification.class), any(Pageable.class));
        }
    }

    // ---- getById ----

    @Nested
    @DisplayName("getById")
    class GetByIdTests {

        @Test
        @DisplayName("should return user when found")
        void shouldReturnUserWhenFound() {
            when(userManagementPort.findById(USER_ID)).thenReturn(Optional.of(SAMPLE_USER));

            AuthUserData result = userService.getById(USER_ID);

            assertThat(result.login()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("should throw when user not found")
        void shouldThrowWhenNotFound() {
            when(userManagementPort.findById(USER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> userService.getById(USER_ID))
                    .isInstanceOf(UserNotFoundException.class);
        }
    }

    // ---- create ----

    @Nested
    @DisplayName("create")
    class CreateTests {

        @Test
        @DisplayName("should allow admin to create user")
        void shouldAllowAdminToCreate() {
            when(authUserPort.existsByLogin("newuser")).thenReturn(false);
            when(passwordEncoder.encode("pass123")).thenReturn("$2a$10$encoded");
            when(userManagementPort.save("newuser", "$2a$10$encoded", true)).thenReturn(SAMPLE_USER);

            AuthUserData result = userService.create(ADMIN_PRINCIPAL, "newuser", "pass123", true);

            assertThat(result).isNotNull();
            verify(userManagementPort).save("newuser", "$2a$10$encoded", true);
        }

        @Test
        @DisplayName("should throw when login already exists")
        void shouldThrowWhenLoginExists() {
            when(authUserPort.existsByLogin("existing")).thenReturn(true);

            assertThatThrownBy(() ->
                    userService.create(ADMIN_PRINCIPAL, "existing", "pass", true))
                    .isInstanceOf(UserAlreadyExistsException.class);
        }
    }

    // ---- update ----

    @Nested
    @DisplayName("update")
    class UpdateTests {

        @Test
        @DisplayName("should perform single update call")
        void shouldPerformSingleUpdate() {
            AuthUserData updated = new AuthUserData(USER_ID, "testuser", "$2a$10$hash", false, true);
            when(userManagementPort.update(USER_ID, false, true)).thenReturn(updated);

            AuthUserData result = userService.update(ADMIN_PRINCIPAL, USER_ID, false, true);

            assertThat(result.activated()).isFalse();
            assertThat(result.passwordChangeRequired()).isTrue();
            verify(userManagementPort).update(USER_ID, false, true);
        }

        @Test
        @DisplayName("should reject empty update request")
        void shouldRejectEmptyUpdate() {
            assertThatThrownBy(() ->
                    userService.update(ADMIN_PRINCIPAL, USER_ID, null, null))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("At least one field must be provided");
        }

        @Test
        @DisplayName("should throw when user not found (from adapter)")
        void shouldThrowWhenUserNotFound() {
            when(userManagementPort.update(USER_ID, true, null))
                    .thenThrow(new UserNotFoundException("User not found: " + USER_ID));

            assertThatThrownBy(() ->
                    userService.update(ADMIN_PRINCIPAL, USER_ID, true, null))
                    .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        @DisplayName("should allow partial update with only activated")
        void shouldAllowPartialUpdateActivated() {
            AuthUserData updated = new AuthUserData(USER_ID, "testuser", "$2a$10$hash", false, false);
            when(userManagementPort.update(USER_ID, false, null)).thenReturn(updated);

            AuthUserData result = userService.update(ADMIN_PRINCIPAL, USER_ID, false, null);

            assertThat(result).isNotNull();
            verify(userManagementPort).update(USER_ID, false, null);
        }
    }

    // ---- delete ----

    @Nested
    @DisplayName("delete")
    class DeleteTests {

        @Test
        @DisplayName("should allow admin to delete user")
        void shouldAllowAdminToDelete() {
            when(userManagementPort.findById(USER_ID)).thenReturn(Optional.of(SAMPLE_USER));

            userService.delete(ADMIN_PRINCIPAL, USER_ID);

            verify(tokenPort).revokeRefreshToken(USER_ID);
            verify(userManagementPort).delete(USER_ID);
        }

        @Test
        @DisplayName("should prevent self-deletion")
        void shouldPreventSelfDeletion() {
            assertThatThrownBy(() ->
                    userService.delete(ADMIN_PRINCIPAL, ADMIN_ID))
                    .isInstanceOf(ValidationException.class)
                    .hasMessageContaining("Cannot delete your own account");
        }

        @Test
        @DisplayName("should throw when user not found")
        void shouldThrowWhenUserNotFound() {
            UUID unknownId = UUID.randomUUID();
            when(userManagementPort.findById(unknownId)).thenReturn(Optional.empty());

            assertThatThrownBy(() ->
                    userService.delete(ADMIN_PRINCIPAL, unknownId))
                    .isInstanceOf(UserNotFoundException.class);
        }

        @Test
        @DisplayName("should revoke tokens before deletion")
        void shouldRevokeTokensBeforeDeletion() {
            when(userManagementPort.findById(USER_ID)).thenReturn(Optional.of(SAMPLE_USER));

            userService.delete(ADMIN_PRINCIPAL, USER_ID);

            verify(tokenPort).revokeRefreshToken(USER_ID);
            verify(userManagementPort).delete(USER_ID);
        }
    }

    // ---- getCurrentUser ----

    @Nested
    @DisplayName("getCurrentUser")
    class GetCurrentUserTests {

        @Test
        @DisplayName("should return domain object from principal")
        void shouldReturnDomainObject() {
            AuthUserData result = userService.getCurrentUser(ADMIN_PRINCIPAL);

            assertThat(result.id()).isEqualTo(ADMIN_ID);
            assertThat(result.login()).isEqualTo("admin");
            assertThat(result.activated()).isTrue();
            assertThat(result.passwordHash()).isNull();
        }
    }
}
