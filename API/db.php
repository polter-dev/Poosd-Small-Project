<?php
/*
 * db.php
 *
 * Shared helper file for every API endpoint (Login.php, AddContact.php, etc.).
 *
 * Every endpoint needs to do the same four boring things: connect to the
 * database, read the incoming JSON, send JSON back, and report an error.
 * Instead of copy-pasting that code into each endpoint file (where one fix
 * would have to be made in five places), we write it ONCE here and each
 * endpoint just does:
 *
 *     require_once __DIR__ . '/db.php';
 *
 * __DIR__ means "the folder this file is in", so the include works no matter
 * what folder the web server thinks it is running from.
 */

// Pulls in DB_HOST, DB_USER, DB_PASS, DB_NAME. This is the git-ignored file
// with the real credentials, created by copying config.example.php.
require_once __DIR__ . '/config.php';

/*
 * Opens the connection to the MySQL database and hands it back.
 *
 * Lives here so the login/password for the database is only referenced in one
 * place. If the connection fails we send back a normal JSON error instead of
 * letting PHP dump a raw warning, because the frontend only knows how to read
 * JSON. We stop the script after that: with no database there is nothing else
 * a request could possibly do.
 */
function getDbConnection()
{
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

    if ($conn->connect_error) {
        returnWithError('Database connection failed');
        exit();
    }

    // utf8mb4 lets names and emails contain accents, emoji, and other
    // non-English characters without turning into garbage.
    $conn->set_charset('utf8mb4');

    return $conn;
}

/*
 * Reads the JSON body the frontend sent us and turns it into a normal PHP
 * associative array, so an endpoint can just say $inData['firstName'].
 *
 * Our frontend posts raw JSON rather than an HTML form, so the data does NOT
 * show up in $_POST. 'php://input' is how you read that raw body.
 *
 * The "?? []" part means: if the body was empty or was not valid JSON,
 * json_decode returns null, so use an empty array instead. That way endpoints
 * never crash on a bad request, they just see missing fields.
 */
function getRequestInfo()
{
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

/*
 * Sends a PHP array back to the browser as JSON and sets the header that tells
 * the browser "this response is JSON".
 *
 * Shared here so every endpoint answers in exactly the same format. We always
 * hand a PHP array to json_encode() and let PHP build the text. Never glue
 * JSON strings together by hand: a name with a quote or backslash in it would
 * produce broken JSON the frontend cannot parse.
 */
function sendResultInfoAsJson($obj)
{
    header('Content-Type: application/json');
    echo json_encode($obj);
}

/*
 * Sends back a JSON error message, like {"error":"Invalid credentials"}.
 *
 * The frontend checks the "error" field on every response, so keeping this in
 * one function guarantees the spelling and shape of that field never drift
 * between endpoints.
 */
function returnWithError($err)
{
    sendResultInfoAsJson(['error' => $err]);
}
