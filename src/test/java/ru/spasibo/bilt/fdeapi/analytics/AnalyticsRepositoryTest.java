package ru.spasibo.bilt.fdeapi.analytics;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.application.service.AccessScopeService;
import org.springframework.data.jpa.domain.Specification;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static ru.spasibo.bilt.fdeapi.analytics.AnalyticsModels.*;

@SpringBootTest(classes=AnalyticsRepositoryTest.Application.class,webEnvironment=SpringBootTest.WebEnvironment.NONE,properties={
 "spring.datasource.url=jdbc:h2:mem:analytics;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver","spring.datasource.username=sa","spring.datasource.password=",
 "spring.jpa.properties.hibernate.hbm2ddl.create_namespaces=true","spring.flyway.enabled=false","spring.jpa.hibernate.ddl-auto=create-drop","management.endpoint.health.validate-group-membership=false","analytics.source-time-zone=Europe/Moscow"})
class AnalyticsRepositoryTest {
 @SpringBootConfiguration @EnableAutoConfiguration @EntityScan(basePackageClasses={PipelineEntity.class,PipelineSessionEntity.class}) @Import({AnalyticsRepository.class,AnalyticsService.class}) static class Application{}
 @Autowired AnalyticsService service; @Autowired JdbcTemplate db; @MockitoBean AccessScopeService scope;
 UUID pipe=UUID.fromString("00000000-0000-0000-0000-000000000001"), other=UUID.fromString("00000000-0000-0000-0000-000000000002");
 LocalDateTime from=LocalDateTime.parse("2026-01-01T00:00:00");
 Query query(){return new Query(from,from.plusDays(1),null,null,null,null,"hour");}
 @BeforeEach void setup(){db.update("delete from sessions.processed_files");db.update("delete from sessions.task_sessions");db.update("delete from sessions.pipeline_sessions");db.update("delete from pipelines.pipelines"); when(scope.sessions()).thenReturn(Specification.allOf());
  for(UUID id:List.of(pipe,other))db.update("insert into pipelines.pipelines(id,pipeline_name,client_from,client_to,primary_datacenter,all_or_nothing,created_at,updated_at) values(?,?,?,?,?,false,?,?)",id,"pipe","DWH","PC","SP",from,from);
 }
 UUID session(UUID pipeline,String status,LocalDateTime time){UUID id=UUID.randomUUID();db.update("insert into sessions.pipeline_sessions(id,pipeline_id,start_dt,status,created_at,updated_at) values(?,?,?,?,?,?)",id,pipeline,time,status,time,time);return id;}
 void task(long id,UUID session,String type){db.update("insert into sessions.task_sessions(id,pipeline_session_id,task_order,type_code,is_done,props,created_at,updated_at) values(?,?,1,?,true,'{}',?,?)",id,session,type,from,from);}
 void file(long id,long task,String status,long bytes){db.update("insert into sessions.processed_files(id,task_session_id,file_name,file_size,status,created_at) values(?,?,'same.csv',?,?,?)",id,task,bytes,status,from.plusDays(2));}
 @Test void countsOperationsWithoutDedupAndWithoutMultiplyingSessions(){UUID s=session(pipe,"FAILED",from); task(1,s,"SftpDownloadTask");task(2,s,"SftpUploadTask");task(3,s,"SftpDeleteTask");file(1,1,"SUCCESS",10);file(2,2,"SUCCESS",10);file(3,2,"SUCCESS",10);file(4,2,"FAILED",90);file(5,3,"SUCCESS",99);file(6,2,"SUCCESS",-1);file(7,2,"SKIPPED",100);
  Totals t=service.overview(query()).summary();assertThat(t.sessions()).isEqualTo(1);assertThat(t.failed()).isEqualTo(1);assertThat(t.receivedFiles()).isEqualTo(1);assertThat(t.receivedBytes()).isEqualTo(10);assertThat(t.sentFiles()).isEqualTo(3);assertThat(t.sentBytes()).isEqualTo(20);assertThat(t.failedFiles()).isEqualTo(1);assertThat(t.skippedFiles()).isEqualTo(1);assertThat(t.unknownSizeFiles()).isEqualTo(1);assertThat(t.errorRate()).isEqualTo(100);
 }
 @Test void scopesEveryAggregateAndPageIncludingScopeAddedRoot(){UUID allowed=session(pipe,"SUCCESS",from),denied=session(other,"FAILED",from);task(1,allowed,"SftpUploadTask");task(2,denied,"SftpUploadTask");file(1,1,"SUCCESS",10);file(2,2,"SUCCESS",1000);
  when(scope.sessions()).thenReturn((s,q,cb)->{var p=q.from(PipelineEntity.class);return cb.and(cb.equal(s.get("pipelineId"),p.get("id")),cb.equal(p.get("id"),pipe));});
  assertThat(service.overview(query()).summary().sentBytes()).isEqualTo(10);assertThat(service.overview(query()).summary().sessions()).isEqualTo(1);var page=service.sessions(query(),0,20,null);assertThat(page.totalElements()).isEqualTo(1);assertThat(page.content().get(0).id()).isEqualTo(allowed);
 }
 @Test void halfOpenBoundsZeroFillAndPagination(){session(pipe,"ACTIVE",from);session(pipe,"NEW",from.plusHours(1));session(pipe,"FAILED",from.plusDays(1));session(pipe,"SUCCESS",from.minusSeconds(1));var o=service.overview(query());assertThat(o.summary().sessions()).isEqualTo(2);assertThat(o.summary().unknown()).isEqualTo(1);assertThat(o.summary().errorRate()).isNull();assertThat(o.series()).hasSize(24);assertThat(o.series().get(2).totals().sessions()).isZero();assertThat(o.series().get(2).totals().errorRate()).isNull();assertThat(service.sessions(query(),0,1,null).totalPages()).isEqualTo(2);assertThat(service.sessions(query(),1,1,null).content()).hasSize(1);assertThat(service.sessions(query(),2,1,null).content()).isEmpty();}
 @Test void emptySelectionAndAllHistoryLatest(){session(pipe,"SUCCESS",from.minusDays(2));var q=new Query(from,from.plusDays(1),pipe,null,null,null,"day");var o=service.overview(q);assertThat(o.summary().sessions()).isZero();assertThat(o.lastSuccess()).isEqualTo(from.minusDays(2));assertThat(o.lastStart()).isEqualTo(from.minusDays(2));}
 @Test void scopedPipelineChoicesAndExtraMetrics(){
  when(scope.pipelines()).thenReturn((p,q,cb)->cb.equal(p.get("id"),pipe));
  assertThat(service.pipelines("",0,10).totalElements()).isEqualTo(1);
  assertThat(service.pipelines("nonexistent",0,10).content()).isEmpty();
  session(pipe,"SUCCESS",from);UUID failed=session(pipe,"FAILED",from.plusHours(1));
  db.update("update sessions.pipeline_sessions set error_message='transfer failed' where id=?",failed);
  session(pipe,"FAILED",from.plusHours(2));session(other,"SUCCESS",from);
  var o=service.overview(new Query(from,from.plusDays(1),pipe,null,null,null,"day"));
  assertThat(o.extra().consecutiveFailures()).isEqualTo(2);assertThat(o.extra().successfulEmptySessions()).isEqualTo(1);
  assertThat(o.extra().commonErrors()).containsExactly(new CommonError("transfer failed",1));
  assertThat(service.sessions(query(),0,20,"FAILED","transfer failed").totalElements()).isEqualTo(1);
  assertThat(service.sessions(query(),0,20,"FAILED","missing").content()).isEmpty();
  assertThat(service.overview(query()).extra().consecutiveFailures()).isNull();
 }
 @Test void searchesPipelineIdWithoutBypassingAccessScope() {
  UUID allowed=UUID.fromString("abcdef12-3456-7890-abcd-123456789abc");
  db.update("update pipelines.pipelines set id=? where id=?",allowed,pipe);
  when(scope.pipelines()).thenReturn((p,q,cb)->cb.equal(p.get("id"),allowed));
  var found=service.pipelines("  "+allowed.toString().toUpperCase(Locale.ROOT)+"  ",0,10);
  assertThat(found.totalElements()).isEqualTo(1);
  assertThat(found.content()).extracting(PipelineOption::id).containsExactly(allowed);
  assertThat(service.pipelines(other.toString(),0,10).content()).isEmpty();
  assertThat(service.pipelines("PIPE",0,10).content()).extracting(PipelineOption::id).containsExactly(allowed);
  assertThat(service.pipelines("invalid-id",0,10).content()).isEmpty();
 }
 @Test void nullSizeNeverBecomesConfirmedVolume() {
  db.execute("alter table sessions.processed_files alter column file_size drop not null");
  UUID id=session(pipe,"SUCCESS",from);task(1,id,"MinioUploadTask");file(1,1,"SUCCESS",0);
  db.update("update sessions.processed_files set file_size=null where id=1");
  var o=service.overview(query());assertThat(o.summary().sentFiles()).isEqualTo(1);
  assertThat(o.summary().sentBytes()).isZero();assertThat(o.summary().unknownSizeFiles()).isEqualTo(1);
  assertThat(o.extra().successfulEmptySessions()).isZero();
 }
}
