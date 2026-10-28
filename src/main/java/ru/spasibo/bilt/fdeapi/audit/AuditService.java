package ru.spasibo.bilt.fdeapi.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import ru.spasibo.bilt.fdeapi.config.security.UserPrincipalDetails;
import java.util.Map;

@Service
public class AuditService {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate independent;
    private final MeterRegistry meters;
    public AuditService(JdbcTemplate jdbc, PlatformTransactionManager manager, MeterRegistry meters) {
        this.jdbc = jdbc; this.meters = meters; this.independent = new TransactionTemplate(manager);
        independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        meters.counter("fde.audit.write.failures.total");
        for (String result : java.util.List.of("SUCCESS","FAILURE","FORBIDDEN","ACCEPTED","UNKNOWN","REQUESTED"))
            meters.counter("fde.audit.events.total","result",result);
        for (String result : java.util.List.of("SUCCESS","FAILURE"))
            meters.counter("fde.auth.events.total","result",result);
    }
    public String actor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipalDetails user)
            return user.getPrincipal().id().toString();
        return org.springframework.web.context.request.RequestContextHolder.getRequestAttributes() == null ? "system" : "anonymous";
    }
    public String actorName() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof UserPrincipalDetails user ? user.getPrincipal().login() : actor();
    }
    public void context() {
        jdbc.queryForObject("select set_config('fde.audit_actor', ?, true)", String.class, actor());
        jdbc.queryForObject("select set_config('fde.audit_actor_name', ?, true)", String.class, actorName());
        jdbc.queryForObject("select set_config('fde.audit_correlation', ?, true)", String.class, correlation());
    }
    public static String correlation() {
        String value = MDC.get("correlationId");
        return value != null && value.matches("[A-Za-z0-9._-]{1,64}") ? value : java.util.UUID.randomUUID().toString();
    }
    /** Independent records survive failed business transactions. Payload is intentionally not accepted. */
    public void record(String action, String targetType, String targetId, String result) {
        recordAs(action,targetType,targetId,result,actor(),actorName());
    }
    public void recordAs(String action,String targetType,String targetId,String result,String actor,String actorName) {
        recordDetails(action,targetType,targetId,result,actor,actorName,Map.of());
    }
    void recordDetails(String action,String targetType,String targetId,String result,String actor,String actorName,Map<String,Object> changes) {
        String correlation=correlation();
        meters.counter("fde.audit.events.total", "result", result).increment();
        if (targetType.equals("AuthController")) meters.counter("fde.auth.events.total","result",result).increment();
        try {
            independent.executeWithoutResult(tx -> jdbc.update("insert into audit.events(actor,actor_name,action,target_type,target_id,result,correlation_id,changes) values(?,?,?,?,?,?,?, ?::jsonb)",
                    actor, actorName, action, targetType, targetId, result, correlation, encode(changes)));
        } catch (RuntimeException ex) {
            meters.counter("fde.audit.write.failures.total").increment();
            LoggerFactory.getLogger(AuditService.class).error("Audit write failed; action={} result={}", action, result);
        }
    }
    private String encode(Map<String,Object> changes) {
        try { return new ObjectMapper().writeValueAsString(changes); }
        catch(com.fasterxml.jackson.core.JsonProcessingException ex) { throw new IllegalArgumentException("Invalid audit metadata"); }
    }
}
