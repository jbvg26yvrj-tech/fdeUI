package ru.spasibo.bilt.fdeapi.information;
import org.junit.jupiter.api.*;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.context.support.GenericApplicationContext;
import org.springframework.security.access.expression.method.DefaultMethodSecurityExpressionHandler;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authorization.method.*;
import org.springframework.security.core.context.SecurityContextHolder;
import ru.spasibo.bilt.fdeapi.application.service.PermissionService;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class InformationAuthorizationTest {
    final PermissionService permissions=mock(PermissionService.class);
    final InformationService service=mock(InformationService.class);
    final GenericApplicationContext context=new GenericApplicationContext(new DefaultListableBeanFactory());
    InformationController secured() {
        context.getBeanFactory().registerSingleton("permissionService",permissions); context.refresh();
        var handler=new DefaultMethodSecurityExpressionHandler(); handler.setApplicationContext(context);
        var manager=new PreAuthorizeAuthorizationManager(); manager.setExpressionHandler(handler);
        var proxy=new ProxyFactory(new InformationController(service,permissions)); proxy.setProxyTargetClass(true);
        proxy.addAdvisor(AuthorizationManagerBeforeMethodInterceptor.preAuthorize(manager)); return (InformationController)proxy.getProxy();
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); context.close(); }
    @Test void anonymousCannotReadOrEdit() {
        var controller=secured();
        assertThatThrownBy(controller::read).isInstanceOf(org.springframework.security.authentication.AuthenticationCredentialsNotFoundException.class);
        assertThatThrownBy(()->controller.save(null)).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verifyNoInteractions(service);
    }
    @Test void authenticatedViewerCanOnlyReadFilteredContent() {
        var controller=secured(); SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("viewer","unused",List.of()));
        controller.read(); verify(service).read(false);
        assertThatThrownBy(()->controller.save(null)).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        verify(service,never()).save(any());
    }
    @Test void adminCanReadAndEdit() {
        var controller=secured(); SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("admin","unused",List.of()));
        when(permissions.currentUserHasRole("ADMIN")).thenReturn(true);
        var document=new InformationModels.Document(0,List.of()); controller.read(); controller.save(document);
        verify(service).read(true); verify(service).save(document);
    }
}
