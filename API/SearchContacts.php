<?php
// SearchContacts.php
// Returns the logged-in user's contacts, optionally filtered by a search term.
//
// Expects JSON in the POST body:  { "userId", "search" }
// Always answers with JSON:       { "results": [ ... ], "error" }
//
// Each entry in "results" looks like { "id", "firstName", "lastName", "phone",
// "email" }. An empty "search" returns ALL of that user's contacts -- the
// contacts page calls this on load with an empty term to fill the table.
//
// Finding nothing is NOT an error: zero matches comes back as
// { "results": [], "error": "" }. The front end decides on its own to show
// "No contacts found" when the list is empty.

require_once 'db.php';

// getRequestInfo() hands us the JSON body already decoded into a PHP array.
$in = getRequestInfo();

// getIdField() (in db.php) accepts a JSON number or a numeric string and gives
// back 0 for anything else, which fails the check just below.
$userId = getIdField($in, 'userId');

// getTextField() (in db.php) trims the term and gives back "" for anything the
// client left out or sent as the wrong type -- and "" is a perfectly valid
// search here, meaning "everything", so no further check is needed.
$search = getTextField($in, 'search');

// Step 1: the userId must identify a real, logged-in user. Every query below is
// scoped to this id, so a bad one can only ever return an empty list.
if ($userId <= 0) {
    sendResultInfoAsJson(['results' => [], 'error' => 'A valid userId is required']);
    exit();
}

$conn = getDbConnection();

// Step 2: build the query.
//
// The WHERE clause always starts with UserID = ? -- that is what keeps one user
// from ever seeing another user's contacts. The search term only ever narrows
// that set further; it can never widen it past this user's own rows.
//
// The two cases are split because an empty search should skip the LIKE work
// entirely rather than run four pointless "LIKE '%%'" comparisons per row.
//
// ORDER BY gives the table a stable, predictable order. Without it MySQL is
// free to return rows in any order it likes, so the same search could shuffle
// the list between calls for no visible reason.
if ($search === '') {
    $stmt = $conn->prepare(
        "SELECT ID, FirstName, LastName, Phone, Email
           FROM Contacts
          WHERE UserID = ?
          ORDER BY LastName, FirstName, ID"
    );
    $stmt->bind_param("i", $userId);
} else {
    /*
     * Partial match across all four text fields.
     *
     * In a LIKE pattern, % means "any run of characters" and _ means "any one
     * character". Those are exactly the characters we must neutralize in text
     * the user typed: someone searching for the literal string "50%" would
     * otherwise send the pattern "%50%%", whose trailing % matches anything, so
     * they'd get back contacts with no "50" in them at all. Escaping turns each
     * one back into an ordinary character to look for.
     *
     * The backslash has to be escaped FIRST. Doing it after the others would
     * also hit the backslashes we just added, doubling them by mistake.
     *
     * Note this is not about SQL injection -- the prepared statement below
     * already handles that. The value travels to MySQL as data either way; this
     * is purely about the pattern meaning what the user actually typed.
     */
    $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search);
    $pattern = '%' . $escaped . '%';

    $stmt = $conn->prepare(
        "SELECT ID, FirstName, LastName, Phone, Email
           FROM Contacts
          WHERE UserID = ?
            AND (FirstName LIKE ? OR LastName LIKE ? OR Phone LIKE ? OR Email LIKE ?)
          ORDER BY LastName, FirstName, ID"
    );

    // One type letter per placeholder: "i" for the integer UserID, then four
    // "s" because the SAME pattern is compared against each of the four columns.
    $stmt->bind_param("issss", $userId, $pattern, $pattern, $pattern, $pattern);
}

$stmt->execute();
$result = $stmt->get_result();

// Step 3: copy the rows into the exact shape the API contract promises.
//
// We do not hand MySQL's rows straight to the front end: the database columns
// are named ID/FirstName/... while the contract (and every line of contacts.js)
// expects id/firstName/.... Renaming here keeps that promise in one place, and
// means adding a column to the table later cannot accidentally leak it.
$results = [];
while ($row = $result->fetch_assoc()) {
    $results[] = [
        'id'        => (int)$row['ID'],   // cast so the JSON holds 7, not "7"
        'firstName' => $row['FirstName'],
        'lastName'  => $row['LastName'],
        'phone'     => $row['Phone'],
        'email'     => $row['Email']
    ];
}

$stmt->close();
$conn->close();

// Step 4: success -- including when $results is empty, which just means this
// user has no contacts matching that term.
sendResultInfoAsJson([
    'results' => $results,
    'error'   => ''
]);
