package ru.spasibo.bilt.fdeapi.audit;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.util.Set;

/** The outer transaction supplies actor context to row triggers and commits audit atomically. */
@Aspect
@Component
@Order(0)
public class AuditMutationAspect {
    private final AuditService audit;
    private final TransactionTemplate transaction;
    private static final Set<String> TYPES=Set.of("UserService","RoleService","RlsService","PipelineService",
        "AuthService","RegistrationSettingsService","LdapIdentityService","LdapSettingsService","LokiSettingsService","InformationService");
    public AuditMutationAspect(AuditService audit, PlatformTransactionManager manager) {
        this.audit=audit; this.transaction=new TransactionTemplate(manager);
    }
    @Around("execution(public * ru.spasibo.bilt.fdeapi.application.service.*.*(..)) || execution(public * ru.spasibo.bilt.fdeapi.ldap.*Service.*(..)) || execution(public * ru.spasibo.bilt.fdeapi.loki.LokiSettingsService.*(..)) || execution(public * ru.spasibo.bilt.fdeapi.information.InformationService.*(..))")
    public Object mutation(ProceedingJoinPoint point) throws Throwable {
        String type=point.getSignature().getDeclaringType().getSimpleName();
        String name=point.getSignature().getName();
        if(!TYPES.contains(type) || !name.matches("create|update|delete|save|saveRlsFilter|deleteRlsFilter|assign.*|remove.*|bulkUpdateDatacenter|register|login|refresh|logout|changePassword|loginIdentity|applyDirectoryState"))
            return point.proceed();
        try {
            return transaction.execute(tx -> {
                audit.context();
                try { return point.proceed(); }
                catch(RuntimeException|Error ex) { throw ex; }
                catch(Throwable ex) { throw new Wrapped(ex); }
            });
        } catch(Wrapped ex) { audit.record(type+"."+name,type,null,"FAILURE"); throw ex.getCause(); }
        catch(RuntimeException ex) { audit.record(type+"."+name,type,null,"FAILURE"); throw ex; }
    }
    private static final class Wrapped extends RuntimeException { Wrapped(Throwable cause) { super(cause); } }
}
