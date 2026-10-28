# Audit and Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Durable action audit and operational monitoring for Kubernetes.
**Architecture:** PostgreSQL audit events plus explicit safe mutation snapshots; JSON stdout and Micrometer; admin UI and private management endpoints.
**Tech Stack:** Java 17, Spring Boot, PostgreSQL/Flyway, React/TypeScript, Kubernetes, Prometheus.
**Spec:** docs/superpowers/specs/2026-10-28-audit-monitoring-design.md

## Global Constraints
- Work only in /Users/kirillkolomoec/Documents/api-main, preserve existing changes and role isolation.
- No credentials, tokens or arbitrary request/response bodies in audit or logs.
- Audit survives pod recreation; support multiple replicas; no local durable audit files.
- ADMIN-only audit read access; no audit mutation endpoints.
- Distinguish accepted remote commands from confirmed completed execution.
- No automatic audit deletion; document storage and archival.

### Task 1: Audit subsystem
- [x] Add Flyway audit schema, indexed paginated query API and explicit capture of allowed fields for mutations/auth/system sync.
- [x] Tests: successful mutation snapshot, rejected operation, rollback correctness, secret exclusion, ADMIN-only reads, stable paging.
- [x] Compile and run targeted Java tests, report coverage and limitations.
Files: new audit package and migration; existing controllers/services/security as required. Produces GET /api/v1/audit with documented filter/response contract for UI.

### Task 2: Audit UI
- [x] Add admin-only navigation/route and journal, filters, change details, loading/error/empty states using Task 1 contract.
- [x] Tests: non-admin denied, filter requests, details, escaped values.
Files: ui/src/features/audit, ui/src/pages/audit-page, layout/router/access.

### Task 3: Kubernetes observability
- [x] Harden correlation handling, structured request logs and metrics, private management endpoint and functional probes.
- [x] Provide Prometheus scrape/alert rules, Grafana dashboard, blackbox login check and runbook.
- [x] Test redaction, bounded metrics labels and management authorization; validate manifests and deployment compatibility.
Files: observability, application/security configuration, k8s and ops/monitoring.

### Task 4: Integration verification and release
- [x] Review combined changes independently and resolve findings.
- [x] Run Java/UI tests, TypeScript and production build.
- [x] Deploy teststand with DB backup; verify audit persistence/access, metric/probe boundaries and UI in browser.
- [x] Record exact results and production prerequisites.
