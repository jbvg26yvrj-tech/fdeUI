# Client Viewer Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement and review the tasks.

**Goal:** Restrict client users to scoped viewing and expose current schedules.
**Architecture:** Central effective permissions policy in PermissionService; preserve AccessScopeService exact client matching and legacy RLS. UI consumes the effective policy and guards admin controls explicitly.
**Tech Stack:** Java 17, Spring Security/JPA, React/TypeScript, Vitest.
**Spec:** docs/superpowers/specs/2026-10-27-client-viewer-design.md

## Global Constraints
- Only ADMIN can mutate pipelines/schedules, trigger or stop execution, manage roles/users/settings.
- Client roles see pipelines, sessions, analytics, schedules within exact source OR destination client-code scope.
- No new dependencies unless essential; do not fabricate schedule metadata.

### Task 1: Server policy and tests
Files: PermissionService.java, relevant REST controllers, user context service, src/test/java access tests.
- [x] Trace permission/context and schedule/trigger endpoints; verify every read is scoped.
- [x] Add tests for viewer permissions without resource assignments, legacy write grants denied, admin granted, no scope denied.
- [x] Implement effective resource computation shared by hasPermission and user context. Explicitly protect all mutation controllers and management endpoints.
- [x] Run targeted then complete Java tests using Java17 and -DskipUI with a /private/tmp build directory.

### Task 2: Viewer UI and schedules
Files: usePermissions.ts, Sidebar.tsx, pipeline list/cards/details, ScheduleSection.tsx, role form, UI tests.
- [x] Guard every mutation control with ADMIN, navigation with effective read policy.
- [x] Render current cron schedules in pipeline list/cards, readable full details with safe loading/error/empty states; reuse dispatcher API and avoid unbounded queries.
- [x] Clarify role client-code editing and read-only permissions; maintain existing role assignment workflow.
- [x] Add viewer-vs-admin interaction tests; run Vitest/build and compare typecheck baseline.

### Task 3: Review, release and live verification
- [x] Independently review final diff for authorization bypass, unscoped schedule reads, stale grants and UI regressions.
- [x] Fix confirmed findings; verify clean diff, tests, UI build.
- [ ] Commit, archive, deploy using existing backed-up release workflow.
- [ ] Verify authenticated scoped reads, denied writes even with legacy grants, admin controls, cron rendering in browser. Remove only disposable verification records created for this task, if any.

## Verification before release
- Java: 197 tests passed, /private/tmp/viewer-backend-full.log.
- UI: 44 tests passed; production build passed.
- Typecheck: 11 pre-existing errors, no new diagnostic signatures (baseline 18).
- Independent review: schedule concurrency finding fixed with shared four-request semaphore and regression test; no remaining production findings.
- Stand dispatcher is ClusterIP-only; host has no public dispatcher listener.
