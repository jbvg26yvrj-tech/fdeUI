package ru.spasibo.bilt.fdeapi.audit;
import org.junit.jupiter.api.Test;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.*;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.transaction.*;
import org.springframework.transaction.support.SimpleTransactionStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class AuditOutcomesTest {
 @Test void escapingExceptionNeverProducesSuccess() throws Exception {
  AuditService audit=mock(AuditService.class); var factory=new StaticListableBeanFactory(); factory.addBean("audit",audit);
  var filter=new AuditRequestFilter(factory.getBeanProvider(AuditService.class));
  var request=new MockHttpServletRequest("POST","/api/v1/users"); var response=new MockHttpServletResponse();
  assertThatThrownBy(()->filter.doFilter(request,response,(req,res)->{throw new IllegalStateException("SECRET");})).isInstanceOf(IllegalStateException.class);
  verify(audit).record("POST /api/v1/users","users",null,"FAILURE");
  verify(audit,never()).record(anyString(),anyString(),any(),eq("SUCCESS"));
 }
 @Test void remoteRejectionIsFailureAndTransportExceptionIsUnknown() throws Throwable {
  AuditService audit=mock(AuditService.class); when(audit.actor()).thenReturn("actor"); when(audit.actorName()).thenReturn("Actor");
  var aspect=new AuditDispatcherAspect(audit,new ObjectMapper()); var point=mock(ProceedingJoinPoint.class); var signature=mock(Signature.class);
  when(point.getSignature()).thenReturn(signature); when(signature.getName()).thenReturn("proxyPost");
  when(point.getArgs()).thenReturn(new Object[]{"/api/v1/triggers/manual","{\"pipelineId\":\"10000000-0000-0000-0000-000000000001\"}"});
  when(point.proceed()).thenReturn(ResponseEntity.status(403).body("SECRET")); aspect.command(point);
  verify(audit).recordDetails(eq("execution.proxyPost"),eq("execution"),eq("10000000-0000-0000-0000-000000000001"),eq("FAILURE"),eq("actor"),eq("Actor"),anyMap());
  when(point.proceed()).thenThrow(new IllegalStateException("SECRET"));
  assertThatThrownBy(()->aspect.command(point)).isInstanceOf(IllegalStateException.class);
  verify(audit).recordDetails(eq("execution.proxyPost"),eq("execution"),anyString(),eq("UNKNOWN"),eq("actor"),eq("Actor"),anyMap());
 }
 @Test void failedBusinessMutationRollsBackBeforeIndependentFailureEvent() throws Throwable {
  AuditService audit=mock(AuditService.class); var manager=mock(PlatformTransactionManager.class); var status=new SimpleTransactionStatus();
  when(manager.getTransaction(any())).thenReturn(status); var aspect=new AuditMutationAspect(audit,manager);
  var point=mock(ProceedingJoinPoint.class); var signature=mock(Signature.class); when(point.getSignature()).thenReturn(signature);
  when(signature.getDeclaringType()).thenReturn(ru.spasibo.bilt.fdeapi.application.service.PipelineService.class); when(signature.getName()).thenReturn("create");
  when(point.proceed()).thenThrow(new IllegalArgumentException("SECRET"));
  assertThatThrownBy(()->aspect.mutation(point)).isInstanceOf(IllegalArgumentException.class);
  var ordered=inOrder(audit,manager); ordered.verify(audit).context(); ordered.verify(manager).rollback(status); ordered.verify(audit).record("PipelineService.create","PipelineService",null,"FAILURE");
 }
 @Test void schedulePathIsAuthoritativeWhenBodyTargetsAnotherPipeline() throws Throwable {
  AuditService audit=mock(AuditService.class); var aspect=new AuditDispatcherAspect(audit,new ObjectMapper());
  var point=mock(ProceedingJoinPoint.class); var signature=mock(Signature.class); when(point.getSignature()).thenReturn(signature); when(signature.getName()).thenReturn("proxyPut");
  String addressed="10000000-0000-0000-0000-000000000001", requested="20000000-0000-0000-0000-000000000002";
  when(point.getArgs()).thenReturn(new Object[]{"/api/v1/schedules/"+addressed,"{\"pipelineId\":\""+requested+"\",\"cron\":\"0 0 * * * ?\"}"});
  var dispatcher=mock(ru.spasibo.bilt.fdeapi.domain.port.DispatcherPort.class); when(point.getTarget()).thenReturn(dispatcher);
  when(dispatcher.proxyGet("/api/v1/schedules/"+addressed)).thenReturn(ResponseEntity.ok("{\"enabled\":false}"));
  when(point.proceed()).thenReturn(ResponseEntity.ok("{}")); aspect.command(point);
  verify(dispatcher).proxyGet("/api/v1/schedules/"+addressed); verify(dispatcher,never()).proxyGet("/api/v1/schedules/"+requested);
  verify(audit).recordDetails(eq("schedule.proxyPut"),eq("schedule"),eq(addressed),eq("ACCEPTED"),any(),any(),argThat(changes->((java.util.Map<?,?>)changes.get("requested")).get("pipelineId").equals(requested)));
 }

}
