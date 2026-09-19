# URL for the website recorded here

https://contacts.cop4331ruth.lol

## API/sql/ must not be served

The web root is a git clone of this repo, updated in place with `git pull` --
there is no copy/exclude step, so `API/sql/` (schema + seed data with real
bcrypt hashes) ends up on disk alongside everything else. It must never be
reachable over HTTP.

Two layers keep it from being served:

- `API/sql/.htaccess` denies all requests under that path.
- The vhost config also denies `API/sql/` directly, so the block still holds
  even on a server where `.htaccess` is ignored (`AllowOverride None`) or a
  future Apache/`mod_rewrite` change bypasses it.

Don't rely on either alone -- confirm both are in place after any server or
vhost change.