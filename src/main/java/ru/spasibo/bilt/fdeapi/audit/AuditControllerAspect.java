package ru.spasibo.bilt.fdeapi.audit;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.http.ResponseEntity;
import ru.spasibo.bilt.fdeapi.ldap.LdapSyncService;
import ru.spasibo.bilt.fdeapi.ldap.LdapSettingsService;
@Aspect @Component @Order(10)
public class AuditControllerAspect {
    private final AuditService audit;
    public AuditControllerAspect(AuditService audit) { this.audit=audit; }
    @Around("execution(public * ru.spasibo.bilt.fdeapi.adapter.in.rest.AuthController.*(..)) || execution(public * ru.spasibo.bilt.fdeapi.ldap.LdapSyncService.runNow(..)) || execution(public * ru.spasibo.bilt.fdeapi.ldap.LdapSettingsService.test(..)) || execution(public * ru.spasibo.bilt.fdeapi.loki.LokiSettingsService.test(..))")
    public Object outcome(ProceedingJoinPoint point) throws Throwable {
        String method=point.getSignature().getName();
        if(java.util.Set.of("providers","validate").contains(method)) return point.proceed();
        String type=point.getSignature().getDeclaringType().getSimpleName();
        try {
            Object response=point.proceed(); String result="SUCCESS";
            if(response instanceof LdapSyncService.SyncResult sync) result="SUCCESS".equals(sync.status()) ? "SUCCESS" : "RUNNING".equals(sync.status()) ? "ACCEPTED" : "FAILURE";
            if(response instanceof LdapSettingsService.TestResult test && !test.success()) result="FAILURE";
            if(response instanceof ru.spasibo.bilt.fdeapi.loki.LokiModels.TestResult test && !test.success()) result="FAILURE";
            if(response instanceof ResponseEntity<?> entity && entity.getBody() instanceof ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.AuthResponse auth)
                audit.recordAs(type+"."+method,type,null,result,auth.getUser().getId().toString(),auth.getUser().getLogin());
            else if(response instanceof ResponseEntity<?> entity && entity.getBody() instanceof ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.response.UserResponse user)
                audit.recordAs(type+"."+method,type,null,result,user.getId().toString(),user.getLogin());
            else audit.record(type+"."+method,type,null,result);
            return response;
        } catch(Throwable ex) {
            String attempted=null;
            for(Object arg:point.getArgs()) if(arg instanceof ru.spasibo.bilt.fdeapi.adapter.in.rest.dto.request.LoginRequest login) attempted=login.getLogin();
            if(attempted!=null && attempted.length()<=100 && attempted.matches("[^\\p{Cntrl}]+"))
                audit.recordAs(type+"."+method,type,null,"FAILURE","anonymous",attempted);
            else audit.record(type+"."+method,type,null,"FAILURE");
            throw ex;
        }
    }
}
