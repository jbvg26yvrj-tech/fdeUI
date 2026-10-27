# UI usability implementation plan

User-authorized seven browser comments: home link, settings icon, permissions organization/RLS explanation, updated light/dark palettes, pipeline navigation restoration/highlight, filtering usability, clickable session cards.

Design: compact operations console. Main permissions tasks users/roles/assignments stay visible; secondary resource maintenance and optional RLS separate with plain explanations. Pipeline list keeps page/filter/sort/view/scroll when opening details and returning; identify last visited item. Common filters inline with removable chips, advanced controls collapsed. Accessible card navigation with nested controls independent. Palette preference requested asynchronously; default cool neutrals and teal if unanswered. Semantic success/warning/error colors preserved.

- [x] Navigation task: preserve list state scoped by user/resource and tab; same-tab details with explicit back link; support browser Back, no unconditional page1; restore scroll after data loads and highlight last visited pipeline. Clickable session cards via accessible link/button avoiding nested control activation. Regression tests for remount/page2/filter/sort and keyboard/card menu isolation.
- [x] Presentation task: FDE home link uses permission-aware landingPath, settings gear; reorganize permissions without losing assignment/RLS functionality; light/dark tokens plus contrast/keyboard states and responsive cards. No backend policy changes.
- [x] Filter task: frequent fields immediately visible; advanced field selector for rest, meaningful active-value count/chips/removal, clear reset, debounce per field with no dropped updates or delayed reset resurrection.
- [x] Verify: whole UI Vitest/build/typecheck against existing11 errors; review navigation lifecycle, API filter contracts, contrast, permission behavior. Deploy with existing backup workflow. Browser verify list return position/highlight, session click, logo, permissions structure and both themes. Record limitations and evidence.

Implementation verification: full UI suite 66/66 passed; after final advanced-filter fix, focused filter suite 8/8 passed (new regression added). Production build passed. Typecheck retains eight pre-existing diagnostics (previous baseline eleven), no new diagnostics. Independent review findings addressed: preserve controls during refresh, hydrate view by identity, preserve pending advanced fields, highlight card surface. Deployment/browser verification completed below.


## Deployment and browser verification (2026-10-28)

- Deployed commit `f44c7af`, image `fde-local/api:ui-usability-20261027`, with pre-release database and deployment backups. Rollout completed, API/dispatcher/Postgres/executor stub all Ready; HTTPS health check passed.
- Browser at 1140×664: temporary DWH user with one item per page opened pipeline from page 2, returned using in-app back link: page 2, card view, scroll and visible card highlight retained. Two quick filters (name QA + recipient DWH) both applied, survived browser Back from details.
- Session card opened full session details directly. FDE home link returned to pipelines. DWH menu remained limited to pipelines, sessions, analytics and about.
- Admin: settings gear visible; primary permissions navigation and expanded RLS section verified; RLS explanation shown. Light and dark palettes visually inspected. Restored admin login and original light theme, left pipelines card view open.
- Temporary user deactivated and role detached after checks. Existing pipeline data unchanged.
- Screenshots: `fde-return-highlight.png`, `fde-permissions-dark.png`, `fde-usability-light.png` under `/Users/kirillkolomoec/.codex/visualizations/2026/10/26/01a17768-2a4a-76c1-bb6d-7390ed5217a7/`.
- Known limitation: full typecheck still has eight pre-existing errors in legacy permissions/types; production build passes. Return page/scroll snapshots are in-memory per tab/user/query, intended for navigation back to lists, not full browser restarts.
