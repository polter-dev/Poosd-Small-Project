# AI Assistance Log — Marcus Ruth


- **Tool**: Claude Fable 5 (Anthropic), accessed via Claude Code (CLI)
- **Date**: August 26, 2026
- **Scope**: Project planning only — reworking the GitHub issue tracker (labels, stage tracking issues, role-tagged task issues, milestones) from the assignment spec and Progress Guide. No application code was generated.
- **Nature of use**: Read the assignment PDF, Progress Guide, and course LAMP sample; asked me design questions; then created/closed/labeled GitHub issues with the `gh` CLI. All issue text was reviewed by me before use.

---

## Prompt

> This is a school based project, please read the context folder to understand what the project is, and how its going to be implemented (LAMP stack), alongside understand design constraints,
>
> anything mentioned in this document is all thats needed, there shouldnt be any other features besides whats listed.
>
> During this planning period, I want to close all github issues and correspond roles to each issue and have each stage as an issue, and keep having a tag for each role, the roles that are taken as follows: frontend, databases, api, and project manger
>
> as a general note the PM should be a diverse role working on what theyre stronger with, alongside just helping the entire group.
>
> During this planning stage for the rework of github issues, all issues shoulkd have tags correspond to team and other supplemental tags, and should read in plain english, and be easy to comprehend for humans to read, and agents to understand and also help implement.
>
> Dont assume anything and ask design questions if necessary

## Response

Before building anything, the assistant asked design questions and the following decisions were made:

- Roles → people are assigned later; issues carry role labels only, no GitHub assignees.
- Old issues closed silently as "not planned".
- Auth: PHP `password_hash()` / `password_verify()`; after login the client stores `userId` in a cookie and sends it with each request (matches the course sample and PR #30).
- User account fields: first name, last name, username (unique), password.
- Contact fields: first name, last name, phone, email.
- Search: one box; server-side `LIKE '%term%'` across all four contact fields, restricted to the logged-in user; empty search returns all of that user's contacts.
- Logout included. Two pages: `index.html` (login + register) and `contacts.html`.
- Server/domain/deploy issues labeled `role:project-manager` (hosting via Cloudflare already exists).
- Supplemental labels: stage + type + priority.

**Closed** the 28 old issues (#2–#29) as "not planned", no comments.

**Created 19 labels**: `role:frontend` / `role:api` / `role:databases` / `role:project-manager`, `epic`, `stage:0-planning` … `stage:5-presentation`, `type:feature/infra/design/testing/docs`, `priority:high/medium/low`.

**Created 6 stage tracking issues** (each has a task checklist that renders as a progress bar, plus GitHub sub-issue links) and **40 task issues**:

| Stage | Epic | Tasks | Roles involved |
|---|---|---|---|
| 0 Planning & Design | #31 | #37–#41 (wireframes, ERD, UML, Gantt, API contract) | frontend, databases, PM, api |
| 1 Infrastructure | #32 📌 | #42–#48 (server, domain, schema, seed data, `db.php`, repo workflow, deploy process) | PM, databases, api |
| 2 Authentication | #33 📌 | #49–#54 (Register/Login APIs, login page, AJAX wiring, logout + page guard) | api, frontend |
| 3 Contacts | #34 📌 | #55–#64 (Add/Search/Edit/Delete APIs, contacts page, search/add/edit/delete UI, styling) | api, databases, frontend |
| 4 Quality & API demo | #35 | #65–#71 (auth/CRUD/privacy tests, SwaggerHub, Lighthouse, standards review, campus check) | PM + each role, api, frontend |
| 5 Presentation | #36 | #72–#76 (slides, README + AI disclosure, sign-up sheet, rehearsal, WebCourses submission) | PM |

Every task issue follows the same plain-English shape — **What / Why (quotes the spec or rubric line) / Details (file names, JSON shapes, SQL, curl tests) / Acceptance criteria / Depends on** — and has exactly one stage, one type, one priority, and ≥1 role label. Audit passed: 46 open, 28 closed, zero unresolved cross-references, 40/40 sub-issue links succeeded.

**Things worth knowing**
- No assignees were set, per the answer that people get mapped to roles later. Server/domain/deploy issues (#42, #43, #48, #71) are labeled `role:project-manager` with a note that Cloudflare hosting already exists — relabel if that's not who owns it.
- The API contract issue (#41) is the keystone: endpoint names and JSON keys match Richard's open PR #30 exactly, so his draft needs no renaming. PR #30 itself was left untouched.

**Next step**: map teammates to roles, have each person self-assign from their role label, and start with Stage 0/1 (#41 API contract and #42–#44 unblock almost everything else).

---

## Follow-up (same session)

- Read the Small Project Progress Guide and added 5 dated GitHub milestones (Week 1 roles 8/30, Week 2 database 9/6, Week 3 auth API 9/13, Week 4 auth frontend 9/20, presentation 9/27), 3 new issues (#77 roles in spreadsheet, #78 weekly check-ins / contribution balance, #79 SQL inspection queries), and amended #40, #44, #45, #47, #49, #50, #51, #74, #75 and epics #31–#33 with the checkpoints. Verified every rubric line in the assignment maps to at least one issue.
