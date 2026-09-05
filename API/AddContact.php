<?php
// AddContact.php
// Saves one new contact row that belongs to the logged-in user.
//
// Expects JSON in the POST body:  { "userId", "firstName", "lastName", "phone", "email" }
// Always answers with JSON:       { "id", "error" }
//
// On success "id" is the new Contacts.ID and "error" is "". On failure "id" is 0
// and "error" holds a short message. The response always has both keys so the
// front end never has to guess whether a field is present.

require_once 'db.php';

// getRequestInfo() hands us the JSON body already decoded into a PHP array.
$in = getRequestInfo();

// getTextField() (in db.php) trims the spaces off each value and gives back ""
// for anything the client left out or sent as the wrong type, so a request like
// {"firstName":[1,2]} is rejected politely below instead of crashing the script.
$firstName = getTextField($in, 'firstName');
$lastName  = getTextField($in, 'lastName');
$phone     = getTextField($in, 'phone');
$email     = getTextField($in, 'email');

// userId is a number, not text, so getTextField() is not the right tool.
// getIdField() (in db.php) accepts a JSON number or a numeric string and gives
// back 0 for anything else -- missing, negative, "abc", a list -- which then
// fails the check just below.
$userId = getIdField($in, 'userId');

// Step 1: the userId must identify a real, logged-in user. We only check that it
// is a positive integer here; the FOREIGN KEY on Contacts.UserID makes MySQL
// reject an id that does not match a Users row (caught in step 4).
if ($userId <= 0) {
    sendResultInfoAsJson(['id' => 0, 'error' => 'A valid userId is required']);
    exit();
}

// Step 2: a contact with neither a first nor a last name is just a blank row, so
// require at least one. Phone and email are optional and may stay "".
if ($firstName === '' && $lastName === '') {
    sendResultInfoAsJson(['id' => 0, 'error' => 'A first or last name is required']);
    exit();
}

// Step 3: keep each value inside its column width (see API/sql/schema.sql).
// Checking here turns an over-long value into a readable message instead of a
// generic failure when MySQL rejects the row.
if (mb_strlen($firstName) > 50 || mb_strlen($lastName) > 50) {
    sendResultInfoAsJson(['id' => 0, 'error' => 'First and last name must be 50 characters or fewer']);
    exit();
}
if (mb_strlen($phone) > 20) {
    sendResultInfoAsJson(['id' => 0, 'error' => 'Phone must be 20 characters or fewer']);
    exit();
}
if (mb_strlen($email) > 100) {
    sendResultInfoAsJson(['id' => 0, 'error' => 'Email must be 100 characters or fewer']);
    exit();
}

$conn = getDbConnection();

// Step 4: insert the row. Five "?" placeholders, so five type letters in
// bind_param: "issss" -- the UserID is an integer, the four text fields are
// strings. This is a PREPARED STATEMENT: the SQL and the values travel to MySQL
// separately, so a name like  ' OR '1'='1  is stored as literal text and can
// never change the meaning of the query (SQL injection). Every query in this
// project works this way.
$stmt = $conn->prepare("INSERT INTO Contacts (UserID, FirstName, LastName, Phone, Email) VALUES (?, ?, ?, ?, ?)");
$stmt->bind_param("issss", $userId, $firstName, $lastName, $phone, $email);

// The FOREIGN KEY on Contacts.UserID means an id with no matching Users row is
// rejected by MySQL as error 1452. We turn that into a friendly message; any
// other database problem is re-thrown and handled by db.php.
try {
    $stmt->execute();
} catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1452) {
        throw $e;
    }

    $stmt->close();
    $conn->close();

    sendResultInfoAsJson(['id' => 0, 'error' => 'A valid userId is required']);
    exit();
}

// insert_id is the auto-increment ID MySQL just handed the new row.
// Cast to int so the JSON contains 7 rather than the string "7".
$newId = (int)$conn->insert_id;

$stmt->close();
$conn->close();

// Step 5: success.
sendResultInfoAsJson([
    'id'    => $newId,
    'error' => ''
]);
