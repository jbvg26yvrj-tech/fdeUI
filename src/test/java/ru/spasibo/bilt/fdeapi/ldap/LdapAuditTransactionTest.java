package ru.spasibo.bilt.fdeapi.ldap;
import org.junit.jupiter.api.Test;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.spasibo.bilt.fdeapi.audit.*;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.auth.*;
import ru.spasibo.bilt.fdeapi.domain.port.TokenPort;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class LdapAuditTransactionTest {
 @Test void rejectedDisabledLoginCommitsIdentityDeactivationAndRevocation() {
  var datasource=new DriverManagerDataSource("jdbc:h2:mem:ldap_audit_boundary;DB_CLOSE_DELAY=-1","sa","");
  var jdbc=new JdbcTemplate(datasource); jdbc.execute("create table identity_state(id varchar primary key, activated boolean, disabled boolean)");
  jdbc.execute("create table refresh_state(user_id varchar primary key)");
  UUID id=UUID.randomUUID(); jdbc.update("insert into identity_state values(?,true,false)",id.toString()); jdbc.update("insert into refresh_state values(?)",id.toString());
  var manager=new DataSourceTransactionManager(datasource); var audit=mock(AuditService.class); var aspect=new AuditMutationAspect(audit,manager);
  var users=mock(UserRepository.class); var repository=mock(LdapSettingsRepository.class); var tokens=mock(TokenPort.class);
  var row=new LdapSettingsEntity(); row.setConfigJson("{}"); when(repository.lock()).thenReturn(Optional.of(row));
  var user=UserEntity.builder().id(id).login("alice").authSource("LDAP").externalId("stable").activated(true).build();
  when(users.findByAuthSourceAndExternalId("LDAP","stable")).thenAnswer(call->{ user.setActivated(jdbc.queryForObject("select activated from identity_state",Boolean.class)); return Optional.of(user); });
  when(users.saveAndFlush(any())).thenAnswer(call->{ UserEntity changed=call.getArgument(0); jdbc.update("update identity_state set activated=?,disabled=? where id=?",changed.isActivated(),changed.isDirectoryDisabled(),id.toString()); return changed; });
  doAnswer(call->{jdbc.update("delete from refresh_state where user_id=?",id.toString()); return null;}).when(tokens).revokeRefreshToken(id);
  var identityFactory=new AspectJProxyFactory(new LdapIdentityService(users,repository,tokens)); identityFactory.addAspect(aspect);
  LdapIdentityService identities=identityFactory.getProxy();
  var settings=mock(LdapSettingsService.class); var config=new LdapSettings(); config.setEnabled(true);
  when(settings.entity()).thenReturn(row); when(settings.decode(row)).thenReturn(config); when(settings.password(row)).thenReturn("bind");
  var directory=mock(LdapDirectory.class);
  when(directory.authenticate(any(),any(),any(),any())).thenAnswer(call->{ assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse(); return new DirectoryIdentity("stable","alice","Alice","",false); });
  var loginFactory=new AspectJProxyFactory(new LdapLoginService(settings,directory,identities,tokens)); loginFactory.addAspect(aspect);
  LdapLoginService login=loginFactory.getProxy();
  assertThatThrownBy(()->login.login("alice","password")).isInstanceOf(ru.spasibo.bilt.fdeapi.domain.exception.AccountNotActivatedException.class);
  assertThat(jdbc.queryForObject("select activated from identity_state",Boolean.class)).isFalse();
  assertThat(jdbc.queryForObject("select disabled from identity_state",Boolean.class)).isTrue();
  assertThat(jdbc.queryForObject("select count(*) from refresh_state",Integer.class)).isZero();
  verify(audit).context(); verify(tokens,never()).generateTokenPair(any());
 }
}
