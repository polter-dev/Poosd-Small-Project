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
 *     require_once 'db.php';
 *
 * PHP looks in the folder of the file doing the including, so that works for
 * every endpoint because they all sit next to this file in API/.
 */

// Pulls in DB_HOST, DB_USER, DB_PASS, DB_NAME. This is the git-ignored file
// with the real credentials, created by copying config.example.php.
require_once __DIR__ . '/config.php';

/*
 * From PHP 8.1 onward, mysqli reports problems by THROWING an exception rather
 * than by returning false. We set that mode explicitly so this code behaves the
 * same way on every server instead of depending on the PHP version.
 *
 * The catch is that an exception nobody catches makes PHP print an HTML error
 * page -- which usually includes the database user name and the failing query.
 * That is both a leak and unreadable to our frontend, which only ever calls
 * JSON.parse() on the response. So we turn the printed errors off and install
 * one handler that answers with ordinary JSON instead.
 */
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
ini_set('display_errors', '0');

set_exception_handler(function ($e) {
    // The real reason is written to the server log for us to read; the browser
    // only gets a generic message, so we never hand an attacker the details.
    error_log('API error: ' . $e->getMessage());
    returnWithError('Server error, please try again');
    exit();
});

/*
 * Safely pulls one text field out of the decoded request body.
 *
 * The body is whatever the client chose to send, so a field we expect to be a
 * string can arrive as a number, a list, or not at all. Handing a list to
 * trim() is a fatal error in PHP 8, which would crash the endpoint and return
 * an HTML error page instead of JSON. Anything that is not a string is treated
 * as "not filled in", and the endpoint's own empty-field check then rejects it
 * with a normal error message.
 */
function getTextField($data, $key)
{
    if (!isset($data[$key]) || !is_string($data[$key])) {
        return '';
    }

    return trim($data[$key]);
}

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
    // Because of the mysqli_report() setting above, a bad host or password
    // throws instead of returning a broken connection. The exception handler
    // turns that into a JSON error for us, so there is no error check here.
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

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

/*
 * Failure response in the exact shape Register.php and Login.php promise:
 * { "id": 0, "firstName": "", "lastName": "", "error": <message> }.
 *
 * Both endpoints answer every failure with this same shape, so it lives here
 * once instead of being copy-pasted into each failure path where the copies
 * could drift apart. Ends the request: callers must close any open statement
 * and connection BEFORE calling this.
 */
function returnWithAuthError($err)
{
    sendResultInfoAsJson([
        'id'        => 0,
        'firstName' => '',
        'lastName'  => '',
        'error'     => $err
    ]);
    exit();
}
