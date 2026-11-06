# Pipeline Operations Implementation Plan

> Use subagent-driven-development to implement bounded responsibilities and review the combined patch.

**Goal:** Make history, schedules, transfer statistics and operational warnings accessible from the pipeline list, and support selection across filtered datacenter pages.
**Architecture:** Extend existing pipeline DTOs for optional volume agreement. Add scoped batched analytics summaries and reuse existing detailed analytics. Keep selection collection separate from destructive datacenter actions.
**Tech Stack:** Java/Spring/JPA/Flyway, React/TypeScript/Vitest.
**Spec:** ../specs/2026-11-06-pipeline-operations-design.md

## Constraints
Existing role/RLS controls remain authoritative. No automatic disabling. No secrets in audit. No new runtime libraries. Additive migration only.

## Task 1: Backend metadata and summaries
- [x] Test agreement validation/roundtrip and scoped summary behaviour (failed streak reset, ignored abort, incomplete sizes).
- [x] Add V15 migration, entity/DTO/mapping fields agreedVolumeBytes/agreedVolumePeriod.
- [x] Add GET /api/v1/analytics/pipeline-summaries?ids=uuid,... (1–200 distinct IDs), reusing scope checks and file aggregation.
- [x] Summary: id, consecutiveFailures, today totals, agreedVolumeBytes, agreedVolumePeriod, periodSentBytes, periodUnknownSizeFiles, sourceTimeZone.
- [x] Verify Java tests and review query/scoping behaviour.

## Task 2: Pipeline list operations
- [x] Add visible sessions link preserving list return state; keep server filters pipeline-bound.
- [x] Add admin-only schedule modal from cards/table, refresh summaries on close.
- [x] Consume batched summary with loading/error states, visible severity labels and today's bytes/files.
- [x] Link daily stats to existing analytics filtered by ID; show agreed-volume usage and unknown sizes.
- [x] Add warning filter with explicit page scope if global server support is absent; do not silently filter only current page under a global label.
- [x] Verify UI behaviour, routing and admin/viewer differences.

## Task 3: Agreement editor
- [x] Add validated volume and period controls to create wizard and edit form, include review and request mapping.
- [x] Test conversions, unset/clear, invalid and unsafe numeric values.

## Task 4: Datacenter selection
- [x] Test multi-page collection, filtering, deduplication, cancellation and errors.
- [x] Add page-size choices and explicit page/all-matching selection with count and frozen IDs.
- [x] Ensure no action can run while collecting, failed partial results are discarded, filter changes invalidate selection.

## Task 5: Combined verification
- [x] Run UI tests, TypeScript and production build; Java tests where runtime available.
- [x] Review regression, source diff and migrations; update Web UI guide.
- [x] Deploy verified artifact through existing teststand rollout/backup/smoke steps; verify PostgreSQL migration and actual served assets. Authenticated browser check was not performed: automatic review rejected exporting the stand credentials; credentials remain on the server.

## Verification ledger

- Canonical `ops/build/release.sh` passed locally with Java17 after fixing Bash3.2 empty-array compatibility.
- Final build: 237 Java tests, 118 UI tests; TypeScript and production UI build passed.
- JAR verification: 15 exact migrations, 45 exact UI files.
- Independent review covered access scopes, aggregation, DTO/migration agreement, selection and recovery.
- Selection is frozen after two consistent paged reads, not an atomic DB snapshot.
- Failed manual launch is not retried without an idempotency contract.
- Active datacenter wizard recovery remains in browser memory; UI warns against reload/close.
- Migration does not require ownership of executor-managed sessions tables.

## Teststand result

Release `pipeline-operations-20261106` deployed to minikube namespace `fde`. API pod Ready 1/1, zero restarts at verification. Audit, client viewer scoping and pipeline operations smoke checks passed on PostgreSQL. All 45 public UI files match the tested JAR byte-for-byte over HTTPS. No working flows were launched by smoke checks. The executor remains a test stub.
