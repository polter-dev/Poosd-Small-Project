# SwaggerHub Demo Script (about 30 seconds)

SwaggerHub: https://app.swaggerhub.com/apis/monklys/Personal_Contact_Manager_API/1.0.0
Server selected in the dropdown: `https://contacts.cop4331ruth.lol`

## What to type

| Step | Operation | Body to enter |
|---|---|---|
| 1 | `POST /API/Login.php` | `{"username": "123", "password": "123"}` |
| 2 | `POST /API/SearchContacts.php` | `{"userId": 13, "search": "ad", "field": "all"}` |
| 3 | `POST /API/SearchContacts.php` | `{"userId": 13, "search": "zzzz", "field": "all"}` |

`userId` in steps 2 and 3 must be the `id` returned by step 1 (the demo account `123` is `13`).

## What to say and what the grader should notice

1. "This is our API documented in SwaggerHub. I'm calling the live server, not a mock." (Point at the server dropdown.)
2. Step 1: click **Try it out**, then **Execute**. Point out the real `id`, `firstName`, `lastName` and `"error": ""`.
3. Step 2: the partial match `ad` returns every contact whose name, phone or email contains it (Ada Lovelace), so the search is server-side.
4. Step 3: no matches returns `"results": []` with an empty `error`. An empty result is not an error.
5. Every response always contains an `error` key.
