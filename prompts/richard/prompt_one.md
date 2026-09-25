# AI Assistance Log — Richard Magiday

- **Tool**: Claude (Anthropic), accessed via Claude Code (CLI/IDE). The exact model version was not recorded for this session.
- **Date**: August 26, 2026
- **Scope**: Initial frontend scaffold — `frontend/index.html`, `frontend/contacts.html`, `frontend/css/styles.css`, and `frontend/js/config.js`, `api.js`, `auth.js`, `contacts.js`. Later uploaded as commit `3521ab5` ("Upload basic frontend"). No backend (PHP/MySQL) code was generated.
- **Nature of use**: Code generation from the assignment spec. The assistant read the course's LAMP Stack sample and wrote the outline files in the same style; I then asked for a color palette change. Substantial portions of the initial HTML, CSS and JavaScript are AI-generated. They were a starting outline for the team, and most of them have since been modified or replaced (see *Later changes* below).

---

## Prompt

> first conversation.here are the basic specs for the small project for Poosd. make the outlin files for the front end. [pasted the assignment spec: a Personal Contact Manager with registration, login, per-user add/edit/delete/server-side-search of contacts, LAMP stack, remote database, JSON and AJAX, REST-style API demonstrated in SwaggerHub, hosted on a domain name]

Follow-up prompt in the same session:

> try this color pallete. https://colorhunt.co/palette/37353e44444e715a5ad3dad9

## Response

### Reading the project first

The assistant found the existing `Poosd-Small-Project` repo and its `LAMP Stack` folder (the course sample: `index.html`, `js/code.js`, `css/styles.css`, `LAMPAPI/Login.php`) before creating anything, and matched its conventions: raw `XMLHttpRequest`, a `urlBase`/`extension` pair for the API address, and a cookie holding the session.

### Files created

- **`index.html`**: the initial page required by the spec, with login and register panels that swap without a page load.
- **`contacts.html`**: a search box, an add-contact form, a contacts table, an inline edit panel, and a log-out button.
- **`js/config.js`**: API base URL (a `localhost` placeholder with a TODO for the real domain) and cookie session helpers.
- **`js/api.js`**: one shared `callApi()` AJAX helper that every request goes through.
- **`js/auth.js`**: login, register, log-out, and a `requireLogin()` guard (expects `Login.php` and `Register.php`).
- **`js/contacts.js`**: search, add, edit and delete (expects `SearchContacts.php`, `AddContact.php`, `EditContact.php`, `DeleteContact.php`).
- **`css/styles.css`**: shared styling for both pages.

The JavaScript was split by responsibility so teammates could each own a file that maps to a backend endpoint. Search is debounced and re-queries the server on every change, and never filters a cached local list, to satisfy the spec's server-side, partial-match search requirement.

### Palette

For the Color Hunt palette, the assistant decoded the URL into four colors (`#37353E`, `#44444E`, `#715A5A`, `#D3DAD9`) and put them in `styles.css` as CSS variables: darkest for the page background, dark for panels, the mauve accent for buttons and table headers, and the light tone for text. It opened `index.html` in my browser so I could check it.

### Limits of this session

The assistant did not commit anything; the files were left untracked on my `Richard` branch and I uploaded them myself. It did not write any PHP.

---

## Testing

None beyond opening `index.html` in a browser to look at the colors. There was no backend, so no request was ever sent to an API, and the JavaScript behavior was not exercised.

---

## Later changes

- **Security fixes:** the scaffold inserted user data with `innerHTML`, which is unsafe for contact text. The team later replaced this with `textContent` and DOM creation (see issue #82).
- **Redesign:** the styling was replaced by the team's full frontend redesign (PR #93, see `prompts/marcus/prompt_four.md`).
- **Still in use:** the file structure and the `callApi()` pattern.
