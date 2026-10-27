# Client viewer access model

Approved in chat: client roles grant read-only access to pipelines whose exact normalized source OR destination matches any assigned client code. Multiple client roles union their codes. ADMIN alone creates, updates, deletes, starts, stops, changes schedules and administers users/settings. No client scope means only the information page. Inactive users remain denied by existing authentication enforcement.

Client navigation: pipelines, sessions, analytics, information. Logs and administration remain ADMIN-only for this release. Pipeline schedules are readable only within pipeline scope, including cron, enabled state and timezone where the dispatcher provides it. Never invent a timezone or next execution. Show cron in pipeline list/cards and all schedule details in the pipeline detail. Preserve existing additional RLS restrictions rather than silently widening access by dropping them.

The effective permissions response and server checks use one policy. Legacy role resource grants cannot enable mutations for non-admins. All existing pipeline/session/analytics scope checks remain; tests cover cross-scope denial and exact matching. Role editing explains read-only client scopes and permits custom client roles. Advanced legacy restrictions remain available to administrators, clearly identified.

Migration is policy-driven, no destructive rewrites of existing assignments. Client roles automatically obtain the standard read set; admin keeps full access. Verify a client identity with deliberately assigned old write grants still cannot write. Deploy only after tests and review, backup using the existing stand release workflow.
