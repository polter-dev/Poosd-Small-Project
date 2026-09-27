# Poosd-Small-Project
A full-stack Personal Contact Manager built with the LAMP stack. Users can register, log in, and privately add, edit, delete, and search contacts. The app uses a remote MySQL database, REST-style APIs, JSON communication, AJAX requests, and server-side partial search.

# Live URL to the website
https://contacts.cop4331ruth.lol/

# API documentation (SwaggerHub)
https://app.swaggerhub.com/apis/monklys/Personal_Contact_Manager_API/1.0.0

The same definition is committed at `docs/swagger.yaml`.

## AI Assistance Disclosure

This project was developed with assistance from generative AI tools. Every
team member who used AI kept a per-prompt log — what was asked, what the
tool did, and how it was verified before being used — under `prompts/<name>/`.
Those logs are the detailed record; this table is the required summary.

| Teammate | Tool(s) | Scope |
|---|---|---|
| [Alex](prompts/alex/) | Claude Sonnet 5, via Claude Code (CLI) | Accessibility widget (high contrast/zoom/read-aloud) and its bug fixes; git/GitHub workflow; API contract authoring; wireframes (#37); XSS fix (#82); closing out #51/#59/#64; code review and fixes on teammates' PRs (#83, #92) |
| [Ethan](prompts/ethan/) | ChatGPT (GPT-5.x) | Database schema/seed-data review and validation |
| [Marcus](prompts/marcus/) | Claude (Fable 5 / Opus 5), via Claude Code (CLI) | GitHub issue tracker rework; one WCAG contrast fix (#90) |
| [Matthew](prompts/matthew/) | Claude Opus 5, via Claude Code (VS Code) | `AddContact.php` and related backend work |
| [Nicolas](prompts/nicolas/) | Claude Opus 5, via Claude Code (CLI) | `SearchContacts.php`, `EditContact.php`, `DeleteContact.php`; SwaggerHub spec; UML/use-case diagrams |
| [Richard](prompts/richard/) | Claude, via Claude Code (CLI/IDE) | Initial frontend scaffold (`frontend/`), later substantially modified/replaced |

All AI-generated code was reviewed, tested, and in many cases modified before
being merged. Where a session caught a genuine bug (a login-timing side
channel, an XSS gap, a focus-management regression that made keyboard focus
silently fail on every dialog open), the relevant `prompts/` entry says so
explicitly — including the cases where the bug was only found because the
assistant was asked to verify its own work in a real browser rather than
assert it was correct.
