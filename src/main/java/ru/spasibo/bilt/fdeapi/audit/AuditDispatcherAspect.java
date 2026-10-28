package ru.spasibo.bilt.fdeapi.audit;
import com.fasterxml.jackson.databind.*;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.stereotype.Component;
import org.springframework.http.ResponseEntity;
import java.util.*;
@Aspect @Component
public class AuditDispatcherAspect {
    private final AuditService audit;
    private final ObjectMapper mapper;
    public AuditDispatcherAspect(AuditService audit,ObjectMapper mapper) { this.audit=audit; this.mapper=mapper; }
    @Around("execution(public * ru.spasibo.bilt.fdeapi.adapter.out.dispatcher.DispatcherClient.proxyPost(..)) || execution(public * ru.spasibo.bilt.fdeapi.adapter.out.dispatcher.DispatcherClient.proxyPut(..)) || execution(public * ru.spasibo.bilt.fdeapi.adapter.out.dispatcher.DispatcherClient.proxyDelete(..))")
    public Object command(ProceedingJoinPoint point) throws Throwable {
        Object[] args=point.getArgs(); String path=(String)args[0];
        String type=path.startsWith("/api/v1/schedules") ? "schedule" : "execution";
        String action=type+"."+point.getSignature().getName();
        Map<String,Object> safe=args.length>1 ? safeMetadata((String)args[1],mapper) : new LinkedHashMap<>();
        String target=(String)safe.getOrDefault("pipelineId",safe.get("sessionId"));
        if(target==null || !point.getSignature().getName().equals("proxyPost")) { String last=path.substring(path.lastIndexOf('/')+1); try { target=UUID.fromString(last).toString(); } catch(IllegalArgumentException ignored) {} }
        String actor=audit.actor(), name=audit.actorName();
        Map<String,Object> changes=new LinkedHashMap<>();
        if(!safe.isEmpty()) changes.put("requested",safe);
        if(type.equals("schedule") && target!=null && !point.getSignature().getName().equals("proxyPost")) {
            try {
                var before=((ru.spasibo.bilt.fdeapi.domain.port.DispatcherPort)point.getTarget()).proxyGet("/api/v1/schedules/"+target);
                if(before.getStatusCode().is2xxSuccessful()) changes.put("before",safeMetadata(before.getBody(),mapper));
                else changes.put("beforeUnavailable",true);
            } catch(RuntimeException ignored) { changes.put("beforeUnavailable",true); }
        }
        audit.recordDetails(action,type,target,"REQUESTED",actor,name,changes);
        try {
            Object response=point.proceed();
            int status=response instanceof ResponseEntity<?> entity ? entity.getStatusCode().value() : 500;
            String result=status>=500 ? "UNKNOWN" : status>=400 ? "FAILURE" : "ACCEPTED";
            if(status<400 && response instanceof ResponseEntity<?> entity && entity.getBody() instanceof String body) {
                var observed=safeMetadata(body,mapper); if(!observed.isEmpty()) changes.put("response",observed);
            }
            audit.recordDetails(action,type,target,result,actor,name,changes); return response;
        } catch(Throwable ex) { audit.recordDetails(action,type,target,"UNKNOWN",actor,name,changes); throw ex; }
    }
    static Map<String,Object> safeMetadata(String body,ObjectMapper mapper) {
        Map<String,Object> safe=new LinkedHashMap<>();
        try {
            JsonNode node=mapper.readTree(body);
            for(String key:List.of("pipelineId","sessionId")) if(node.hasNonNull(key)) {
                try { safe.put(key,UUID.fromString(node.get(key).asText()).toString()); } catch(IllegalArgumentException ignored) {}
            }
            for(String key:List.of("cron","cronExpression","timezone")) if(node.hasNonNull(key) && node.get(key).isTextual()) {
                String value=node.get(key).asText();
                if(value.length()<=128 && value.matches("[A-Za-z0-9*?,/# ._+\\-:]+")) safe.put(key,value);
            }
            for(String key:List.of("enabled","active")) if(node.has(key) && node.get(key).isBoolean()) safe.put(key,node.get(key).booleanValue());
        } catch(Exception ignored) { /* No raw request material is retained on malformed JSON. */ }
        return safe;
    }
}
