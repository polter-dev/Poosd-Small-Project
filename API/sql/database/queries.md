QUERIES:

1. SHOW DATABASES;
2. USE ContactManager;
3. SHOW TABLES;
4. DESCRIBE Users;
5. DESCRIBE Contacts;
6. SHOW CREATE TABLE Contacts;                  -- shows the FK and index
7. SELECT * FROM Users;
8. SELECT * FROM Contacts;
9. SELECT * FROM Users WHERE ID = 1;
10. SELECT * FROM Contacts WHERE ID = 1;
11. SELECT * FROM Contacts WHERE UserID = 1;     -- one user's contacts
12. SELECT * FROM Contacts WHERE UserID = 1 AND (FirstName LIKE '%an%' OR LastName LIKE '%an%' OR Phone LIKE '%an%' OR Email LIKE '%an%');  -- what the search API runs
13. SELECT u.Login, COUNT(c.ID) AS contacts FROM Users u LEFT JOIN Contacts c ON c.UserID = u.ID GROUP BY u.ID;