# API Contract — Personal Contact Manager

This is the spec for the PHP/MySQL endpoints the frontend already calls.
It exists so the backend can build against a fixed target instead of
reverse-engineering `frontend/js/*.js` — every request/response shape
below is exactly what's already implemented on the frontend side.

## Conventions (apply to every endpoint)

- **Transport**: `POST`, `Content-Type: application/json`, JSON body. See
  `frontend/js/api.js` (`callApi()`) — every call in the app goes through
  that one helper, so this is the only calling convention that exists.
- **URL shape**: `{urlBase}/{EndpointName}.php`, e.g. `.../API/Login.php`.
  `urlBase` lives in `frontend/js/config.js` and is currently the local
  dev placeholder `http://localhost/API` — swap in the real hosted base
  URL there once it exists, that's the only frontend change needed to
  point at the live backend.
- **HTTP 200 means "the server ran the request,"** even for expected
  failures (wrong password, duplicate username, etc). Those come back as
  `200` with an `"error"` field in the body. A non-200 status is only for
  actual server/network failure and surfaces to the user as a generic
  "Request failed with status _n_" — so don't use it for ordinary
  validation failures.
- Every response is a flat JSON object. Success: `error` is omitted or
  `""`. Failure: `error` is a human-readable string.
- This matches the conventions already used in the course demo at
  `LAMP Stack/LAMP Stack/LAMPAPI/*.php` (`getRequestInfo()` /
  `sendResultInfoAsJson()` / `returnWithError()` / `returnWithInfo()`
  helpers) — reusing that pattern here should make these quick to write.

## Endpoints

### `POST /Login.php`
Request:
```json
{ "username": "string", "password": "string" }
```
Success:
```json
{ "id": 1, "firstName": "Jane", "lastName": "Doe" }
```
Failure:
```json
{ "id": 0, "firstName": "", "lastName": "", "error": "Username/password combination incorrect" }
```
Frontend treats `id < 1` as failure regardless of `error` being present.

### `POST /Register.php`
Request:
```json
{ "firstName": "string", "lastName": "string", "username": "string", "password": "string" }
```
Success: same shape as Login's success. Failure: `{ "id": 0, "error": "..." }`
(e.g. username already taken). Frontend already checks the two password
fields match client-side, so the backend only ever sees one `password`.

### `POST /SearchContacts.php`
Request:
```json
{ "userId": 1, "search": "string" }
```
`search` may be `""` — that means "return all of this user's contacts,"
not an error.

Success:
```json
{ "results": [
  { "id": 5, "firstName": "Jane", "lastName": "Doe", "phone": "555-1234", "email": "jane@example.com" }
] }
```
An empty `results` array is a normal, successful response (no matches),
not an error.

**Must-haves for this one specifically**, since it's the project's
required server-side search endpoint:
- Only rows where `UserId` matches the given `userId` — never another
  user's contacts.
- Partial match (`LIKE '%term%'`), done in SQL — the frontend never
  caches the full contact list to filter client-side, by design (see the
  comment at the top of `frontend/js/contacts.js`), so this must
  re-query on every keystroke.

### `POST /AddContact.php`
Request:
```json
{ "userId": 1, "firstName": "string", "lastName": "string", "phone": "string", "email": "string" }
```
Success: `{ "id": 12 }` (the new contact's id, must be `> 0`).
Failure: `{ "id": 0, "error": "..." }`

### `POST /EditContact.php`
Request:
```json
{ "userId": 1, "id": 12, "firstName": "string", "lastName": "string", "phone": "string", "email": "string" }
```
Success: `{}` — frontend only checks for the *absence* of `error`, it
doesn't read anything else back.
Failure: `{ "error": "..." }`

Please verify `id`'s row actually belongs to `userId` before updating —
otherwise one logged-in user could edit another user's contact just by
guessing/incrementing an id.

### `POST /DeleteContact.php`
Request:
```json
{ "userId": 1, "id": 12 }
```
Success: `{}`. Failure: `{ "error": "..." }`. Same per-user ownership
check as EditContact.

## Open questions for whoever sets up hosting

- **Real base URL** — once the API is hosted, tell frontend the URL so
  `urlBase` in `frontend/js/config.js` can be updated.
- **Same origin vs. split origin** — if the static frontend and the PHP
  API end up on the same domain (simplest: Apache serves both), no CORS
  setup is needed at all, and that's the recommended path. If they're
  ever split across different domains/ports, every endpoint needs
  `Access-Control-Allow-Origin` and to handle the CORS preflight
  `OPTIONS` request (triggered by the `Content-Type: application/json`
  header on every call) — the course demo endpoints don't do this
  because that demo isn't split.
- **Password handling** — frontend currently sends `password` in
  plaintext (see the `TODO` in `frontend/js/auth.js`), matching the
  course demo's default (`LAMP Stack/LAMP Stack/js/code.js` has md5
  hashing available but commented out). If backend wants it hashed
  before it hits the wire, say which hash and we'll turn that on
  client-side — just don't want to guess and end up mismatched.
