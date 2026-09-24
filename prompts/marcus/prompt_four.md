# AI Assistance Log — Marcus Ruth


- **Tool**: Claude Opus 5 (Anthropic), accessed via Claude Code (CLI), with delegated subagents running Claude Opus 5 and Claude Sonnet 5
- **Date**: September 8, 2026
- **Scope**: Frontend redesign implementation — converting the design specified in `ref_frontend/handoff/DESIGN_GUIDE.md` (produced in [prompt_three](prompt_three.md)) into working code across `frontend/`. Six files changed: `contacts.html`, `index.html`, `css/styles.css`, `css/accessibility.css`, `js/contacts.js`, `js/auth.js`. No backend (PHP/MySQL), API logic, or database code was generated or modified.
- **Nature of use**: Code generation, automated code review, and browser-based verification, under an orchestration model — one AI session acted as a supervisor that delegated implementation to subagents, then dispatched separate reviewer subagents to audit the result. Substantial portions of the frontend presentation layer in this change were AI-generated. All architectural constraints and design trade-offs were decided by me (see *Human decisions* below).

---

## Prompt

> You are an ochrestration agent. You never implement code and only delegate tasks. During this session you will act as a supervisor and parralelize each task when possible using sonnet or opus agents based on your discretion.
>
> The goal for this session to refactor the entire front end, the current one has many issues with it and our team is not a fan of the design. In the current directory /ref_frontend/ contains documents pertaining to the redesign of the front end.
>
> The workflow should go like this,
>
> you dispatch agents, task them with which part they need to implement, brief them on what each agent needs to be doing. during this phase you should have them have a combined worktree they can push to so you can utilize the chrome mcp to self host, and navigate the webpage to ensure the build is going well. Please also utilize (subagents as well) mobbin mcp to have agents review to work. After an agent pushed to some work tree all agents have access to, dispatch an opus only reviewer agent that reports back to you with any bugs or issues the webpage has. Under no circumstance does the architecture/system of code change as we are only modifying the front end. Any issues discovered during this run, please ignore them for now and we will return to them another time. If the issue deals with the front end specifically and the directory does not reference it, please prompt me with a question and I will answer it accordingly.
>
> As a general note the main branch is locked, so any work that attempts to get pushed must be submitted through a PR hence the use of agents being able to review their own code in a work tree on each run. At the very end once the front end is fully redesigned is when we should submit a PR back to main.
>
> IF anything is unclear please consult me before dispatching agents.

## Response

### Method

The supervising session wrote no application code itself. It read the design guide and existing frontend, then delegated all implementation to subagents working in a shared git worktree branched from `origin/main`, with strict per-agent file ownership so concurrent agents could not overwrite each other.

Work proceeded in waves, each followed by an independent review:

| Phase | Agents | Work |
|---|---|---|
| Build | 4 parallel (Opus + Sonnet) | Design tokens and markup; contacts render layer; accessibility widget retheme; login page |
| Research | 1 (Sonnet) | Design-pattern critique of the guide via the Mobbin MCP |
| Review ×4 | Opus, one at a time | Independent audits of the full diff |
| Fix ×4 | Opus + Sonnet | Addressed every confirmed finding |

Across four review rounds, **24 issues** were found (1 blocker, 10 major, 9 minor, 4 nits) and all were fixed. Reviewers were instructed to verify by reproducing failures in a browser rather than by reading the diff — this mattered, because **four fixes that implementing agents had self-reported as passing did not actually hold** and were caught only on re-review. All were in the modal focus-trap machinery.

Representative defects found and fixed:

- The API returns HTTP 200 with an `error` field, so failed searches rendered as the innocuous "No contacts found" instead of surfacing the error.
- Out-of-order search responses could repaint the grid with results the user had already typed past.
- The Add panel's focus trap was inert — focus never entered the panel, so Tab walked into the background behind the scrim.
- Double-clicking Save created duplicate contacts.
- A stalled request left the delete dialog permanently unclosable (Escape and scrim-click both swallowed, both buttons disabled).
- 252px of horizontal scroll at 390px: `1fr` grid tracks share an automatic min-content minimum, so one 54-character contact name forced every card to 626px in a 390px viewport.

### Verification

Because the design requires states unreachable with normal data (loading skeletons, empty, server error), a **throwaway mock API server** was generated and run locally — Python standard library only, living in a scratchpad outside the repository, never committed. Its request/response shapes were derived from the actual PHP source in `API/` rather than from the contract document, and it seeded deliberately hostile data (a 54-character name, accented and apostrophe names, a blank first name, a 52-character email) to exercise text overflow and layout limits.

The `chrome-devtools` MCP named in the prompt was unusable — it requires Google Chrome, which is not installed on this machine. Verification was done by driving real headless Chromium through Playwright/Puppeteer instead, capturing console output, page errors and screenshots, and running `axe-core` accessibility audits.

Final verified state: 0 `axe-core` violations on both pages in both contrast modes, no horizontal scroll at any width from 320–1700px, XSS-safe rendering confirmed across card, `aria-label`, dialog title and panel, and a clean browser console.

### Human decisions

The AI paused and asked rather than assuming on every judgment call that would have changed the work. I decided each of the following:

1. **JS scope** — subagents could rewrite the DOM-building and UI-state code only; `callApi`, endpoint names, payload shapes, and session/cookie logic were off-limits.
2. **Accessibility widget** — keep all functionality, restyle to the new tokens.
3. **Local preview** — approved the throwaway mock server.
4. **Branch and PR target** — branch from `origin/main`, PR back into it.
5. **Delete dialog copy** — rejected a research-backed suggestion to add the contact name to the dialog body; kept the design guide's wording verbatim.
6. **Link contrast** — the guide's login link specified 1.86:1 against surrounding text, a WCAG 1.4.1 failure. Chose to underline it at rest rather than change the specified color.
7. **Pre-PR cleanup** — fix all five remaining minor defects before opening the PR rather than deferring them.
8. **Card header threshold** — see below.

On (8): the seed data's name-width distribution makes it mathematically impossible to both eliminate every truncation reversal and keep the guide's one-row card header. Avoiding reversals requires a threshold ≥467px; a one-row header at 1440px requires ≤412px. A subagent surfaced this trade-off rather than silently choosing. I chose design-guide fidelity, accepting two residual reversals affecting long names that already ellipsize at most widths.

### Result

Pull request [#93](https://github.com/polter-dev/Poosd-Small-Project/pull/93) — 13 commits, 6 files, +2400/−748, all under `frontend/`. `API/`, `docs/`, `js/api.js`, `js/config.js`, `js/accessibility.js` and `js/scroll-reveal.js` are byte-identical to `main`; endpoint names, payload shapes and session logic are unchanged; every original element id is preserved.

### Limitations

- Testing was Chromium-only; Safari and Firefox were not exercised. This matters for the `:has()` selector and CSS container query the redesign uses, though both degrade to prior behavior where unsupported.
- No real screen-reader pass. Live regions were verified structurally via the browser accessibility tree and `axe-core`, not by listening to VoiceOver or NVDA.
- All API behavior was exercised against the mock, not the real PHP backend.

---

Inline attribution: adapted CSS and markup carries the comment format established in [prompt_three](prompt_three.md):

```css
/* AI-assisted: styles adapted from Claude-generated design reference (contacts-sample.html), modified for project */
```

All AI-generated code was reviewed, tested in a browser, and revised across four audit cycles before submission. The architectural constraints, design trade-offs and scope boundaries reflect my decisions, and the final implementation was verified against the team's design guide before the pull request was opened.
