# Pipeline operations improvements

Approved in chat on 2026-11-06 by «Продолжай» following the six-part proposal.

- Direct sessions link on each pipeline; fixed pipeline ID, all retained history, existing filters and preserved return state.
- Failure streak across completed SUCCESS/FAILED sessions, ignoring ABORTED and active sessions. Warning at 2; critical at 3+. Successful completion resets streak. Informational only, never stop automatically.
- Admin-only calendar action on each pipeline, reusing ScheduleSection with error-safe reload. Readers see schedules only.
- Daily successful sent/received operations and bytes, separate directions, no deduplication; missing sizes explicitly incomplete. Reuse analytics daily graphs, show today's summary in list.
- Optional agreed volume stored as bytes plus RUN/DAY/MONTH (DAY default). Zero in update clears agreement. Existing pipelines remain unconfigured. Display current-period consumption; no enforcement.
- Datacenter: page sizes 20/50/100/200, select current page or all matching filters across pages. Freeze explicit IDs before mutation, cancel collection and report failures rather than partial selection masquerading as complete. Never interpret an empty selection as all pipelines. Preserve existing execution flow and admin authorization.
- Preserve RLS/client code scoping, admin-only writes and audit. All calculations server-side from persisted sessions, no browser-wide history loads. UTC/source zone as configured; grouping by session start time stays explicit.
