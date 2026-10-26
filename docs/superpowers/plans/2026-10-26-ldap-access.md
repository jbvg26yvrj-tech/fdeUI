# LDAP and client-scoped access implementation plan

> For agentic workers: apply subagent-driven-development and dispatching-parallel-agents for the independent file ownership below. Review integrated changes before deployment.

**Goal:** Implement the approved LDAP lifecycle, administrator settings, role-scoped pipelines, and permission-aware UI.
**Architecture:** Extend existing Spring Boot/JPA/JWT and React application. Identity lifecycle, data scopes, and UI are separate ownership areas with fixed HTTP contracts.
**Tech Stack:** Java 17, Spring Boot 3.5, PostgreSQL/Flyway, LDAP SDK, React/TypeScript/Vite/Vitest.
**Spec:** docs/superpowers/specs/2026-10-26-ldap-access-design.md

## Global constraints
- Only this Documents/api-main repository is the source of changes; work in place on feature/ldap-access per user preference.
- LOCAL login remains available. LDAP accounts auto-provision without roles. No fallback from LDAP to LOCAL.
- ADMIN manages LDAP and roles. Client scopes compare complete codes case-insensitively, source OR destination. Multiple scopes union; existing RLS intersects. No scope means no pipeline data.
- Read-only initial roles DWH, PC, OFD, PI, LKPP, SDP. Mutations require separate permissions and scope checks.
- TLS validation mandatory; no secrets returned or committed. Directory errors never deactivate accounts.

## HTTP contracts
- POST /api/v1/auth/login: existing login/password plus optional provider LOCAL|LDAP (default LOCAL); existing AuthResponse, optional user.authSource.
- GET /api/v1/auth/providers: {ldapEnabled:boolean} public.
- GET/PUT /api/v1/settings/ldap: enabled, syncEnabled, directoryType AD|LDAP, url, tlsMode LDAPS|STARTTLS, baseDn, bindDn, userFilter, activeFilter, loginAttribute, idAttribute, displayNameAttribute, emailAttribute, syncIntervalMinutes, connectTimeoutMs, readTimeoutMs. PUT optional bindPassword; omitted/empty preserves. GET bindPasswordConfigured only, never bindPassword.
- POST /api/v1/settings/ldap/test: unsaved configuration, same shape as PUT; {success,message}.
- POST /api/v1/settings/ldap/sync: synchronous bounded sync, {status,message,checked,updated,deactivated,finishedAt}.
- GET /api/v1/settings/ldap/sync: same status fields, latest result.
- Existing roles GET/POST/PUT add clientCodes:string[]; omitted PUT preserves. Empty array means no data scope. Existing response fields remain compatible.

## Task 1 — LDAP identity and settings
Owner: LDAP worker. Backend auth/user/configuration classes, new ldap package, pom.xml, migrations V9 (confirm latest first), corresponding tests. No role/pipeline/session classes or UI.
- [ ] Add failing tests for auto-provision/repeat login, disabled identity, encrypted secret roundtrip and hidden secret responses, settings admin denial, sync failure preserving activity and session revocation.
- [ ] Implement LDAP adapter with real bind/search, escaped filter values, stable ID, AD activity checks, TLS/timeouts and integration tests against in-memory LDAP server.
- [ ] Persist config and user identity metadata; coordinate sync through database lock and apply only complete results. Preserve manual blocks and check current user activity for JWT/refresh.
- [ ] Run targeted Maven tests; preserve existing constructors/contracts where tests rely on them or update tests meaningfully. Report exact commands and failures.

## Task 2 — Role scopes and server enforcement
Owner: access worker. Role entities/DTOs/ports/adapters/controllers, pipeline/session services and trigger/schedule scope enforcement, new AccessScopeService, migration V10 and corresponding tests. No auth/user lifecycle files, pom or UI.
- [ ] Add failing tests: DWH sees DWH→PC and OFD→DWH but not PC→OFD; two roles union; empty scopes deny; ADMIN bypass.
- [ ] Persist role clientCodes in dedicated table; seed roles and read resource assignments without overwriting existing roles.
- [ ] Apply one policy before pagination and to by-ID reads, sessions, create/update/delete, triggers, schedules, batch actions. Filter errors deny. Existing RLS remains an additional restriction.
- [ ] Test direct-ID and mutation bypass attempts, custom role scope assignment and denied non-admin role editing.

## Task 3 — UI
Owner: UI worker. ui/** only, including tests/config/package lock. Use frontend-design for intentional FDE login design.
- [ ] Add failing tests for provider switch, no-permission landing, ADMIN-only settings and role client-code form.
- [ ] Implement new login, about page, settings LDAP form/test/sync state, protected routes and menu. Preserve existing registration/local flow and avoid exposing settings during context loading.
- [ ] Extend existing role form/types/API with clientCodes; unknown or missing scopes must never imply unrestricted access.
- [ ] Run UI tests, build and type checking. Verify responsive layout and accessible labels.

## Task 4 — Integration and delivery
Owner: parent. docs, deployment configuration, cross-component integration fixes and verification.
- [ ] Review exact API shapes, migration numbering and identity/scopes consistency; compile whole backend, run full tests and UI build.
- [ ] Independent review of integrated diff focusing on authorization, LDAP identity binding, TLS, sync failure handling and secret exposure; fix verified findings.
- [ ] Package from new repository, back up test DB, supply encryption key as deployment secret, deploy image and verify health.
- [ ] Verify browser login/settings/about/roles, API client-scope cases, and LDAP integration through test directory. Corporate AD cannot be claimed tested without its connection details.
- [ ] Update operations docs, record validation and commits; report URL and remaining real-AD configuration.

## Integration ledger
- Preflight: auth worker owns user lifecycle; scope worker owns role/pipeline/session; UI consumes explicit HTTP contracts. No overlapping implementation files; parent resolves integration.
- Work in current repository on feature branch to honor user instruction. No new external checkout.
