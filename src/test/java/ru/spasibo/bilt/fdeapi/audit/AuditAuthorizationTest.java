package ru.spasibo.bilt.fdeapi.audit;
import org.junit.jupiter.api.*;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.security.authorization.method.*;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class AuditAuthorizationTest {
 @AfterEach void clear() { SecurityContextHolder.clearContext(); }
 @Test void auditReadRequiresAdminEvenWhenClientHasOtherReadPermissions() {
  var jdbc=mock(JdbcTemplate.class); var permissions=mock(PermissionService.class);
  var factory=new DefaultListableBeanFactory(); factory.registerSingleton("permissionService",permissions);
  var context=new GenericApplicationContext(factory); context.refresh();
  var handler=new DefaultMethodSecurityExpressionHandler(); handler.setApplicationContext(context);
  var manager=new PreAuthorizeAuthorizationManager(); manager.setExpressionHandler(handler);
  var proxy=new ProxyFactory(new AuditController(jdbc,new ObjectMapper())); proxy.setProxyTargetClass(true);
  proxy.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize(manager));
  var controller=(AuditController)proxy.getProxy();
  SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("client","unused",java.util.List.of()));
  when(permissions.currentUserHasRole("ADMIN")).thenReturn(false);
  assertThatThrownBy(()->controller.list(0,20,null,null,null,null,null,null,null,null)).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
  verifyNoInteractions(jdbc);
  when(permissions.currentUserHasRole("ADMIN")).thenReturn(true);
  // Reaches validation after successful authorization without any DB query.
  assertThatThrownBy(()->controller.list(-1,20,null,null,null,null,null,null,null,null)).isInstanceOf(IllegalArgumentException.class);
  context.close();
 }
}
