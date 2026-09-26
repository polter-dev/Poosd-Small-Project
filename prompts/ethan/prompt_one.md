# AI Assistance Log — Ethan Zeng

* **Tool**: ChatGPT, GPT-5.x (OpenAI), accessed via chatgpt.com

* **Date**: September 2026

* **Scope**: Database implementation and documentation for the Contact Manager project — designing and reviewing the MySQL `Users` and `Contacts` tables, defining the relationship between users and their contacts, creating seed/test data, and validating SQL queries.

* **Nature of use**: Asked questions about the database requirements and MySQL implementation, received explanations and example SQL, reviewed and refined the database schema and seed data, tested database queries, and used AI assistance to document the database structure. AI-assisted SQL was reviewed and tested before being incorporated into the project.

---

## Prompts

The assistant was used throughout the database implementation to help with questions and tasks including:

> Describe the ERD for the provided schema.

> Provide a valid and comprehensive SQL seed file.

> Provide a list of queries and expected outputs to test the database.

The database schema being reviewed included the `Users` and `Contacts` tables and their relationship through `Contacts.UserID`.

## Response

The assistant provided technical explanations and review related to the database implementation, including:

Interpreting the Users and Contacts table schemas.
Explaining primary keys, foreign keys, AUTO_INCREMENT, UNIQUE, indexes, and ON DELETE CASCADE.
Explaining the one-to-many relationship between Users.ID and Contacts.UserID.
Reviewing seed data used to populate the database with test users and contacts.
Checking that seeded contacts correctly referenced existing users through UserID.
Reviewing MySQL inspection commands such as USE, DESCRIBE, and SHOW CREATE TABLE.
Reviewing and explaining the SQL query used by the contact search API.
Verifying that contact searches were restricted by UserID and could match first name, last name, phone, or email using LIKE.


AI assistance was primarily used to interpret, review, and validate the database implementation and SQL rather than to develop application features.


## Implementation Work

Database-related work completed with AI assistance included:

* Creating/reviewing the `Users` table structure.
* Creating/reviewing the `Contacts` table structure.
* Creating and validating seed/test data.
* Testing the schema using MySQL inspection queries.
* Creating an ERD description of the database.
* Explaining individual MySQL statements and database behavior during implementation.

All AI-assisted database code and suggestions were reviewed and tested before being used in the project. The final database implementation was verified against the project's requirements.

