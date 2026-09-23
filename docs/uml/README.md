# UML diagrams

Three diagrams for the presentation, written in PlantUML so the source is
diffable and the PNGs can be regenerated instead of re-drawn by hand.

| File | Diagram | Shows |
|---|---|---|
| `use-case.puml` | Use case | The `User` actor against the seven things the app lets them do, with the endpoint that implements each one |
| `activity.puml` | Activity | Open the site through login or register, the contacts page, the four contact operations, and logout |
| `sequence-search.puml` | Sequence | One search, end to end: `contacts.js` -> `callApi()` -> `SearchContacts.php` -> `db.php` -> MySQL and back |

The content is traced from the code, not from the contract, so it reflects what
actually runs: the 250 ms search debounce, the stale-response guard, the LIKE
escaping, and the `WHERE UserID = ?` scoping.

## Regenerating the PNGs

Any of these works:

- **VS Code**: install the PlantUML extension, open a `.puml`, press `Alt+D`.
- **Web**: paste the source into https://www.plantuml.com/plantuml
- **Command line**: download `plantuml.jar` and run

  ```
  java -jar plantuml.jar -tpng -o docs/uml docs/uml/*.puml
  ```

  Add `-tsvg` instead of `-tpng` if you want vector output for the slides.
