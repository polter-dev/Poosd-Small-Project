# API Contract

Write down, in one document, the exact endpoint names, request JSON,
response JSON, database schema, and frontend rules everyone will code
against.

The frontend and API are built by different people at the same time.
Agreeing on the contract first means both sides can work in parallel and
plug together without surprises. It also gives the SwaggerHub
documentation a source of truth.

**This document wins over any code that disagrees with it.** Keep it
updated if anything changes. Copied as-is from issue #41 — see that
issue for sign-off status (needs one `role:frontend` and one
`role:databases` teammate to comment approval).

The existing frontend draft already uses these names and keys, so
nothing there needs renaming.

## Endpoints

Every endpoint is a single PHP file in `API/` on the server, called with
`POST https://<domain>/API/<Name>.php`. The request body is JSON and the
response is JSON (`Content-Type: application/json`). **Every response
contains an `error` key** — an empty string `""` on success, or a short
human-readable message on failure.

| Endpoint | Request JSON | Response JSON | Notes |
|---|---|---|---|
| `Register.php` | `{ "firstName", "lastName", "username", "password" }` | `{ "id", "firstName", "lastName", "error" }` | Rejects empty fields. Duplicate username → `id: 0`, `error: "Username already taken"`. |
| `Login.php` | `{ "username", "password" }` | `{ "id", "firstName", "lastName", "error" }` | Bad credentials → `id: 0`, `error: "Username/password combination incorrect"`. |
| `AddContact.php` | `{ "userId", "firstName", "lastName", "phone", "email" }` | `{ "id", "error" }` | `id` is the new contact's ID. |
| `SearchContacts.php` | `{ "userId", "search" }` | `{ "results": [ { "id", "firstName", "lastName", "phone", "email" }, ... ], "error" }` | Partial match on first name, last name, phone, email. Empty `search` returns **all** of that user's contacts. Zero matches → `results: []` and `error: ""` (not an error). |
| `EditContact.php` | `{ "userId", "id", "firstName", "lastName", "phone", "email" }` | `{ "error" }` | Only updates the row where `ID = id AND UserID = userId`. |
| `DeleteContact.php` | `{ "userId", "id" }` | `{ "error" }` | Only deletes the row where `ID = id AND UserID = userId`. |

## Shared PHP

- `API/db.php` opens the `mysqli` connection using values from
  `API/config.php` and defines six helpers used by every endpoint:
  `getRequestInfo()` (decode the JSON body), `sendResultInfoAsJson($obj)`
  (set the header and echo), `returnWithError($msg)`, `getDbConnection()`
  (open the mysqli connection with the shared charset/error-reporting
  setup), `getTextField($data, $key)` (safely pull one string field
  out of the decoded body, `""` if it's missing or the wrong type), and
  `getIdField($data, $key)` (same idea for a numeric id — accepts a JSON
  number or an all-digits string, `0` for anything else).
  `db.php` also installs a global exception handler so an unexpected
  DB/PHP error comes back as a JSON `{"error": ...}` instead of an HTML
  fatal-error page.
- `API/config.php` holds the DB host/user/password/name and is
  **git-ignored**. `API/config.example.php` with placeholder values is
  committed.
- Every endpoint starts with `require_once 'db.php';` and uses
  **prepared statements** for all SQL.

## Database schema

```sql
CREATE TABLE Users (
  ID        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  FirstName VARCHAR(50)  NOT NULL,
  LastName  VARCHAR(50)  NOT NULL,
  Login     VARCHAR(50)  NOT NULL UNIQUE,
  Password  VARCHAR(255) NOT NULL   -- output of PHP password_hash()
) ENGINE=InnoDB;

CREATE TABLE Contacts (
  ID        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  UserID    INT NOT NULL,
  FirstName VARCHAR(50)  NOT NULL DEFAULT '',
  LastName  VARCHAR(50)  NOT NULL DEFAULT '',
  Phone     VARCHAR(20)  NOT NULL DEFAULT '',
  Email     VARCHAR(100) NOT NULL DEFAULT '',
  INDEX idx_contacts_user (UserID),
  FOREIGN KEY (UserID) REFERENCES Users(ID) ON DELETE CASCADE
) ENGINE=InnoDB;
```

## Frontend rules

- Plain HTML, CSS, and JavaScript. No frameworks.
- Two pages: `frontend/index.html` (login + register) and
  `frontend/contacts.html`.
- Every API call goes through one helper:
  `callApi(endpointName, payload, onSuccess, onError)` in
  `frontend/js/api.js` (XMLHttpRequest, POST, JSON).
- After login the browser stores `userId`, `firstName`, `lastName` in
  cookies (`frontend/js/config.js`: `saveSession`, `readSession`,
  `clearSession`) and sends `userId` with every contact request.
- **Never keep a full client-side copy of the contacts and filter it
  locally.** Every search sends a request to `SearchContacts.php`.
- Escape user-entered text before putting it in the page (use
  `textContent`, or an `escapeHtml()` helper) so a contact named
  `<b>x</b>` can't inject HTML.

## Deployment notes (not yet resolved)

- **Real base URL**: `urlBase` in `frontend/js/config.js` is still the
  local dev placeholder `http://localhost/API` — update it once the API
  is hosted.
- **Same origin vs. split origin**: if the static frontend and the PHP
  API end up on the same domain (simplest: Apache serves both), no CORS
  setup is needed. If they're ever split across different domains/ports,
  every endpoint needs `Access-Control-Allow-Origin` and to handle the
  CORS preflight `OPTIONS` request (triggered by the
  `Content-Type: application/json` header on every call).
