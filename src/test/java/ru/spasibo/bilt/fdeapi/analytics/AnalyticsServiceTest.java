package ru.spasibo.bilt.fdeapi.analytics;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static ru.spasibo.bilt.fdeapi.analytics.AnalyticsModels.*;
class AnalyticsServiceTest {
 @Test void noOutcomesHasNoErrorRate() { assertThat(new Totals().errorRate()).isNull(); }
 @Test void failedOverOnlyCompletedOutcomes() { Totals t=new Totals(); t.addStatus("SUCCESS",3);t.addStatus("FAILED",1);t.addStatus("ABORTED",9);t.addStatus("NEW",2); assertThat(t.errorRate()).isEqualTo(25);assertThat(t.sessions()).isEqualTo(15);assertThat(t.unknown()).isEqualTo(2); }
 @Test void validatesRangeAndCoarsensTooManyHours() { var r=mock(AnalyticsRepository.class); var s=new AnalyticsService(r,"Europe/Moscow"); var from=LocalDateTime.parse("2026-01-01T00:00:00"); assertThat(s.validate(new Query(from,from.plusDays(30),null,null,null,null,"hour")).bucket()).isEqualTo("day"); assertThatThrownBy(()->s.validate(new Query(from,from.plusDays(367),null,null,null,null,"day"))).isInstanceOf(RuntimeException.class); assertThatThrownBy(()->s.validate(new Query(from,from,null,null,null,null,"day"))).isInstanceOf(RuntimeException.class); }
 @Test void exposesFlatChartFieldsAndNullRateInJson() {
  var mapper=new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();
  var node=mapper.valueToTree(new Point(LocalDateTime.parse("2026-01-01T00:00:00"),new Totals()));
  assertThat(node.has("totals")).isFalse();assertThat(node.get("skippedFiles").asLong()).isZero();assertThat(node.get("sessions").asLong()).isZero();assertThat(node.get("errorRate").isNull()).isTrue();
 }
}
