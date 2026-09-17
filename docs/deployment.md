# URL for the website recorded here

https://contacts.cop4331ruth.lol

## API/sql/ must not be deployed

Local setup only. Exclude it from whatever copies the repo to the web root:

```
rsync -av --exclude 'API/sql/' ./ user@host:/path/to/webroot/
```

`API/sql/.htaccess` blocks access as a backup, but don't rely on it alone.