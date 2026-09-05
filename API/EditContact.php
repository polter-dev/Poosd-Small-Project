<?php
// EditContact.php
// Updates one existing contact that belongs to the logged-in user.
//
// Expects JSON in the POST body:  { "userId", "id", "firstName", "lastName", "phone", "email" }
// Always answers with JSON:       { "error" }
//
// "error" is "" on success or a short message on failure. All four text fields
// are written every time -- the edit form always sends the complete row, so a
// field left blank is a deliberate "clear this value", not "leave it alone".

require_once 'db.php';

// getRequestInfo() hands us the JSON body already decoded into a PHP array.
$in = getRequestInfo();

// getIdField() (in db.php) accepts a JSON number or a numeric string and gives
// back 0 for anything else. The numeric-string case matters here: the edit form
// reads the contact id out of an <input>, so it always arrives as a string.
$userId    = getIdField($in, 'userId');
$contactId = getIdField($in, 'id');

// getTextField() (in db.php) trims the spaces off each value and gives back ""
// for anything the client left out or sent as the wrong type, so a request like
// {"firstName":[1,2]} is rejected politely below instead of crashing the script.
$firstName = getTextField($in, 'firstName');
$lastName  = getTextField($in, 'lastName');
$phone     = getTextField($in, 'phone');
$email     = getTextField($in, 'email');

// Step 1: both ids must be positive whole numbers before we touch the database.
if ($userId <= 0) {
    returnWithError('A valid userId is required');
    exit();
}
if ($contactId <= 0) {
    returnWithError('A valid contact id is required');
    exit();
}

// Step 2: the same content rules AddContact.php enforces. A contact with
// neither a first nor a last name is just a blank row, so an edit must not be
// able to empty both and leave one behind.
if ($firstName === '' && $lastName === '') {
    returnWithError('A first or last name is required');
    exit();
}

// Step 3: keep each value inside its column width (see API/sql/schema.sql).
// Checking here turns an over-long value into a readable message instead of a
// generic failure when MySQL rejects the row.
if (mb_strlen($firstName) > 50 || mb_strlen($lastName) > 50) {
    returnWithError('First and last name must be 50 characters or fewer');
    exit();
}
if (mb_strlen($phone) > 20) {
    returnWithError('Phone must be 20 characters or fewer');
    exit();
}
if (mb_strlen($email) > 100) {
    returnWithError('Email must be 100 characters or fewer');
    exit();
}

$conn = getDbConnection();

/*
 * Step 4: confirm this contact exists AND belongs to this user.
 *
 * We cannot skip this and just look at how many rows the UPDATE changed: MySQL
 * reports 0 changed rows when the new values happen to equal the old ones, so a
 * "save" with nothing edited would look exactly like "no such contact". Asking
 * first tells the two apart honestly.
 *
 * The UserID = ? half of this check is the security boundary. Without it,
 * anyone could pass someone else's contact id and overwrite that person's data.
 */
$stmt = $conn->prepare("SELECT ID FROM Contacts WHERE ID = ? AND UserID = ?");
$stmt->bind_param("ii", $contactId, $userId);   // two "i" = two integer parameters
$stmt->execute();
$result = $stmt->get_result();

if (!$result->fetch_assoc()) {
    $stmt->close();
    $conn->close();

    // One message for "no such contact" and for "that contact is someone
    // else's", on purpose: telling them apart would let anyone probe which
    // contact ids exist on the site.
    returnWithError('Contact not found');
    exit();
}

$stmt->close();

// Step 5: write the new values.
//
// The WHERE clause repeats AND UserID = ? rather than trusting the check above.
// The row is confirmed to be this user's, but keeping the ownership condition
// on the statement that actually writes means no future edit to this file can
// drop the check by accident.
//
// Prepared statement again: the "?" placeholders keep every typed-in value as
// pure data, so a name like  ' OR '1'='1  is stored as literal text and can
// never change the meaning of the query (SQL injection). Six placeholders, so
// six type letters -- four strings, then the two integer ids.
$stmt = $conn->prepare(
    "UPDATE Contacts
        SET FirstName = ?, LastName = ?, Phone = ?, Email = ?
      WHERE ID = ? AND UserID = ?"
);
$stmt->bind_param("ssssii", $firstName, $lastName, $phone, $email, $contactId, $userId);
$stmt->execute();

$stmt->close();
$conn->close();

// Step 6: success. Nothing to send back but the empty error -- the front end
// re-runs its search afterward to pick up the updated row.
sendResultInfoAsJson(['error' => '']);
