# AI Assistance Log — Matthew Feyler (SwaggerHub)

* **Tool**: Claude (Anthropic), Claude Opus 5, accessed via Claude Code in VS Code

* **Date**: September 21, 2026

* **Scope**: Documenting the Contact Manager API in SwaggerHub, merged as PR #97 (commit `4c1e668`). Covers the new `docs/swagger.yaml` and `docs/presentation-notes.md`, CORS changes to `API/Login.php` and `API/SearchContacts.php`, and a SwaggerHub link in `README.md`.

* **Nature of use**: Code generation and explanation. I asked the assistant to write the OpenAPI definition, explain why SwaggerHub's "Try it out" couldn't reach our live server, and make the smallest server-side change that would allow it. I published the definition to SwaggerHub myself, tested the calls against the live site, and used the assistant to write a short demo script and the PR description.

---

## Prompts

The assistant was used to help with questions and tasks including:

> Write an OpenAPI 3 definition for our Login and SearchContacts endpoints, with examples for success, bad credentials, partial matches, and empty results.

> Why does "Try it out" in SwaggerHub fail when calling our live server?

> What's the smallest change to the PHP files so SwaggerHub can call them without opening the API up to every site?

> Write a short script for demoing the SwaggerHub page during our presentation.

## Response

The assistant provided code and technical explanations, including:

* Writing `docs/swagger.yaml` as an OpenAPI 3.0 definition with the live server (`https://contacts.cop4331ruth.lol`), the two `POST` endpoints, request/response schemas (`LoginRequest`, `LoginResponse`, `SearchRequest`, `Contact`, `SearchResponse`), and examples.
* Explaining that SwaggerHub runs on a different origin, so the browser blocks the request unless the server sends CORS headers and answers the `OPTIONS` preflight.
* Adding CORS headers to `Login.php` and `SearchContacts.php` that allow only `https://app.swaggerhub.com`, and returning early on `OPTIONS` requests. The site itself is same-origin, so its behavior is unchanged, and the other endpoints were not touched.
* Writing a 30-second demo script in `docs/presentation-notes.md` covering a login, a partial-match search, and an empty search.

## Implementation Work

Work completed with AI assistance included:

* Creating `docs/swagger.yaml` and publishing it to SwaggerHub.
* Adding CORS and preflight handling to `Login.php` and `SearchContacts.php`.
* Adding the SwaggerHub link to `README.md`.
* Creating `docs/presentation-notes.md`.
* Testing "Try it out" against the live server after the changes were pulled on the droplet.
* Writing the PR #97 description.

All AI-assisted code and documentation was reviewed and tested before being used in the project. The final API documentation was checked against the live endpoints and the project's requirements.
