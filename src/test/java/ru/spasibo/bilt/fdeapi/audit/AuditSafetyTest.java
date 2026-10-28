package ru.spasibo.bilt.fdeapi.audit;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class AuditSafetyTest {
 @AfterEach void clear() { MDC.clear(); }
 @Test void excludesArbitraryAndSecretRequestFields() {
  var safe=AuditDispatcherAspect.safeMetadata("{\"pipelineId\":\"123e4567-e89b-12d3-a456-426614174000\",\"cron\":\"0 */5 * * * ?\",\"password\":\"CANARY\",\"headers\":{\"Authorization\":\"CANARY\"},\"enabled\":true,\"props\":{\"secret\":\"CANARY\"}}",new ObjectMapper());
  assertThat(safe).containsOnlyKeys("pipelineId","cron","enabled");
  assertThat(safe.toString()).doesNotContain("CANARY");
 }
 @Test void invalidIdentifiersAndMalformedJsonNeverBecomeMetadata() {
  assertThat(AuditDispatcherAspect.safeMetadata("{\"pipelineId\":\"secret\",\"cron\":\"bad\\nvalue\"}",new ObjectMapper())).isEmpty();
  assertThat(AuditDispatcherAspect.safeMetadata("not json CANARY",new ObjectMapper())).isEmpty();
 }
 @Test void correlationIsBoundedAndRejectsHeaderInjection() {
  MDC.put("correlationId","good-id.123"); assertThat(AuditService.correlation()).isEqualTo("good-id.123");
  for(String value:java.util.List.of("x".repeat(65),"foo\nbar","secret token")) {
   MDC.put("correlationId",value); assertThat(AuditService.correlation()).matches("[a-f0-9-]{36}");
  }
 }
 @Test void rejectsInvalidPaginationBeforeQueryingDatabase() {
  JdbcTemplate jdbc=mock(JdbcTemplate.class); var controller=new AuditController(jdbc,new ObjectMapper());
  assertThatThrownBy(()->controller.list(-1,20,null,null,null,null,null,null,null,null)).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->controller.list(0,101,null,null,null,null,null,null,null,null)).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->controller.list(Integer.MAX_VALUE,100,null,null,null,null,null,null,null,null)).isInstanceOf(IllegalArgumentException.class);
  verifyNoInteractions(jdbc);
 }
}
