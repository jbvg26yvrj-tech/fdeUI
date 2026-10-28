package ru.spasibo.bilt.fdeapi.application.service;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.spasibo.bilt.fdeapi.domain.exception.AccessDeniedException;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class RegistrationSettingsTest {
 @Test void disabledPolicyRejectsRegistration() {
   var jdbc=mock(JdbcTemplate.class);
   when(jdbc.queryForObject("SELECT registration_enabled FROM auth.registration_settings WHERE id=1 FOR SHARE",Boolean.class)).thenReturn(false);
   assertThatThrownBy(()->new RegistrationSettingsService(jdbc).requireEnabled()).isInstanceOf(AccessDeniedException.class);
 }
 @Test void selfRegistrationIsActiveWithoutPasswordChangeOrRoleWrites() {
   var users=mock(UserRepository.class);var roles=mock(RoleUserRepository.class);
   when(users.save(any(UserEntity.class))).thenAnswer(inv->inv.getArgument(0));
   var result=new AuthUserAdapter(users,roles).save("new-user","HASH");
   assertThat(result.activated()).isTrue();assertThat(result.passwordChangeRequired()).isFalse();
   verifyNoInteractions(roles);
 }
 @Test void adminCreatedUsersKeepTheirChosenActivationAndPasswordChange() {
   var users=mock(UserRepository.class);var roles=mock(RoleUserRepository.class);
   when(users.save(any(UserEntity.class))).thenAnswer(inv->inv.getArgument(0));
   var result=new AuthUserAdapter(users,roles).save("new-user","HASH",false);
   assertThat(result.activated()).isFalse();assertThat(result.passwordChangeRequired()).isTrue();
 }
}
