package ru.spasibo.bilt.fdeapi.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/v1/audit")
public class AuditController {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public AuditController(JdbcTemplate jdbc, ObjectMapper mapper) { this.jdbc = jdbc; this.mapper = mapper; }
    @GetMapping
    @PreAuthorize("@permissionService.currentUserHasRole('ADMIN')")
    public Map<String,Object> list(@RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size,
        @RequestParam(required=false) String actor, @RequestParam(required=false) String action,
        @RequestParam(required=false) String targetType, @RequestParam(required=false) String targetId, @RequestParam(required=false) String result,
        @RequestParam(required=false) String correlationId, @RequestParam(required=false) Instant from,
        @RequestParam(required=false) Instant to) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE || (from != null && to != null && from.isAfter(to)))
            throw new IllegalArgumentException("Invalid audit pagination or interval");
        StringBuilder where = new StringBuilder(" where true"); List<Object> args = new ArrayList<>();
        String[] columns = {"actor", "action", "target_type", "target_id", "result", "correlation_id"};
        String[] values = {actor, action, targetType, targetId, result, correlationId};
        for (int i=0;i<columns.length;i++) if (values[i]!=null && !values[i].isBlank()) {
            if(values[i].length()>128) throw new IllegalArgumentException("Filter too long");
            if (i==0) { where.append(" and (actor = ? or actor_name = ?)"); args.add(values[i]); args.add(values[i]); }
            else { where.append(" and ").append(columns[i]).append(" = ?"); args.add(values[i]); }
        }
        if(from!=null) { where.append(" and occurred_at >= ?"); args.add(java.sql.Timestamp.from(from)); }
        if(to!=null) { where.append(" and occurred_at <= ?"); args.add(java.sql.Timestamp.from(to)); }
        Long count=jdbc.queryForObject("select count(*) from audit.events"+where,Long.class,args.toArray());
        args.add(size); args.add((long)page*size);
        var content=jdbc.query("select * from audit.events"+where+" order by occurred_at desc,id desc limit ? offset ?", (rs,n)-> {
            Map<String,Object> row=new LinkedHashMap<>();
            row.put("id",rs.getLong("id")); row.put("occurredAt",rs.getTimestamp("occurred_at").toInstant());
            row.put("actor",rs.getString("actor")); row.put("actorName",rs.getString("actor_name")); row.put("action",rs.getString("action"));
            row.put("targetType",rs.getString("target_type")); row.put("targetId",rs.getString("target_id"));
            row.put("result",rs.getString("result")); row.put("correlationId",rs.getString("correlation_id"));
            try { row.put("changes",mapper.readTree(rs.getString("changes"))); }
            catch(java.io.IOException ex) { throw new java.sql.SQLException("Invalid stored audit changes"); }
            return row;
        },args.toArray());
        return Map.of("content",content,"page",page,"size",size,"totalElements",count,"totalPages",(count+size-1)/size);
    }
}
