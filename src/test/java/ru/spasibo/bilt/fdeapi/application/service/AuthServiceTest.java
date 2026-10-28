package ru.spasibo.bilt.fdeapi.application.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.spasibo.bilt.fdeapi.domain.exception.AccountNotActivatedException;
import ru.spasibo.bilt.fdeapi.domain.exception.AuthenticationException;
import ru.spasibo.bilt.fdeapi.domain.exception.UserAlreadyExistsException;
import ru.spasibo.bilt.fdeapi.domain.exception.ValidationException;
import ru.spasibo.bilt.fdeapi.domain.model.AuthResult;
import ru.spasibo.bilt.fdeapi.domain.model.AuthUserData;
import ru.spasibo.bilt.fdeapi.domain.model.TokenPair;
import ru.spasibo.bilt.fdeapi.domain.model.UserPrincipal;
import ru.spasibo.bilt.fdeapi.domain.port.AuthUserPort;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService")
class AuthServiceTest {

    @Mock
    private AuthUserPort authUserPort;

    @Mock
    private TokenPort tokenPort;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private RegistrationSettingsService registrationSettings;

    @InjectMocks
    private AuthService authService;

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String LOGIN = "testuser";
    private static final String PASSWORD = "password123";
    private static final String HASHED_PASSWORD = "$2a$10$hashedpassword";

    private AuthUserData createUser(boolean activated, boolean passwordChangeRequired) {
        return new AuthUserData(USER_ID, LOGIN, HASHED_PASSWORD, activated, passwordChangeRequired);
    }

    @Test
    void refreshRejectsDeactivatedUserDespiteValidTokens() {
        when(tokenPort.validateRefreshToken("refresh")).thenReturn(true);
        when(tokenPort.atomicReplaceRefreshToken(USER_ID, "refresh")).thenReturn(true);
        when(authUserPort.findById(USER_ID)).thenReturn(Optional.of(createUser(false, false)));
        assertThatThrownBy(() -> authService.refresh(new UserPrincipal(USER_ID, LOGIN, true, false), "refresh"))
                .isInstanceOf(AccountNotActivatedException.class);
        verify(tokenPort, never()).generateTokenPair(any());
    }

    @Nested
    @DisplayName("login()")
    class LoginTests {

        @Test
        @DisplayName("Should return AuthResult when credentials are valid and account is activated")
        void login_validCredentialsAndActivated_returnsAuthResult() {
            AuthUserData user = createUser(true, false);
            TokenPair tokenPair = new TokenPair("access-token", "refresh-token");

            when(authUserPort.findByLogin(LOGIN)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(PASSWORD, HASHED_PASSWORD)).thenReturn(true);
            when(tokenPort.generateTokenPair(any(UserPrincipal.class))).thenReturn(tokenPair);

            AuthResult result = authService.login(LOGIN, PASSWORD);

            assertThat(result).isNotNull();
            assertThat(result.tokenPair().accessToken()).isEqualTo("access-token");
            assertThat(result.tokenPair().refreshToken()).isEqualTo("refresh-token");
            assertThat(result.user().login()).isEqualTo(LOGIN);
            assertThat(result.user().activated()).isTrue();
            verify(tokenPort).saveRefreshToken(USER_ID, "refresh-token");
        }

        @Test
        @DisplayName("Should throw AuthenticationException with 'Неверный логин или пароль' when user not found")
        void login_userNotFound_throwsAuthenticationException() {
            when(authUserPort.findByLogin(LOGIN)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> authService.login(LOGIN, PASSWORD))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessage("Неверный логин или пароль");

            // dummy bcrypt is called to equalize timing (prevent username enumeration)
            verify(passwordEncoder).matches(eq(PASSWORD), any());
            verify(tokenPort, never()).generateTokenPair(any());
        }

        @Test
        @DisplayName("Should throw AuthenticationException with 'Неверный логин или пароль' when password is wrong")
        void login_wrongPassword_throwsAuthenticationException() {
            AuthUserData user = createUser(true, false);
            when(authUserPort.findByLogin(LOGIN)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(PASSWORD, HASHED_PASSWORD)).thenReturn(false);

            assertThatThrownBy(() -> authService.login(LOGIN, PASSWORD))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessage("Неверный логин или пароль");

            verify(tokenPort, never()).generateTokenPair(any());
        }

        @Test
        @DisplayName("User not found and wrong password should produce the same error message")
        void login_userNotFoundAndWrongPassword_sameErrorMessage() {
            // User not found
            when(authUserPort.findByLogin("unknown")).thenReturn(Optional.empty());
            try {
                authService.login("unknown", PASSWORD);
            } catch (AuthenticationException e1) {
                // Wrong password
                AuthUserData user = createUser(true, false);
                when(authUserPort.findByLogin(LOGIN)).thenReturn(Optional.of(user));
                when(passwordEncoder.matches(PASSWORD, HASHED_PASSWORD)).thenReturn(false);

                try {
                    authService.login(LOGIN, PASSWORD);
                } catch (AuthenticationException e2) {
                    assertThat(e1.getMessage()).isEqualTo(e2.getMessage());
                    return;
                }
            }
            throw new AssertionError("Expected both cases to throw AuthenticationException");
        }

        @Test
        @DisplayName("Should throw AccountNotActivatedException when account is not activated")
        void login_accountNotActivated_throwsAccountNotActivatedException() {
            AuthUserData user = createUser(false, false);
            when(authUserPort.findByLogin(LOGIN)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(PASSWORD, HASHED_PASSWORD)).thenReturn(true);

            assertThatThrownBy(() -> authService.login(LOGIN, PASSWORD))
                    .isInstanceOf(AccountNotActivatedException.class)
                    .hasMessage("Аккаунт не активирован. Обратитесь к администратору");

            verify(tokenPort, never()).generateTokenPair(any());
        }

        @Test
        @DisplayName("AccountNotActivatedException should be a different type from AuthenticationException")
        void login_accountNotActivated_isDifferentExceptionType() {
            AuthUserData user = createUser(false, false);
            when(authUserPort.findByLogin(LOGIN)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches(PASSWORD, HASHED_PASSWORD)).thenReturn(true);

            assertThatThrownBy(() -> authService.login(LOGIN, PASSWORD))
                    .isInstanceOf(AccountNotActivatedException.class)
                    .isNotInstanceOf(AuthenticationException.class);
        }
    }

    @Nested
    @DisplayName("register()")
    class RegisterTests {
        @Test void disabledRegistrationDoesNotCreateOrIssueTokens() {
            org.mockito.Mockito.doThrow(new ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException("closed"))
                .when(registrationSettings).requireEnabled();
            assertThatThrownBy(() -> authService.register(LOGIN,PASSWORD,PASSWORD))
                .isInstanceOf(ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException.class);
            org.mockito.Mockito.verifyNoInteractions(authUserPort,tokenPort,passwordEncoder);
        }


        @Test
        @DisplayName("Should register user with valid data")
        void register_validData_returnsUserPrincipal() {
            AuthUserData savedUser = createUser(true, false);
            when(authUserPort.existsByLogin(LOGIN)).thenReturn(false);
            when(passwordEncoder.encode(PASSWORD)).thenReturn(HASHED_PASSWORD);
            when(authUserPort.save(LOGIN, HASHED_PASSWORD)).thenReturn(savedUser);

            UserPrincipal result = authService.register(LOGIN, PASSWORD, PASSWORD);

            assertThat(result).isNotNull();
            assertThat(result.login()).isEqualTo(LOGIN);
            assertThat(result.id()).isEqualTo(USER_ID);
            verify(registrationSettings).requireEnabled();
            verify(tokenPort,never()).generateTokenPair(any());
        }

        @Test
        @DisplayName("Should throw ValidationException when passwords don't match")
        void register_passwordMismatch_throwsValidationException() {
            assertThatThrownBy(() -> authService.register(LOGIN, PASSWORD, "different"))
                    .isInstanceOf(ValidationException.class)
                    .hasMessage("Password and confirmation do not match");
        }

        @Test
        @DisplayName("Should throw UserAlreadyExistsException when login is taken")
        void register_loginTaken_throwsUserAlreadyExistsException() {
            when(authUserPort.existsByLogin(LOGIN)).thenReturn(true);

            assertThatThrownBy(() -> authService.register(LOGIN, PASSWORD, PASSWORD))
                    .isInstanceOf(UserAlreadyExistsException.class);
        }
    }

    @Nested
    @DisplayName("changePassword()")
    class ChangePasswordTests {

        @Test
        @DisplayName("Should change password and revoke tokens")
        void changePassword_validData_success() {
            AuthUserData user = createUser(true, true);
            when(authUserPort.findById(USER_ID)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("oldPass", HASHED_PASSWORD)).thenReturn(true);
            when(passwordEncoder.encode("newPass")).thenReturn("newHash");

            authService.changePassword(USER_ID, "oldPass", "newPass", "newPass");

            verify(authUserPort).updatePassword(USER_ID, "newHash", false);
            verify(tokenPort).revokeRefreshToken(USER_ID);
        }

        @Test
        @DisplayName("Should throw AuthenticationException when current password is wrong")
        void changePassword_wrongCurrentPassword_throwsAuthenticationException() {
            AuthUserData user = createUser(true, false);
            when(authUserPort.findById(USER_ID)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("wrongPass", HASHED_PASSWORD)).thenReturn(false);

            assertThatThrownBy(() -> authService.changePassword(USER_ID, "wrongPass", "newPass", "newPass"))
                    .isInstanceOf(AuthenticationException.class)
                    .hasMessage("Current password is incorrect");
        }

        @Test
        @DisplayName("Should throw ValidationException when new passwords don't match")
        void changePassword_mismatch_throwsValidationException() {
            AuthUserData user = createUser(true, false);
            when(authUserPort.findById(USER_ID)).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("oldPass", HASHED_PASSWORD)).thenReturn(true);

            assertThatThrownBy(() -> authService.changePassword(USER_ID, "oldPass", "newPass", "other"))
                    .isInstanceOf(ValidationException.class);
        }
    }

    @Nested
    @DisplayName("logout()")
    class LogoutTests {

        @Test
        @DisplayName("Should revoke refresh token")
        void logout_revokesToken() {
            authService.logout(USER_ID);
            verify(tokenPort).revokeRefreshToken(USER_ID);
        }
    }
}
