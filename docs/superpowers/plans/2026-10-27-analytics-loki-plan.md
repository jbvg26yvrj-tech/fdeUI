# Analytics and Loki Implementation Plan

> **For agentic workers:** Use subagent-driven-development with bounded ownership and independent review. Steps use checkbox tracking.

**Goal:** Ship database-backed pipeline analytics and configurable external Loki log viewing in the FDE admin panel.
**Architecture:** Read-only aggregate queries over existing session tables, scoped by AccessScopeService. An independent Loki adapter stores encrypted connection secrets and serves bounded session-scoped searches through the API. React routes consume stable DTOs.
**Tech Stack:** Java 17, Spring Boot/JPA, PostgreSQL, React/TypeScript, existing CSS tokens; no external dashboard service.
**Spec:** ../specs/2026-10-27-analytics-loki-design.md

## Global constraints
- Work only in Documents/api-main on feature/ldap-access; user explicitly requested that repository, no new checkout.
- No local Loki deployment, executor execution, fabricated metrics, secret disclosure, or unrelated refactoring.
- Preserve existing RLS and require API permissions. New permissions are seeded as resources, not assigned automatically to all users.
- Original CRLF files retain line endings. Java test build output uses /private/tmp to avoid cloud-synced target duplication.
- Workers do not commit, deploy or run full suites concurrently; parent integrates and verifies.

## Shared interface contracts

All routes below are relative to /api/v1. Dates in analytics query are local ISO datetime interpreted in configured sourceTimeZone; response declares that zone. Loki dates are ISO instants.

```ts
type Totals = { sessions:number; success:number; failed:number; aborted:number; active:number; prepare:number; unknown:number; errorRate:number|null; receivedFiles:number; receivedBytes:number; sentFiles:number; sentBytes:number; failedFiles:number; unknownSizeFiles:number };
type AnalyticsQuery = { from:string; to:string; pipelineId?:string; clientFrom?:string; clientTo?:string; datacenter?:string; bucket?:'hour'|'day' };
type AnalyticsOverview = { summary:Totals; series:({time:string}&Totals)[]; generatedAt:string; sourceTimeZone:string; bucket:string; lastStart:string|null; lastSuccess:string|null; warnings:string[] };
type AnalyticsSession = { id:string; pipelineId:string; pipelineName:string; startDt:string; status:string; errorMessage:string|null; receivedFiles:number; receivedBytes:number; sentFiles:number; sentBytes:number; failedFiles:number; unknownSizeFiles:number };
// GET /analytics/overview?AnalyticsQuery and GET /analytics/pipelines/{id}?AnalyticsQuery -> AnalyticsOverview
// GET /analytics/sessions?AnalyticsQuery&page=0&size=20&status=FAILED -> {content:AnalyticsSession[],page:number,size:number,totalElements:number,totalPages:number}

type LokiConnection = { id?:string; name:string; description:string; enabled:boolean; baseUrl:string; authType:'NONE'|'BASIC'|'BEARER'; username:string; tenantId:string; labels:Record<string,string>; sessionField:string; pipelineField:string; levelField:string; correlationMode:'JSON'|'METADATA'; datacenter:string; timeoutSeconds:number; limit:number; maxHours:number; secretConfigured?:boolean; secret?:string; clearSecret?:boolean };
// ADMIN GET /settings/loki -> LokiConnection[]; POST /settings/loki and PUT /settings/loki/{id} -> sanitized LokiConnection
// ADMIN POST /settings/loki/test with connection draft -> {success:boolean,message:string}
// GET /logs/connections -> {id:string,name:string,datacenter:string,sessionField:string,maxHours:number,limit:number}[] (safe enabled list)
// GET /logs?connectionId&sessionId?&from&to&level?&text?&limit? -> response below
// non-admin must supply authorized sessionId; admin may view infrastructure logs.
type LogsResponse = {entries:{timestamp:string;line:string;labels:Record<string,string>}[];truncated:boolean;message:string|null};
```

## Task 1: Analytics backend

Files: create analytics/AnalyticsController.java, AnalyticsService.java, AnalyticsRepository.java, AnalyticsModels.java under src/main/java/ru/spasibo/bilt/fdeapi; corresponding tests under src/test/java/ru/spasibo/bilt/fdeapi/analytics.
Consumes AccessScopeService.sessions/pipelines and existing entities. Produces AnalyticsOverview and paged AnalyticsSession above. Parent owns ResourceDefinition and runtime source timezone.

- [ ] Write failing tests proving SUCCESS Upload contributes once per record, Download kept separate, repeated names not collapsed, FAILED rows excluded from success counts, null errorRate on no outcomes.
```java
assertThat(summary.errorRate()).isNull();
assertThat(summary.sentFiles()).isEqualTo(2); // two successful Upload rows, even same filename
```
- [ ] Implement validated <=366-day query range, read-only scoped aggregates without loading all file entities; hour/day series <=400 buckets. Aggregate files per session before joining session counts. Use repeatable read or one statement for consistent overview.
- [ ] Add tests for scope/RLS, unknown status/size, empty data, pagination and bucket boundaries. Profile tests must not claim real PostgreSQL validation if only mocked.
- [ ] Run targeted Maven tests with Java17 and a task-specific /private/tmp build directory; report exact command/result.

## Task 2: Loki backend

Files: new loki package controllers/settings/service/client/DTO and tests; V11__loki_connections.sql. Parent owns shared permission resources and deployment secret/allowed-host settings. Uses existing permissionService and AccessScopeService.sessions.

- [ ] Write failing tests for escaped literal LogQL, missing non-admin session, forbidden session, empty successful response versus 401, secret redaction and TLS/host validation.
```java
assertThat(serializedConnection).doesNotContain("test-secret");
assertThat(result.entries()).isEmpty(); // valid empty query, not connection failure
```
- [ ] Implement multiple encrypted connections with FDE_LOKI_ENCRYPTION_KEY independent from LDAP; allowlisted hosts/ports configured server-side, no redirects, HTTPS verification, bounded body/time/range. Missing key only blocks secret writes/reads, not app startup.
- [ ] Compile query from saved labels and escaped literal fields. Authenticate/scoped-authorize before outbound request; require exact authorized session metadata for non-admin result rows. No arbitrary URL or tenant from query.
- [ ] Integrate controlled HTTP transport tests for success/error/timeout/malformed/oversized response. Explicitly mark truncation; first version asks narrower window instead of pretending pagination is complete at tied timestamps.
- [ ] Run targeted tests, report no real Loki validation until credentials supplied.

## Task 3: UI

Files: new features/analytics and features/logs, pages/analytics-page, pages/logs-page and pages/settings-page/LokiSettingsPage; UI tests; Sidebar, App.tsx, settings subnavigation. Own UI files only, use shared contracts above.

- [ ] Add behavioral tests for outdated-response rejection, error/empty distinctions, analytic navigation preserving session/period, connection secret not refilled, read-only users not seeing settings.
- [ ] Build aggregate cards, accessible SVG charts for status counts, files, volume and error rate, session table with paging and filters. Provide chart textual/table equivalents and route to pipeline overview; honor all actual DTO fields.
- [ ] Build settings connection list/editor/test/disable using draft, preserving old secret when blank; explicit clear. Settings navigation exposes LDAP and Loki without changing LDAP behavior.
- [ ] Build logs viewer with enabled connection selection, bounded dates, session, level/text filters, line details; show no connection, no results, forbidden, unavailable and truncation separately. Parse analytics session link timezone correctly, no browser-local implicit conversion.
- [ ] Test responsive/dark styles and targeted tests; no full build/deploy by worker.

## Task 4: Integration, review and deployment

Parent owns ResourceDefinition.java entries API_ANALYTICS_READ/PAGE_ANALYTICS/API_LOGS_READ/PAGE_LOGS, source timezone configuration, tests integration, docs and deployment.

- [ ] Verify runtime source timezone from DB/writer config read-only. Set source zone explicitly for test stand; mark test environment visibly.
- [ ] Add four resource enum entries; verify resource synchronizer assigns ADMIN access without granting new pages to all users.
- [ ] Reconcile DTOs/endpoints across workers before final build. Independently review SQL scope, secret handling, outbound constraints and UI transitions; fix actionable findings.
- [ ] Run backend full tests with -DskipUI and isolated target, UI full tests/build, TypeScript check against existing baseline. Tests for new code must pass, baseline errors documented separately.
- [ ] Commit tested changes, backup DB/deployment, deploy prebuilt UI + Java image. Generate Loki encryption key server-side without exposing it. No target host credentials guessed.
- [ ] Browser verify analytics empty/populated data using existing sessions, permissions and settings; no new execution for fake analytics data. Verify Loki configuration form and no-connection states, note that external connection awaits user-entered values.
- [ ] Save screenshot and report concrete results/limits and clean git status.
