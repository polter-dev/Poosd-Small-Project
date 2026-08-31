<?php
// Register.php
// Creates a brand new user account in the Users table.
//
// Expects JSON in the POST body:  { "firstName", "lastName", "username", "password" }
// Always answers with JSON:       { "id", "firstName", "lastName", "error" }
//
// The response always has all four keys so the front end never has to guess
// whether a field exists. On failure "error" holds a short message and the
// other fields are blank/zero.

require_once 'db.php';

// getRequestInfo() hands us the JSON body already decoded into a PHP array.
$in = getRequestInfo();

// Pull the four fields out. getTextField() (in db.php) trims the spaces off
// each value and gives back "" for anything the client left out or sent as the
// wrong type, so a request like {"firstName":[1,2]} is rejected politely below
// instead of crashing the script.
$firstName = getTextField($in, 'firstName');
$lastName  = getTextField($in, 'lastName');
$username  = getTextField($in, 'username');
$password  = getTextField($in, 'password');

// Step 1: basic validation. If anything is blank we stop right here and never
// touch the database, so we cannot create a half-empty user row.
if ($firstName === '' || $lastName === '' || $username === '' || $password === '') {
    returnWithAuthError('All fields are required');
}

// Step 2: the name columns hold 50 characters. Checking the length here means
// an over-long name comes back as a readable message, instead of MySQL
// rejecting the row and the user seeing a generic failure.
if (mb_strlen($firstName) > 50 || mb_strlen($lastName) > 50 || mb_strlen($username) > 50) {
    returnWithAuthError('First name, last name, and username must be 50 characters or fewer');
}

// Step 2b: bcrypt (the algorithm behind PASSWORD_DEFAULT) only looks at the
// first 72 BYTES of a password. Older PHP silently ignores everything past
// that -- the user thinks their long passphrase counts, but only its start
// does -- and PHP 8.4+ throws instead, which would surface as a generic
// "Server error". Rejecting long passwords up front gives an honest message
// either way. strlen() (bytes, not characters) is deliberate: that is the
// limit bcrypt actually enforces.
if (strlen($password) > 72) {
    returnWithAuthError('Password must be 72 characters or fewer');
}

$conn = getDbConnection();

// Step 3: make sure this username is not already in use.
//
// Note the "?" placeholder below. This is a PREPARED STATEMENT: we send the SQL
// and the user's data to MySQL separately, so MySQL treats the data purely as a
// value and never as SQL code. If we instead glued the username straight into
// the query string, someone could type something like:  ' OR '1'='1
// and change the meaning of our query (that is SQL injection). Every query in
// this project uses prepared statements for exactly that reason.
$stmt = $conn->prepare("SELECT ID FROM Users WHERE Login = ?");
$stmt->bind_param("s", $username);   // one "s" = one string parameter
$stmt->execute();
$result = $stmt->get_result();

if ($result->fetch_assoc()) {
    // Somebody already owns this login name. Note the match is
    // case-INsensitive on purpose (the table's utf8mb4_unicode_ci collation):
    // "Alice" and "alice" are the same username, both here and at login.
    $stmt->close();
    $conn->close();

    returnWithAuthError('Username already taken');
}

$stmt->close();

// Step 4: hash the password before it ever goes into the database.
//
// We never store the plain password, and we do NOT use md5/sha1 either. Those
// are fast, which is exactly what an attacker wants when guessing billions of
// passwords. password_hash() uses a slow, salted algorithm, so even if our
// database is stolen the real passwords are not readable. The matching check
// happens later in Login.php with password_verify().
$hash = password_hash($password, PASSWORD_DEFAULT);

// Step 5: insert the new user. Four "?" placeholders, so four "s" characters
// in bind_param -- one type letter per placeholder, all strings here.
$stmt = $conn->prepare("INSERT INTO Users (FirstName, LastName, Login, Password) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $firstName, $lastName, $username, $hash);

// The Login column is UNIQUE in the database, so the INSERT can still fail even
// though we checked for a duplicate a moment ago -- two people could register
// the same name at almost the same instant. MySQL reports that clash as error
// number 1062, and we turn it into the same friendly message. Any other
// database problem is re-thrown and handled by db.php.
try {
    $stmt->execute();
} catch (mysqli_sql_exception $e) {
    if ($e->getCode() !== 1062) {
        throw $e;
    }

    $stmt->close();
    $conn->close();

    returnWithAuthError('Username already taken');
}

// insert_id is the auto-increment ID MySQL just handed the new row.
// Cast to int so the JSON contains 7 rather than the string "7".
$newId = (int)$conn->insert_id;

$stmt->close();
$conn->close();

// Step 6: success. Note the password/hash is never part of the response.
sendResultInfoAsJson([
    'id'        => $newId,
    'firstName' => $firstName,
    'lastName'  => $lastName,
    'error'     => ''
]);
