package ru.spasibo.bilt.fdeapi.audit;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import ru.spasibo.bilt.fdeapi.adapter.in.rest.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
class AuditHttpValidationTest {
 @Test void invalidFiltersReturn400WithApplicationExceptionAdvice() throws Exception {
  var jdbc=mock(JdbcTemplate.class);
  var mvc=MockMvcBuilders.standaloneSetup(new AuditController(jdbc,new ObjectMapper())).setControllerAdvice(new GlobalExceptionHandler()).build();
  mvc.perform(get("/api/v1/audit").param("page","-1")).andExpect(status().isBadRequest());
  mvc.perform(get("/api/v1/audit").param("size","101")).andExpect(status().isBadRequest());
  mvc.perform(get("/api/v1/audit").param("from","2026-10-28T12:00:00Z").param("to","2026-10-27T12:00:00Z")).andExpect(status().isBadRequest());
  verifyNoInteractions(jdbc);
 }
}
