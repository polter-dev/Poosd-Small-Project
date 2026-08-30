<?php
// Login.php
// Checks a username + password against the Users table.
//
// Expects JSON in the POST body:  { "username", "password" }
// Always answers with JSON:       { "id", "firstName", "lastName", "error" }
//
// On success the front end stores the returned id and uses it for every later
// contact request. On failure the id is 0 and "error" explains what happened.

require_once 'db.php';

$in = getRequestInfo();

// The database column is called "Login", but the front end sends "username".
// We just line the two names up here.
$username = trim($in['username'] ?? '');
// Register.php trims the password before hashing it, so we have to trim the
// same way here. Otherwise someone who signed up with " secret " would have
// the hash of "secret" stored, and their login would never match.
$password = trim($in['password'] ?? '');

$conn = getDbConnection();

// Prepared statement again: the "?" keeps the typed-in username as pure data.
// If we pasted it into the SQL text instead, a username like  ' OR '1'='1
// could log someone in as the first user in the table (SQL injection).
//
// We look the user up by name ONLY. We cannot compare the password inside SQL,
// because the stored value is a hash, not the original password -- the
// comparison has to happen in PHP with password_verify() below.
$stmt = $conn->prepare("SELECT ID, FirstName, LastName, Password FROM Users WHERE Login = ?");
$stmt->bind_param("s", $username);   // one "s" for the single string placeholder
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();       // null if no user has that login

$stmt->close();
$conn->close();

// Two different failures -- "no such user" and "wrong password" -- but ONE
// identical message on purpose. If we said "no such user" for a bad name, an
// attacker could feed us a list of names and learn which accounts really exist,
// then focus their password guessing on those. Staying vague gives that away.
if ($row === null || !password_verify($password, $row['Password'])) {
    sendResultInfoAsJson([
        'id'        => 0,
        'firstName' => '',
        'lastName'  => '',
        'error'     => 'Username/password combination incorrect'
    ]);
    exit();
}

// Success. We deliberately send back only the id and the display name --
// the password hash from $row['Password'] must never leave the server.
sendResultInfoAsJson([
    'id'        => (int)$row['ID'],
    'firstName' => $row['FirstName'],
    'lastName'  => $row['LastName'],
    'error'     => ''
]);
