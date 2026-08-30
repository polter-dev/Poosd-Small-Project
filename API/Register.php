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

// Pull the four fields out. The "??" gives us an empty string if the front end
// left a key out entirely, so we never touch an undefined array index.
// trim() strips leading/trailing spaces so " " does not count as a real name.
$firstName = trim($in['firstName'] ?? '');
$lastName  = trim($in['lastName']  ?? '');
$username  = trim($in['username']  ?? '');
$password  = trim($in['password']  ?? '');

// Step 1: basic validation. If anything is blank we stop right here and never
// touch the database, so we cannot create a half-empty user row.
if ($firstName === '' || $lastName === '' || $username === '' || $password === '') {
    sendResultInfoAsJson([
        'id'        => 0,
        'firstName' => '',
        'lastName'  => '',
        'error'     => 'All fields are required'
    ]);
    exit();
}

$conn = getDbConnection();

// Step 2: make sure this username is not already in use.
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
    // Somebody already owns this login name.
    $stmt->close();
    $conn->close();

    sendResultInfoAsJson([
        'id'        => 0,
        'firstName' => '',
        'lastName'  => '',
        'error'     => 'Username already taken'
    ]);
    exit();
}

$stmt->close();

// Step 3: hash the password before it ever goes into the database.
//
// We never store the plain password, and we do NOT use md5/sha1 either. Those
// are fast, which is exactly what an attacker wants when guessing billions of
// passwords. password_hash() uses a slow, salted algorithm, so even if our
// database is stolen the real passwords are not readable. The matching check
// happens later in Login.php with password_verify().
$hash = password_hash($password, PASSWORD_DEFAULT);

// Step 4: insert the new user. Four "?" placeholders, so four "s" characters
// in bind_param -- one type letter per placeholder, all strings here.
$stmt = $conn->prepare("INSERT INTO Users (FirstName, LastName, Login, Password) VALUES (?, ?, ?, ?)");
$stmt->bind_param("ssss", $firstName, $lastName, $username, $hash);

// The Login column is UNIQUE in the database, so the INSERT can still fail even
// though we checked for a duplicate a moment ago -- two people could register
// the same name at almost the same instant. Checking here means we report a
// real message instead of quietly answering with id 0 and no error.
if (!$stmt->execute()) {
    $stmt->close();
    $conn->close();

    sendResultInfoAsJson([
        'id'        => 0,
        'firstName' => '',
        'lastName'  => '',
        'error'     => 'Username already taken'
    ]);
    exit();
}

// insert_id is the auto-increment ID MySQL just handed the new row.
// Cast to int so the JSON contains 7 rather than the string "7".
$newId = (int)$conn->insert_id;

$stmt->close();
$conn->close();

// Step 5: success. Note the password/hash is never part of the response.
sendResultInfoAsJson([
    'id'        => $newId,
    'firstName' => $firstName,
    'lastName'  => $lastName,
    'error'     => ''
]);
