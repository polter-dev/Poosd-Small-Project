-- database/seed.sql
--
-- Fills ContactManager with two test users and ~10 contacts each, so
-- developers and the presentation demo have realistic data to search
-- against (see issue: populate test data / Week 2 checkpoint).
--
-- SAFE TO RE-RUN: deletes existing rows before inserting, so running this
-- twice does not create duplicates. Run it AFTER schema.sql, on whichever
-- MySQL instance you're demoing against:
--   mysql -u root -p ContactManager < database/seed.sql
--
-- TEST ACCOUNTS (plain-text password below is for testing only --
-- never do this with real user data):
--   Login: jane   Password: Password123
--   Login: kevin     Password: Password123
--
-- Both hashes below were generated with:
--   php -r 'echo password_hash("Password123", PASSWORD_DEFAULT);'
-- so Login.php's password_verify() will accept "Password123" for either account.

USE ContactManager;

-- Clear existing test data first (Contacts before Users: FK constraint).
DELETE FROM Contacts;
DELETE FROM Users;

-- Reset auto-increment counters so IDs are predictable/readable during demo.
ALTER TABLE Users AUTO_INCREMENT = 1;
ALTER TABLE Contacts AUTO_INCREMENT = 1;

-- ---------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------
INSERT INTO Users (FirstName, LastName, Login, Password) VALUES
  ('Jane', 'Doe', 'jane', '$2y$10$gOp.iCeQ9btiytqmYY4OwODFphz0GPlXl2Qm37zP7uve.wtyOYoIW'),
  ('Kevin',   'Nguyen',  'kevin',   '$2y$10$cH/5XP2jvvMZ0/0465hN3uuh3f2TEjm5vBxitfiQagIQQy7KukVBu');

-- ---------------------------------------------------------------------
-- Contacts for Jane (UserID = 1)
-- Several first names share prefixes ("An-", "Han-") on purpose, so
-- typing a partial term like "an" during the demo visibly narrows the
-- list instead of matching zero or one row.
-- ---------------------------------------------------------------------
INSERT INTO Contacts (UserID, FirstName, LastName, Phone, Email) VALUES
  (1, 'Anna',    'Reyes',     '407-555-0142', 'anna.reyes@example.com'),
  (1, 'Andrew',  'Reyes',     '407-555-0143', 'andrew.reyes@example.com'),
  (1, 'Hannah',  'Whitfield', '321-555-0187', 'hannah.w@example.com'),
  (1, 'Marcus',  'Cole',      '321-555-0199', 'marcus.cole@example.com'),
  (1, 'Priya',   'Natarajan', '689-555-0125', 'priya.n@example.com'),
  (1, 'Diego',   'Alvarez',   '689-555-0138', 'diego.alvarez@example.com'),
  (1, 'Sofia',   'Alvarez',   '689-555-0139', 'sofia.alvarez@example.com'),
  (1, 'Liam',    'Okafor',    '407-555-0161', 'liam.okafor@example.com'),
  (1, 'Grace',   'Kim',       '',             'grace.kim@example.com'),
  (1, 'Owen',    'Bishop',    '321-555-0172', '');

-- ---------------------------------------------------------------------
-- Contacts for kevin (UserID = 2)
-- Kept separate from jane's contacts to prove per-user isolation --
-- Kevin's search results should never include jane's rows.
-- ---------------------------------------------------------------------
INSERT INTO Contacts (UserID, FirstName, LastName, Phone, Email) VALUES
  (2, 'Angela',   'Foster',   '813-555-0110', 'angela.foster@example.com'),
  (2, 'Anthony',  'Delgado',  '813-555-0111', 'anthony.delgado@example.com'),
  (2, 'Hana',     'Suzuki',   '727-555-0164', 'hana.suzuki@example.com'),
  (2, 'Noah',     'Bianchi',  '727-555-0177', 'noah.bianchi@example.com'),
  (2, 'Ivy',      'Chen',     '954-555-0120', 'ivy.chen@example.com'),
  (2, 'Marcus',   'Lee',      '954-555-0133', 'marcus.lee@example.com'),
  (2, 'Fatima',   'Hassan',   '954-555-0148', 'fatima.hassan@example.com'),
  (2, 'Julian',   'Moretti',  '813-555-0156', 'julian.moretti@example.com'),
  (2, 'Ruth',     'Bianchi',  '727-555-0178', 'ruth.bianchi@example.com'),
  (2, 'Tyler',    'Grant',    '',             'tyler.grant@example.com');