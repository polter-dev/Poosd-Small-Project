<?php
/*
 * config.example.php
 *
 * This is a PLACEHOLDER config file. It holds fake values on purpose so it is
 * safe to keep in git.
 *
 * How to use it:
 *   1. On the server, copy this file to API/config.php
 *        cp API/config.example.php API/config.php
 *   2. Open API/config.php and replace the values below with the real database
 *      host, user, password, and database name.
 *
 * IMPORTANT: API/config.php is listed in .gitignore and must NEVER be
 * committed or pushed. It contains the real database password. This example
 * file exists so a new teammate can see exactly which settings they need
 * without us ever putting a real password in the repo.
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'contactapp');
define('DB_PASS', 'change-me');
define('DB_NAME', 'ContactManager');
