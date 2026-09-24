# AI Assistance Log — Marcus Ruth

- **Tool**: Claude Opus 5 (Anthropic), accessed via Claude Code (CLI). Sub-tasks were delegated to Claude subagents in the same session; the code review pass used Opus 5.
- **Date**: August 30, 2026
- **Scope**: Backend API foundation — `API/db.php` shared helpers, `API/config.example.php`, `API/Register.php`, `API/Login.php`, `API/sql/schema.sql` (issues #46, #49, #50). Opened PR #83.
- **Nature of use**: Code generation from a written contract, followed by an adversarial code review pass that found two runtime defects, followed by fixes. All output was reviewed by me before the PR was opened.
- **Testing**: initially written blind (no PHP/MySQL installed). PHP 8.5.10 and MySQL 26.7.0 were installed later in the same session and the full checklist was then executed against a real database — all cases pass. See "Testing" below.

---

## Prompt

> You are working in the repo Poosd-Small-Project (a UCF COP4331 "Small Project": a LAMP-stack Personal Contact Manager). Your task is to implement the backend API foundation: GitHub issues #46 (shared db.php helpers), #49 (Register API), and #50 (Login API). Read all three issues first.
>
> THE SOURCE OF TRUTH is docs/api-contract.md — read it before writing any code. It defines every endpoint name, request/response JSON shape, the MySQL schema, and shared-PHP conventions. If anything you write disagrees with it, the contract wins. Do NOT rename any JSON keys: the frontend in frontend/js/ is already coded against them exactly.
>
> Deliverables (all new files under API/):
> 1. API/db.php — opens a mysqli connection using values from API/config.php and defines the three helpers every endpoint uses: getRequestInfo() (decode the JSON request body), sendResultInfoAsJson($obj) (set Content-Type: application/json and echo), returnWithError($msg).
> 2. API/config.example.php — placeholder DB host/user/password/name, committed. The real API/config.php is git-ignored (verify .gitignore covers it; add it if not). Never commit real credentials.
> 3. API/Register.php — per the contract table: request { firstName, lastName, username, password }, response { id, firstName, lastName, error }. Reject empty fields. Hash with password_hash(). Duplicate username -> id: 0, error: "Username already taken".
> 4. API/Login.php — request { username, password }, response { id, firstName, lastName, error }. Verify with password_verify(). Bad credentials -> id: 0, error: "Username/password combination incorrect".
> 5. API/sql/schema.sql — the CREATE TABLE statements copied exactly from the contract's "Database schema" section (helps issue #44 later).
>
> Rules:
> - Every endpoint starts with require_once 'db.php'; and uses PREPARED STATEMENTS for all SQL. No string-interpolated queries anywhere.
> - Every response includes an "error" key: "" on success, short human-readable message on failure.
> - Plain PHP only — no frameworks, no Composer dependencies.
> - Match the existing reference style in "LAMP Stack/LAMP Stack/LAMPAPI/" only loosely; that code is the course starter and does NOT use prepared statements or password hashing — yours must.
>
> Testing: if PHP and MySQL are available locally, load schema.sql into a local database, fill in a local API/config.php, serve with `php -S localhost:8000` from the repo root, and exercise Register/Login with curl (register, duplicate register, good login, bad login), confirming each JSON response matches the contract. If a local PHP/MySQL setup isn't available, say so plainly in the PR description and list the untested paths — do not claim it was tested.
>
> The chrome MCP is installed for this task as well for in-browser viewing.
>
> Git: create a branch named marcus/api-foundation off the latest origin/main (pull first — PR #81 may have just merged). Make small, well-messaged commits as you complete each file. Open a PR to main titled "API foundation: db.php helpers + Register/Login endpoints (#46, #49, #50)" whose description lists what was tested and closes #46, #49, #50. Do not push to main directly.
>
> Scope limits: do NOT touch anything under frontend/ or docs/, do NOT implement the contact endpoints (#55–#58), and do NOT work on issue #82 (frontend escaping) — those belong to other people/agents.
>
> Please ensure to diversify tasks to subagents, you will review their work, if it appears appears to follow spec, submit the PR. After the PR is submitted I will check the PR myself and if something is wrong I will get it corrected afterwards.
>
> For code style please make sure agents write human readable, and plain english to proper understanding of the code base and human understanding as well.

### Follow-up prompts in the same session

> please launch an opus subagent to also get the verdict as well to ensure our work is flawless

---

## Response

### One correction to the premise

`docs/api-contract.md` **does not exist**. Issue #41, which asks someone to *create* that file, is still open and there is no `docs/` directory on `origin/main`. The contract text is written out in full inside issue #41 itself, so that issue body was used as the source of truth instead, and the JSON keys were cross-checked against `frontend/js/auth.js` (which already reads `response.id`, `.firstName`, `.lastName`, `.error`). This is called out in the PR description so nobody assumes a contract document was consulted.

`.gitignore` already covered `API/config.php` at line 46, so no change was needed there.

### Work delegated to subagents

Per the instruction to diversify, the writing was split across two subagents run in parallel, each given the contract text verbatim:

| Subagent | Files |
|---|---|
| A | `API/db.php`, `API/config.example.php`, `API/sql/schema.sql` |
| B | `API/Register.php`, `API/Login.php` |

A third subagent (Opus 5) was then run as an **adversarial reviewer** on the finished branch, instructed to find defects rather than to approve.

### My review of the subagents' output — one bug caught

Before the first commit, reviewing the two endpoints turned up a real defect: `Register.php` trimmed the password *before* hashing it, but `Login.php` did not trim before verifying. Anyone who signed up with a password like `" secret "` would have had the hash of `"secret"` stored and could never have logged back in. Fixed by trimming in both, with a comment tying the two files together. Also added a guard on the `INSERT` return value and removed the trailing `?>` tags so stray whitespace could not corrupt the JSON.

### The Opus review pass — two blockers I had missed

The reviewer's verdict was **"not mergeable as-is"**, and it was correct on both counts. Both defects were of a kind that only appears at runtime, which is exactly what inspection-only work is bad at catching:

1. **mysqli throws on PHP 8.1+.** Since PHP 8.1 the default error mode is `MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT`, so mysqli raises an exception rather than returning `false`. That made both the `$conn->connect_error` check in `db.php` and the `if (!$stmt->execute())` duplicate-race guard in `Register.php` **dead code** — including the guard I had just added myself in my own review. The uncaught exception produced an HTML 500 page containing the database username and the failing query, which is both a leak and unparseable by `api.js`.

2. **`trim()` on a non-string is fatal in PHP 8.** `?? ''` covers null and missing keys but not wrong *types*, so any unauthenticated request of the form `{"username":[]}` crashed both endpoints with a `TypeError`.

Fixed in commit `3afae7c`: `db.php` now pins the mysqli error mode explicitly, sets `display_errors=0`, and installs a `set_exception_handler` that logs the real reason server-side and returns a generic JSON error; `Register.php` catches MySQL error **1062** for genuine duplicates and re-throws anything else; a new `getTextField()` helper treats any non-string as "not filled in". Also added a `VARCHAR(50)` length check and an explicit `utf8mb4` charset on the database.

Two of the reviewer's suggestions were **declined**:
- Reshaping `returnWithError()` to include `{id, firstName, lastName}` — issue #46 specifies it as `['error' => $err]` exactly, and the contract wins over the suggestion.
- Touching the stale client-side-hashing TODO in `frontend/js/auth.js` — out of the stated scope.

Its checks on schema fidelity, SQL injection, `bind_param` type strings, byte hygiene, use-after-close, and frontend key/type alignment all came back clean, verified with `diff` and `xxd` rather than by eye.

### Result

Three commits on `marcus/api-foundation`, PR #83 opened against `main`. Notes recording the untested/undeployed status were added as comments on issues #46, #49, and #50 so none of them gets closed on the strength of the PR alone.

---

## Testing

The code was written **blind** — at the time there was no PHP or MySQL on this machine, so not even `php -l` could be run, and the first version of this log said so. PHP 8.5.10 and MySQL 26.7.0 were installed later in the same session, and the whole checklist was then run for real against a throwaway database on port 3307 (the machine already had an unrelated MySQL on 3306, which was left alone).

Results: `php -l` clean on all four PHP files; `schema.sql` loads and creates both tables; all 13 request cases pass, including valid/duplicate/empty/missing-key register, good/bad-password/unknown-user login, a `' OR '1'='1` injection attempt, an over-long name, an empty body, and malformed JSON. Stored password is bcrypt `$2y$12$`, 60 chars. `Content-Type: application/json` on every response. After twelve failing requests the `Users` table still held exactly one row, so no failure path writes junk.

Both blockers were confirmed fixed **at runtime**, which matters because PHP 8.5 is well past the 8.1 cutoff where mysqli started throwing:
- With the DB password deliberately broken, the response was JSON (`{"error":"Server error, please try again"}`), not an HTML 500, and grepping the body for `contactapp` returned 0 — the database username is no longer leaked. The real reason went to the server log.
- The 1062 duplicate-race catch was forced by running a temporary copy of `Register.php` with the `SELECT` pre-check removed; it returned `"Username already taken"` correctly. Temp file deleted afterwards.

**The lesson worth recording:** the two blockers were found by an adversarial review pass, not by writing the code carefully, and one of them killed a guard I had *just added myself* in my own review. Reading code caught a real bug (the trim mismatch), but only a second reviewer caught the version-dependent runtime behavior. Running it caught nothing further — but that is a fact learned after the fact, not a reason to have skipped it.

**Not deployed.** PR #83 is open, unapproved, and `main` does not contain it. There is no deploy step yet — files have to be copied onto the course web server by hand and `API/config.php` created there. The local `API/config.php` used for testing is git-ignored and points at the throwaway 3307 instance.

**Still unverified:** behavior on the real LAMP server, which will have different PHP and MySQL versions and possibly a different `sql_mode`.

**Known gap, out of scope:** these endpoints do not answer CORS preflight. Fine while the frontend and API share a domain (what #41 assumes), but `frontend/js/config.js` has a TODO to move the API to another host, which will need an `OPTIONS` response when it happens.

---

## For the README disclosure

Per the AI Disclosure Template, the substantial AI contribution to cite in the README's "AI Assistance" section is: the five files under `API/` (shared helpers, Register/Login endpoints, schema), generated by Claude Opus 5 via Claude Code from a written contract, reviewed and corrected by me across three passes. Inline attribution is not warranted per-function — the template says to avoid over-citing — but the `API/` files as a group were AI-generated and should be named in the README.
