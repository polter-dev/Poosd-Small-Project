# AI Assistance Log — Matthew Feyler (AddContact.php)

* **Tool**: Claude (Anthropic), Claude Opus 5, accessed via Claude Code in VS Code

* **Date**: August 31, 2026

* **Scope**: Creating the `API/AddContact.php` endpoint for the Contact Manager project, which covers the "Contact Management (per user): Add contacts" spec item and the request/response contract from issue #41. Opened as PR #85.

* **Nature of use**: Code generation with explanation. I asked the assistant to write the endpoint following the course's `AddColor.php` example and our API contract, reviewed the generated PHP, asked follow-up questions about validation and error handling, and tested the endpoint with `curl` before committing it. The assistant also helped write the PR description.

---

## Prompts

The assistant was used to help with questions and tasks including:

> Write an AddContact.php endpoint that follows the course's AddColor.php example and our API contract in docs/api-contract.md, using a prepared statement.

> What should the endpoint return if the userId doesn't belong to a real user?

> How should field lengths be validated so an over-long value returns a readable error instead of a MySQL failure?

The endpoint takes a JSON body of `{ "userId", "firstName", "lastName", "phone", "email" }` and always answers with `{ "id", "error" }`.

## Response

The assistant provided code and technical explanations, including:

* Reading the JSON request through the shared `db.php` helper (`require_once 'db.php'; $in = getRequestInfo();`).
* Validating input before any database work: `userId` must be a positive integer (a JSON number or a digit-only string), and at least one of `firstName` or `lastName` must be non-empty after trimming.
* Checking field lengths against the `Contacts` column widths (50/50/20/100), matching the pattern already used in `Register.php`.
* Using a prepared statement, `INSERT INTO Contacts (UserID, FirstName, LastName, Phone, Email) VALUES (?, ?, ?, ?, ?)` bound as `issss`, so user input is always treated as data.
* Catching a foreign-key violation (MySQL error 1452) from a `userId` with no matching `Users` row and returning the same friendly "A valid userId is required" error.
* Building the response as a PHP array and sending it through `sendResultInfoAsJson()`, so no JSON is built by hand.

## Implementation Work

Work completed with AI assistance included:

* Creating `API/AddContact.php` (106 lines).
* Testing with `curl` against a local LAMP setup: a valid contact inserts a row tied to the given `userId` and returns its new `id`, while a contact with no names and a `userId` of 0 each return `id: 0` with an error and insert nothing.
* Writing the PR #85 description.

All AI-assisted code was reviewed and tested before being used in the project. The final endpoint was checked against the API contract and the project's requirements.
