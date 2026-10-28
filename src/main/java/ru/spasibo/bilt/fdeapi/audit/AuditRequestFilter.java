package ru.spasibo.bilt.fdeapi.audit;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.HandlerMapping;
import java.io.IOException;

/** Records semantic request outcomes; committed state is recorded independently by DB triggers. */
@Component
@Order(0)
public class AuditRequestFilter extends OncePerRequestFilter {
    private final AuditService audit;
    public AuditRequestFilter(org.springframework.beans.factory.ObjectProvider<AuditService> audit) { this.audit=audit.getIfAvailable(); }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)
            throws ServletException,IOException {
        if(audit == null) { chain.doFilter(request,response); return; }
        String method=request.getMethod(), path=request.getRequestURI();
        boolean mutation=java.util.Set.of("POST","PUT","PATCH","DELETE").contains(method) && path.startsWith("/api/v1/");
        if(!mutation) { chain.doFilter(request,response); return; }
        boolean remote=path.startsWith("/api/v1/triggers") || path.startsWith("/api/v1/schedules");
        // Never persist literal URLs, query strings, bodies, headers, exception messages or responses.
        String area=area(path);
        boolean[] failed={false};
        try { chain.doFilter(request,response); }
        catch(ServletException|IOException|RuntimeException ex) { failed[0]=true; throw ex; }
        finally {
            int status=response.getStatus();
            String result=status==403 ? "FORBIDDEN" : status>=400 ? "FAILURE" : remote ? "ACCEPTED" : "SUCCESS";
            if(failed[0]) result=remote ? "UNKNOWN" : "FAILURE";
            if(remote && status>=500) result="UNKNOWN";
            Object template=request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
            String action=method+" "+(template instanceof String ? template : "/api/v1/"+area);
            audit.record(action,area,null,result);
        }
    }
    static String area(String path) {
        String[] parts=path.split("/");
        if(parts.length<4) return "unknown";
        return java.util.Set.of("auth","users","roles","resources","rls","pipelines","schedules","triggers",
            "ldap","loki","information","settings","user-settings","user-roles","role-resources").contains(parts[3]) ? parts[3] : "other";
    }
}
