<?php
// DeleteContact.php
// Deletes one contact that belongs to the logged-in user.
//
// Expects JSON in the POST body:  { "userId", "id" }
// Always answers with JSON:       { "error" }
//
// "error" is "" on success or a short message on failure. The delete is
// permanent -- there is no undo and no "deleted" flag on the row -- so the
// front end asks the user to confirm before calling this.

require_once 'db.php';

// getRequestInfo() hands us the JSON body already decoded into a PHP array.
$in = getRequestInfo();

// getIdField() (in db.php) accepts a JSON number or a numeric string and gives
// back 0 for anything else -- missing, negative, "abc", a list -- which then
// fails the checks just below.
$userId    = getIdField($in, 'userId');
$contactId = getIdField($in, 'id');

// Step 1: both ids must be positive whole numbers before we touch the database.
if ($userId <= 0) {
    returnWithError('A valid userId is required');
    exit();
}
if ($contactId <= 0) {
    returnWithError('A valid contact id is required');
    exit();
}

$conn = getDbConnection();

/*
 * Step 2: delete the row -- but only if it is this user's row.
 *
 * The AND UserID = ? half of the WHERE clause is the security boundary of this
 * endpoint. The contact id comes straight from the browser, so without it
 * anyone could send someone else's contact id and delete that person's data.
 * With it, a mismatched id simply matches no rows and deletes nothing.
 *
 * Prepared statement again: the SQL and the two ids travel to MySQL separately,
 * so a value like  1 OR 1=1  is compared as literal data and can never change
 * the meaning of the query (SQL injection). Two "?" placeholders, so two "i"
 * type letters -- both are integers.
 */
$stmt = $conn->prepare("DELETE FROM Contacts WHERE ID = ? AND UserID = ?");
$stmt->bind_param("ii", $contactId, $userId);
$stmt->execute();

// Step 3: how many rows actually went away.
//
// Unlike an UPDATE -- where 0 changed rows is ambiguous, because saving
// unchanged values also reports 0 -- a DELETE is unambiguous: the row either
// existed and is gone, or it never matched. So this alone tells us whether the
// request did anything, and no separate lookup is needed.
$deleted = $stmt->affected_rows;

$stmt->close();
$conn->close();

if ($deleted === 0) {
    // One message for "no such contact" and for "that contact is someone
    // else's", on purpose: telling them apart would let anyone probe which
    // contact ids exist on the site.
    returnWithError('Contact not found');
    exit();
}

// Step 4: success. The front end re-runs its search afterward, so the deleted
// row disappears from the table on the next response.
sendResultInfoAsJson(['error' => '']);
