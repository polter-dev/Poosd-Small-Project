# AI Assistance Log — Nicolas Cadena

- **Tool**: Claude Opus 5 (Anthropic), accessed via Claude Code (CLI)
- **Date(s)**: September 23, 2026
- **Scope**: Presentation diagrams — use case, activity, and sequence (search) diagrams for the slide deck. Docs only, no application code.
- **Nature of use**: Diagram generation (PlantUML), iterative review, and verification against the merged codebase.

## Session arc

1. **Initial diagrams** (`4f33a10`) — Wrote three PlantUML diagrams traced from the actual code rather than from the API contract, so they'd show what really runs: the 250ms search debounce and stale-response guard in `contacts.js`, the `LIKE` escaping of `%`/`_`, and the `WHERE UserID = ?` scoping. Source and rendered PNGs both committed so no PlantUML renderer is needed to drop one into a slide.
2. **SVG copies** (`c5f6e9c`) — Added SVG renders alongside the PNGs since PNG pixelates when projected; PowerPoint imports SVG directly and can convert it to editable shapes if a label needs changing.
3. **Review feedback applied** (`51d93cf`) — Fixed a double-search bug in the activity diagram (a successful search had been re-triggering a redundant search-and-render), added the expired-session branch, dropped a non-standard `<<create>>` relationship between use cases, shortened sequence-diagram messages so none wrapped, and corrected the caller to `callApiWithDeadline()` (the deadline wrapper that had landed in `api.js` on `main`).
4. **Verification against merged code** (`b1c6239`) — After merging `main` in, checked every claim in the diagrams against the current `API/` and `frontend/js/`. Corrected the session-handling diagram: the app doesn't just check the cookie at page load, it re-checks every 20 seconds via `checkSessionStillValid()` and shows a modal overlay (rather than redirecting) when the cookie is gone; also noted that any click or keypress re-saves the cookie, so the 30-minute session timer runs from the last action, not from login. Added the column-rename step to the sequence diagram (`SearchContacts.php` maps `ID`/`FirstName`/... to `id`/`firstName`/... before responding) and a note on the `utf8mb4` connection charset.

All four commits were reviewed and tested by re-rendering the PNG/SVG output and re-reading it against the source before commit.
