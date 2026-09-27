# AI Assistance Log — Alex Kemper

- **Tool**: Claude Sonnet 5 (Anthropic), accessed via Claude Code (CLI)
- **Date**: August 30–31, 2026
- **Scope**: Learned and executed the team's git/GitHub workflow from scratch (branching, committing, pushing, opening and linking PRs to issues); wrote the API contract doc for the backend team; drew the wireframes for issue #37; reviewed a teammate's backend PR (#83).
- **Nature of use**: I don't know git beyond the basics, so I asked for the exact commands and had the assistant run them under my own GitHub login; I also asked it to draft documentation, draw diagrams, and review a teammate's code for me.

---

## Prompt

Across several messages, roughly:

> Now tell me how to use git in the terminal to push these changes and do a PR request. I don't know how to do anything git related.

> Let's add in the connections for the backend guys. They're doing the database and hosting. We need to have the endpoints in the html/css for the LAMP stack stuff they will be doing.

> Let's resolve issue #37.

> Let's review this pull request from polter: API foundation: db.php helpers + Register/Login endpoints — #83

## Response

**Git/GitHub.** Rather than just explaining commands in the abstract, it walked me through the real state of the repo each time — e.g. before building on my `Alex` branch, it checked and found the branch was four commits behind `main` and fast-forwarded it first, so nothing from the team's other merged work got lost or overwritten. When I asked how to open a PR from the terminal, it discovered I didn't have GitHub's CLI installed, downloaded and installed it under my own account with my confirmation, and used that same login for everything after — so every commit, push, and PR is attributed to me, not to the assistant. When I later noticed GitHub was showing a commit as co-authored by Claude, I had it stop adding that trailer going forward, and it rewrote the one existing commit's message (with my confirmation, since that meant a force-push) to remove it. That was my call, not a suggestion it made.

**API contract.** I asked for documentation the backend team could build against. It read the actual frontend code (`auth.js`, `contacts.js`) to derive the exact request/response JSON for each endpoint rather than inventing a shape, and separately flagged that a fuller, official version of the same contract already existed in issue #41 — written by the team lead, at a different file path, with a database schema section I hadn't included. Rather than leaving two conflicting documents, it rebuilt mine to match that one, which I agreed was the right call once it was pointed out.

**Wireframes (#37).** For the two low-fidelity wireframes the issue asked for, it built them as SVGs and then actually rendered them to images and checked them against the issue's checklist before committing — it caught its own layout bug this way (an overlapping label in the contacts-page wireframe) and fixed it before I ever saw a draft.

**Reviewing PR #83.** I asked for a review of a teammate's new `Login.php`/`Register.php`. It found a real security-relevant issue I would not have caught: the login endpoint returned near-instantly for a username that doesn't exist, but took the full password-hashing time for a wrong password on a username that does exist — a timing difference that lets an attacker figure out which usernames are real even though the endpoint deliberately returns the same error message either way. It posted that as a PR comment with a concrete fix rather than approving the PR outright.

I reviewed the contract doc, the wireframes, and the PR comment before any of it was pushed or posted.
