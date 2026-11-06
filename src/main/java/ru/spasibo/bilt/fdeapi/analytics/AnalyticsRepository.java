package ru.spasibo.bilt.fdeapi.analytics;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.pipelines.entity.PipelineEntity;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.ProcessedFileEntity;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.*;
import org.springframework.stereotype.Repository;
import ru.spasibo.bilt.fdeapi.application.service.AccessScopeService;
import ru.spasibo.bilt.fdeapi.adapter.out.persistence.sessions.entity.PipelineSessionEntity;
import java.time.LocalDateTime;
import java.util.*;
import static ru.spasibo.bilt.fdeapi.analytics.AnalyticsModels.*;
/** Scalar database aggregates only: file joins never participate in session counters. */
@Repository
public class AnalyticsRepository  {
    private static final Set<String> DOWNLOAD=Set.of("SftpDownloadTask","FtpsDownloadTask","SmbDownloadTask","MinioDownloadTask");
    private static final Set<String> UPLOAD=Set.of("SftpUploadTask","FtpsUploadTask","SmbUploadTask","MinioUploadTask");
    private final EntityManager em;
    private final AccessScopeService scope;
    public AnalyticsRepository(EntityManager em,AccessScopeService scope) {
        this.em=em;
        this.scope=scope;
    }
    private Predicate filter(Query f,Root<PipelineSessionEntity> s,CriteriaQuery<?> query,boolean dates,String status)  {
        var cb=em.getCriteriaBuilder();
        List<Predicate> p=new ArrayList<>();
        // Scope may add roots to THIS criteria query. Never transplant its predicate to another query.
        var access=scope.sessions().toPredicate(s,query,cb);
        if(access!=null)p.add(access);
        if(dates) {
            p.add(cb.greaterThanOrEqualTo(s.get("startDt"),f.from()));
            p.add(cb.lessThan(s.get("startDt"),f.to()));
        }
        if(f.pipelineId()!=null)p.add(cb.equal(s.get("pipelineId"),f.pipelineId()));
        if(f.clientFrom()!=null&&!f.clientFrom().isBlank())p.add(cb.equal(s.get("pipeline").get("clientFrom"),f.clientFrom()));
        if(f.clientTo()!=null&&!f.clientTo().isBlank())p.add(cb.equal(s.get("pipeline").get("clientTo"),f.clientTo()));
        if(f.datacenter()!=null&&!f.datacenter().isBlank())p.add(cb.equal(s.get("pipeline").get("primaryDatacenter"),f.datacenter()));
        if(status!=null&&!status.isBlank())p.add(cb.equal(s.get("status"),status));
        return cb.and(p.toArray(Predicate[]::new));
    }
    private Expression<LocalDateTime> time(Root<PipelineSessionEntity> s,String bucket) {
        return em.getCriteriaBuilder().function("date_trunc",LocalDateTime.class,em.getCriteriaBuilder().literal(bucket),s.get("startDt"));
    }
    public Map<LocalDateTime,Totals> series(Query f)  {
        var cb=em.getCriteriaBuilder();
        var q=cb.createTupleQuery();
        var s=q.from(PipelineSessionEntity.class);
        var t=time(s,f.bucket());
        q.multiselect(t,s.get("status"),cb.count(s)).where(filter(f,s,q,true,null)).groupBy(t,s.get("status"));
        Map<LocalDateTime,Totals> result=new TreeMap<>();
        for(Tuple row:em.createQuery(q).getResultList())result.computeIfAbsent(row.get(0,LocalDateTime.class),k->new Totals()).addStatus(row.get(1,String.class),((Number)row.get(2)).longValue());
        for(Tuple row:fileRows(f,null))addFile(result.computeIfAbsent(row.get(0,LocalDateTime.class),k->new Totals()),row);
        return result;
    }
    private List<Tuple> fileRows(Query f,List<UUID> ids)  {
        var cb=em.getCriteriaBuilder();
        var q=cb.createTupleQuery();
        var s=q.from(PipelineSessionEntity.class);
        var task=s.join("taskSessions");
        var file=task.join("processedFiles");
        Expression<?> key=ids==null?time(s,f.bucket()):s.get("id");
        Expression<Long> known=cb.<Long>selectCase().when(cb.ge(file.<Long>get("fileSize"),0L),file.<Long>get("fileSize")).otherwise(0L);
        Expression<Long> unknown=cb.<Long>selectCase().when(cb.or(cb.isNull(file.get("fileSize")),cb.lt(file.<Long>get("fileSize"),0L)),1L).otherwise(0L);
        Set<String> types=new HashSet<>(DOWNLOAD);
        types.addAll(UPLOAD);
        Predicate p=cb.and(filter(f,s,q,true,null),task.get("typeCode").in(types));
        if(ids!=null)p=cb.and(p,s.get("id").in(ids));
        q.multiselect(key,task.get("typeCode"),file.get("status"),cb.count(file),cb.sum(known),cb.sum(unknown)).where(p).groupBy(key,task.get("typeCode"),file.get("status"));
        return em.createQuery(q).getResultList();
    }
    private void addFile(Totals t,Tuple row) {
        t.addFiles(DOWNLOAD.contains(row.get(1,String.class)),row.get(2,String.class),((Number)row.get(3)).longValue(),((Number)row.get(4)).longValue(),((Number)row.get(5)).longValue());
    }
    public LocalDateTime[] latest(Query f)  {
        if(f.pipelineId()==null)return new LocalDateTime[] {
            null,null
        }
        ;
        scope.requirePipeline(f.pipelineId());
        return new LocalDateTime[] {
            latest(f,null),latest(f,"SUCCESS")
        }
        ;
    }
    private LocalDateTime latest(Query f,String status) {
        var cb=em.getCriteriaBuilder();
        var q=cb.createQuery(LocalDateTime.class);
        var s=q.from(PipelineSessionEntity.class);
        q.select(cb.greatest(s.<LocalDateTime>get("startDt"))).where(filter(f,s,q,false,status));
        return em.createQuery(q).getSingleResult();
    }
    public Page sessions(Query f,int page,int size,String status,String errorMessage)  {
        var cb=em.getCriteriaBuilder();
        var cq=cb.createQuery(Long.class);
        var cr=cq.from(PipelineSessionEntity.class);
        Predicate countFilter=filter(f,cr,cq,true,status);
        if(errorMessage!=null)countFilter=cb.and(countFilter,cb.equal(cr.get("errorMessage"),errorMessage));
        cq.select(cb.count(cr)).where(countFilter);
        long count=em.createQuery(cq).getSingleResult();
        var q=cb.createTupleQuery();
        var s=q.from(PipelineSessionEntity.class);
        Predicate rowFilter=filter(f,s,q,true,status);
        if(errorMessage!=null)rowFilter=cb.and(rowFilter,cb.equal(s.get("errorMessage"),errorMessage));
        q.multiselect(s.get("id"),s.get("pipelineId"),s.get("pipeline").get("pipelineName"),s.get("startDt"),s.get("status"),s.get("errorMessage")).where(rowFilter).orderBy(cb.desc(s.get("startDt")),cb.desc(s.get("id")));
        var rows=em.createQuery(q).setFirstResult(page*size).setMaxResults(size).getResultList();
        Map<UUID,Totals> totals=new HashMap<>();
        if(!rows.isEmpty())for(Tuple row:fileRows(f,rows.stream().map(r->r.get(0,UUID.class)).toList()))addFile(totals.computeIfAbsent(row.get(0,UUID.class),k->new Totals()),row);
        List<Session> content=rows.stream().map(r-> {
            var t=totals.getOrDefault(r.get(0,UUID.class),new Totals());return new Session(r.get(0,UUID.class),r.get(1,UUID.class),r.get(2,String.class),r.get(3,LocalDateTime.class),r.get(4,String.class),r.get(5,String.class),t.receivedFiles(),t.receivedBytes(),t.sentFiles(),t.sentBytes(),t.failedFiles(),t.unknownSizeFiles());
        }
        ).toList();
        return new Page(content,page,size,count,(int)Math.min(Integer.MAX_VALUE,(count+size-1)/size));
    }
    public Extra extra(Query f)  {
        var cb=em.getCriteriaBuilder();
        var emptyQuery=cb.createQuery(Long.class);
        var session=emptyQuery.from(PipelineSessionEntity.class);
        var files=emptyQuery.subquery(Long.class);
        var file=files.from(ProcessedFileEntity.class);
        files.select(cb.literal(1L)).where(cb.equal(file.get("taskSession").get("pipelineSession").get("id"),session.get("id")));
        emptyQuery.select(cb.count(session)).where(cb.and(filter(f,session,emptyQuery,true,"SUCCESS"),cb.not(cb.exists(files))));
        long empty=em.createQuery(emptyQuery).getSingleResult();
        var errors=cb.createTupleQuery();
        var er=errors.from(PipelineSessionEntity.class);
        errors.multiselect(er.get("errorMessage"),cb.count(er))
        .where(cb.and(filter(f,er,errors,true,"FAILED"),cb.isNotNull(er.get("errorMessage")),cb.notEqual(cb.trim(er.get("errorMessage")),"")))
        .groupBy(er.get("errorMessage")).orderBy(cb.desc(cb.count(er)),cb.asc(er.get("errorMessage")));
        List<CommonError> common=em.createQuery(errors).setMaxResults(5).getResultList().stream()
        .map(r->new CommonError(r.get(0,String.class),((Number)r.get(1)).longValue())).toList();
        Long streak=null;
        if(f.pipelineId()!=null)  {
            var ids = List.of(f.pipelineId());
            streak = summaryFailureCounts(ids, latestSummarySessions(ids, Set.of("SUCCESS"), f), f)
                    .getOrDefault(f.pipelineId(), 0L);
        }
        return new Extra(streak,empty,common);
    }
    public PipelinePage pipelines(String search,int page,int size)  {
        var cb=em.getCriteriaBuilder();
        var count=cb.createQuery(Long.class);
        var cr=count.from(PipelineEntity.class);
        count.select(cb.count(cr)).where(pipelineFilter(search,cr,count));
        long total=em.createQuery(count).getSingleResult();
        var query=cb.createTupleQuery();
        var p=query.from(PipelineEntity.class);
        query.multiselect(p.get("id"),p.get("pipelineName"),p.get("clientFrom"),p.get("clientTo"),p.get("primaryDatacenter"))
        .where(pipelineFilter(search,p,query)).orderBy(cb.asc(p.get("pipelineName")),cb.asc(p.get("id")));
        var content=em.createQuery(query).setFirstResult(page*size).setMaxResults(size).getResultList().stream()
        .map(r->new PipelineOption(r.get(0,UUID.class),r.get(1,String.class),r.get(2,String.class),r.get(3,String.class),r.get(4,String.class))).toList();
        return new PipelinePage(content,page,size,total,(int)Math.min(Integer.MAX_VALUE,(total+size-1)/size));
    }
    private Predicate pipelineFilter(String search,Root<PipelineEntity> p,CriteriaQuery<?> query)  {
        var cb=em.getCriteriaBuilder();
        var access=scope.pipelines().toPredicate(p,query,cb);
        if(access==null)access=cb.conjunction();
        if(search==null||search.isBlank())return access;
        // Escape SQL LIKE wildcards so user text remains a literal search.
        String value=search.trim();
        String literal=value.toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_");
        Predicate match=cb.like(cb.lower(p.get("pipelineName")),"%"+literal+"%",'!');
        if(value.matches("(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) {
            match=cb.or(match,cb.equal(p.get("id"),UUID.fromString(value)));
        }
        return cb.and(access,match);
    }
    /** All input IDs must be visible. Every session/file query independently applies session scope. */
    public List<PipelineSummary> pipelineSummaries(List<UUID> ids, LocalDateTime today, String zone) {
        var cb = em.getCriteriaBuilder();
        var metadata = cb.createTupleQuery();
        var p = metadata.from(PipelineEntity.class);
        metadata.multiselect(p.get("id"), p.get("agreedVolumeBytes"), p.get("agreedVolumePeriod"))
                .where(cb.and(pipelineFilter(null, p, metadata), p.get("id").in(ids)));
        var rows = em.createQuery(metadata).getResultList();
        if (rows.size() != ids.size()) throw new org.springframework.security.access.AccessDeniedException("Pipeline access denied");
        Map<UUID, Tuple> agreements = new HashMap<>();
        rows.forEach(row -> agreements.put(row.get(0, UUID.class), row));
        var success = latestSummarySessions(ids, Set.of("SUCCESS"));
        var runIds = rows.stream().filter(row -> "RUN".equals(row.get(2, String.class))).map(row -> row.get(0, UUID.class)).toList();
        var monthIds = rows.stream().filter(row -> "MONTH".equals(row.get(2, String.class))).map(row -> row.get(0, UUID.class)).toList();
        var runs = runIds.isEmpty() ? Map.<UUID, SessionBoundary>of()
                : latestSummarySessions(runIds, Set.of("SUCCESS", "FAILED", "ABORTED"));
        var streaks = summaryFailureCounts(ids, success);
        var daily = summaryTotals(ids, today, today.plusDays(1), null);
        var monthly = monthIds.isEmpty() ? Map.<UUID, SummaryTotals>of()
                : summaryTotals(monthIds, today.withDayOfMonth(1), today.withDayOfMonth(1).plusMonths(1), null);
        var runTotals = runs.isEmpty() ? Map.<UUID, SummaryTotals>of()
                : summaryTotals(ids, null, null, runs.values().stream().map(SessionBoundary::id).toList());
        return ids.stream().map(id -> {
            var agreement = agreements.get(id);
            String period = agreement.get(2, String.class);
            if (period == null) period = "DAY";
            SummaryTotals used = switch (period) {
                case "RUN" -> runTotals.getOrDefault(id, new SummaryTotals());
                case "MONTH" -> monthly.getOrDefault(id, new SummaryTotals());
                default -> daily.getOrDefault(id, new SummaryTotals());
            };
            return new PipelineSummary(id, streaks.getOrDefault(id, 0L),
                    daily.getOrDefault(id, new SummaryTotals()).totals, agreement.get(1, Long.class),
                    period, used.totals.sentBytes(), used.outboundUnknownSizes, zone);
        }).toList();
    }

    private record SessionBoundary(LocalDateTime start, UUID id) {}
    private static class SummaryTotals {
        final Totals totals = new Totals();
        long outboundUnknownSizes;
    }
    private Predicate summaryScope(List<UUID> ids, Root<PipelineSessionEntity> s, CriteriaQuery<?> q) {
        var cb = em.getCriteriaBuilder();
        var access = scope.sessions().toPredicate(s, q, cb);
        return cb.and(access == null ? cb.conjunction() : access, s.get("pipelineId").in(ids));
    }
    /** Two bounded scalar result sets: latest start, then greatest textual UUID at that start.
     * Canonical UUID lexical order equals PostgreSQL UUID order and resolves timestamp ties. */
    private Map<UUID, SessionBoundary> latestSummarySessions(List<UUID> ids, Set<String> statuses) {
        return latestSummarySessions(ids, statuses, null);
    }
    private Map<UUID, SessionBoundary> latestSummarySessions(List<UUID> ids, Set<String> statuses, Query period) {
        var cb = em.getCriteriaBuilder();
        var times = cb.createTupleQuery();
        var s = times.from(PipelineSessionEntity.class);
        times.multiselect(s.get("pipelineId"), cb.greatest(s.<LocalDateTime>get("startDt")))
                .where(cb.and(summarySelection(ids, s, times, period), s.get("status").in(statuses)))
                .groupBy(s.get("pipelineId"));
        var starts = em.createQuery(times).getResultList();
        if (starts.isEmpty()) return Map.of();
        var lastIds = cb.createTupleQuery();
        var r = lastIds.from(PipelineSessionEntity.class);
        var pairs = starts.stream().map(t -> cb.and(cb.equal(r.get("pipelineId"), t.get(0, UUID.class)),
                cb.equal(r.get("startDt"), t.get(1, LocalDateTime.class)))).toArray(Predicate[]::new);
        // Hibernate 6.6 requires cast(), as() only changes the expression's Java type.
        Expression<String> uuidText = ((org.hibernate.query.criteria.JpaExpression<UUID>) r.<UUID>get("id")).cast(String.class);
        lastIds.multiselect(r.get("pipelineId"), cb.greatest(uuidText))
                .where(cb.and(summarySelection(ids, r, lastIds, period), r.get("status").in(statuses), cb.or(pairs)))
                .groupBy(r.get("pipelineId"));
        Map<UUID, LocalDateTime> startById = new HashMap<>();
        starts.forEach(t -> startById.put(t.get(0, UUID.class), t.get(1, LocalDateTime.class)));
        Map<UUID, SessionBoundary> result = new HashMap<>();
        for (var row : em.createQuery(lastIds).getResultList()) {
            UUID pipelineId = row.get(0, UUID.class);
            result.put(pipelineId, new SessionBoundary(startById.get(pipelineId), UUID.fromString(row.get(1, String.class))));
        }
        return result;
    }
    private Map<UUID, Long> summaryFailureCounts(List<UUID> ids, Map<UUID, SessionBoundary> successes) {
        return summaryFailureCounts(ids, successes, null);
    }
    private Map<UUID, Long> summaryFailureCounts(List<UUID> ids, Map<UUID, SessionBoundary> successes, Query period) {
        var cb = em.getCriteriaBuilder();
        var q = cb.createTupleQuery();
        var s = q.from(PipelineSessionEntity.class);
        List<Predicate> ranges = new ArrayList<>();
        for (UUID id : ids) {
            Predicate range = cb.equal(s.get("pipelineId"), id);
            SessionBoundary last = successes.get(id);
            if (last != null) range = cb.and(range, cb.or(cb.greaterThan(s.get("startDt"), last.start()),
                    cb.and(cb.equal(s.get("startDt"), last.start()), cb.greaterThan(s.<UUID>get("id"), last.id()))));
            ranges.add(range);
        }
        q.multiselect(s.get("pipelineId"), cb.count(s))
                .where(cb.and(summarySelection(ids, s, q, period), cb.equal(s.get("status"), "FAILED"), cb.or(ranges.toArray(Predicate[]::new))))
                .groupBy(s.get("pipelineId"));
        Map<UUID, Long> result = new HashMap<>();
        em.createQuery(q).getResultList().forEach(t -> result.put(t.get(0, UUID.class), ((Number)t.get(1)).longValue()));
        return result;
    }
    private Predicate summarySelection(List<UUID> ids, Root<PipelineSessionEntity> s, CriteriaQuery<?> q, Query period) {
        if (period == null) return summaryScope(ids, s, q);
        return em.getCriteriaBuilder().and(filter(period, s, q, true, null), s.get("pipelineId").in(ids));
    }
    private Predicate summaryRange(List<UUID> ids, Root<PipelineSessionEntity> s, CriteriaQuery<?> q,
                                   LocalDateTime from, LocalDateTime to, List<UUID> runs) {
        var cb = em.getCriteriaBuilder();
        Predicate p = summaryScope(ids, s, q);
        if (runs != null) return cb.and(p, s.get("id").in(runs));
        return cb.and(p, cb.greaterThanOrEqualTo(s.get("startDt"), from), cb.lessThan(s.get("startDt"), to));
    }
    private Map<UUID, SummaryTotals> summaryTotals(List<UUID> ids, LocalDateTime from, LocalDateTime to, List<UUID> runs) {
        var cb = em.getCriteriaBuilder();
        Map<UUID, SummaryTotals> result = new HashMap<>();
        var statuses = cb.createTupleQuery();
        var session = statuses.from(PipelineSessionEntity.class);
        statuses.multiselect(session.get("pipelineId"), session.get("status"), cb.count(session))
                .where(summaryRange(ids, session, statuses, from, to, runs)).groupBy(session.get("pipelineId"), session.get("status"));
        for (var row : em.createQuery(statuses).getResultList()) {
            result.computeIfAbsent(row.get(0, UUID.class), k -> new SummaryTotals()).totals
                    .addStatus(row.get(1, String.class), ((Number)row.get(2)).longValue());
        }
        var files = cb.createTupleQuery();
        var s = files.from(PipelineSessionEntity.class);
        var task = s.join("taskSessions");
        var file = task.join("processedFiles");
        Expression<Long> known = cb.<Long>selectCase().when(cb.ge(file.<Long>get("fileSize"), 0L), file.<Long>get("fileSize")).otherwise(0L);
        Expression<Long> unknown = cb.<Long>selectCase().when(cb.or(cb.isNull(file.get("fileSize")), cb.lt(file.<Long>get("fileSize"), 0L)), 1L).otherwise(0L);
        Set<String> types = new HashSet<>(DOWNLOAD); types.addAll(UPLOAD);
        files.multiselect(s.get("pipelineId"), task.get("typeCode"), file.get("status"), cb.count(file), cb.sum(known), cb.sum(unknown))
                .where(cb.and(summaryRange(ids, s, files, from, to, runs), task.get("typeCode").in(types)))
                .groupBy(s.get("pipelineId"), task.get("typeCode"), file.get("status"));
        for (var row : em.createQuery(files).getResultList()) {
            var totals = result.computeIfAbsent(row.get(0, UUID.class), k -> new SummaryTotals());
            addFile(totals.totals, row);
            if (UPLOAD.contains(row.get(1, String.class)) && "SUCCESS".equals(row.get(2, String.class))) {
                totals.outboundUnknownSizes += ((Number)row.get(5)).longValue();
            }
        }
        return result;
    }
}
