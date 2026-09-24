# UML diagrams

Three diagrams for the presentation, written in PlantUML so the source is
diffable and the images can be regenerated instead of re-drawn by hand.

Each diagram is committed three ways: the `.puml` source, a `.png` for quick
previews, and a `.svg` for slides. Use the SVG in PowerPoint -- it stays sharp
when projected, and PowerPoint can convert it to editable shapes if a label
needs changing.

| File | Diagram | Shows |
|---|---|---|
| `use-case.puml` | Use case | The `User` actor against the seven things the app lets them do, with the endpoint that implements each one |
| `activity.puml` | Activity | Open the site through login or register, the contacts page, the four contact operations, and logout |
| `sequence-search.puml` | Sequence | One search, end to end: `contacts.js` -> `api.js` -> `SearchContacts.php` -> `db.php` -> MySQL and back |

The content is traced from the code, not from the contract, so it reflects what
actually runs:

- every call goes through `callApiWithDeadline()`, which wraps `callApi()` with
  a 15 second deadline
- the 250 ms search debounce and the stale-response guard in `searchContacts()`
- the session watchdog: `checkSessionStillValid()` every 20 seconds, and any
  click or keypress re-saving the cookie
- the LIKE escaping of `%`, `_` and backslash, and the `WHERE UserID = ?` scoping
- the column rename (`ID` -> `id`) that keeps the response matching the contract

## Regenerating the images

Any of these works:

- **VS Code**: install the PlantUML extension, open a `.puml`, press `Alt+D`.
- **Web**: paste the source into https://www.plantuml.com/plantuml
- **Command line**: download `plantuml.jar` and run

  ```
  java -jar plantuml.jar -tpng -o docs/uml docs/uml/*.puml
  ```

  Swap `-tpng` for `-tsvg` to regenerate the vector copies.
