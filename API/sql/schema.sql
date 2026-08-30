-- schema.sql
--
-- Source-of-truth database schema for the Personal Contact Manager.
-- Run this once on the server to create the database and its two tables:
--   mysql -u root -p < API/sql/schema.sql
--
-- WARNING: the DROP TABLE lines below delete existing data. That is fine while
-- we are setting up, but do not re-run this on a database you care about.

CREATE DATABASE IF NOT EXISTS ContactManager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE ContactManager;

-- Drop Contacts first: it has a foreign key pointing at Users, so MySQL will
-- not let us drop Users while Contacts still references it.
DROP TABLE IF EXISTS Contacts;
DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
  ID        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  FirstName VARCHAR(50)  NOT NULL,
  LastName  VARCHAR(50)  NOT NULL,
  Login     VARCHAR(50)  NOT NULL UNIQUE,
  Password  VARCHAR(255) NOT NULL   -- output of PHP password_hash()
) ENGINE=InnoDB;

CREATE TABLE Contacts (
  ID        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  UserID    INT NOT NULL,
  FirstName VARCHAR(50)  NOT NULL DEFAULT '',
  LastName  VARCHAR(50)  NOT NULL DEFAULT '',
  Phone     VARCHAR(20)  NOT NULL DEFAULT '',
  Email     VARCHAR(100) NOT NULL DEFAULT '',
  INDEX idx_contacts_user (UserID),
  FOREIGN KEY (UserID) REFERENCES Users(ID) ON DELETE CASCADE
) ENGINE=InnoDB;
