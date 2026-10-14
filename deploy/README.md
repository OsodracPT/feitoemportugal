# Deploying

The site is a static build: `pnpm build` writes plain files to `site/dist/`, and
any web server or static host can serve them. Nothing runs server-side.

```bash
SITE_URL=https://your-domain.example pnpm build
```

`SITE_URL` sets the origin used in canonical links, `hreflang`, the sitemap and
`robots.txt`. It defaults to `https://feitoemportugal.org`, so set it when you
deploy anywhere else.

This directory holds a reference setup (nginx in Docker, plus an optional push
deploy from GitHub Actions), but none of it is required. What matters is that the
web server does what the next section lists.

## What the web server must do

| | Behaviour | Why |
|---|---|---|
| Clean URLs | `/marcas` serves `/marcas/index.html` **without** redirecting; `/marcas/` redirects (301) to `/marcas` | The build uses `trailingSlash: 'never'` with directory output; canonicals and the sitemap have no trailing slash |
| 404 pages | Unknown paths under `/en/` get `/en/404/index.html`, everything else `/404.html`, with status 404 | One 404 page per language |
| CORS | `Access-Control-Allow-Origin: *` on `/api/v1/*` | The JSON API is open data; without it, browsers on other sites cannot read it |
| Caching | `/_assets/*` cached for a year, `immutable`; HTML and `/search-index.json` revalidated (`no-cache`) | Asset names are content-hashed; pages must update as soon as you deploy |
| Security headers | The headers in [`security-headers.conf`](security-headers.conf), notably the CSP | The CSP allows no inline script: the build emits none, and the policy keeps it that way |
| Rate limiting | `limit_req` on `/api/v1/` (generous) and `/api/submit/` (tight), returning 429 | Caps a scraper on the static API, and stops a flood reaching the submit service before the app's own per-IP limit |
| HTTPS | TLS, with a permanent (301/308) redirect from `http://` | HSTS is sent, and the canonicals are `https://` |
| `www` | Optional: redirect `www.<domain>` to `<domain>` | One canonical host |

A host that cannot set custom headers will still serve a working site. It loses
the CSP and HSTS, and other sites' browser code can no longer read the API.

## Option 1: a static host

Upload `site/dist/` to any static host and recreate the table above with its
tools: redirect rules, a headers file, a custom 404. Check that `/marcas` is
not redirected to `/marcas/` or `/marcas.html`, which many hosts do by default.

## Option 2: the reference nginx

[`nginx.conf`](nginx.conf) and [`security-headers.conf`](security-headers.conf)
implement the whole table except TLS. The config is domain-agnostic and serves
whatever directory is at `/srv/www/current`.

**Try it locally** against a fresh build:

```bash
docker run --rm -p 8080:80 \
  -v "$PWD/deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/deploy/security-headers.conf:/etc/nginx/snippets/security-headers.conf:ro" \
  -v "$PWD/deploy/real-ip.conf:/etc/nginx/snippets/real-ip.conf:ro" \
  -v "$PWD/site/dist:/srv/www/current:ro" \
  nginx:1.30-alpine
# http://localhost:8080/marcas
```

### Rate limits, and the client IP behind a proxy

`nginx.conf` rate-limits both APIs (`limit_req`), keyed on the client address, and
returns `429` when a client goes over. The static `/api/v1/` limit is generous; the
`/api/submit/` one is tighter, so a flood is dropped at nginx before it reaches the
runtime service (whose own per-IP limit then handles sustained abuse).

That keying has one catch behind a reverse proxy (a CDN, a load balancer, a
tunnel…): the connection address nginx sees is the **proxy's**, identical for
every visitor, so all of them would share one bucket and a single burst would lock
everyone out. The fix is to trust the proxy and read the real client from
`X-Forwarded-For` — but the proxy's address is site-specific and must not go in the
repository. So it lives in [`real-ip.conf`](real-ip.conf): the tracked copy is a
safe no-op (direct-facing deploy, trust nobody), and a deploy behind a proxy
overrides the mount with its own untracked file. In `docker-compose.override.yml`:

```yaml
services:
  web:
    volumes:
      - ./real-ip.local.conf:/etc/nginx/snippets/real-ip.conf:ro
```

with `real-ip.local.conf` (gitignored) holding, for your proxy's address or subnet:

```nginx
set_real_ip_from  <proxy address or subnet>;
real_ip_header    X-Forwarded-For;
real_ip_recursive on;
```

Trust only your proxy: if nginx is also reachable directly, never trust
`0.0.0.0/0`, or a client could forge the header to dodge the limit.

**On a server**, use [`docker-compose.yml`](docker-compose.yml). Copy this
directory to the server, put the build (or the release layout from option 3) in
the directory named by `FEP_WWW_DIR`, and start it:

```bash
cat > .env <<'EOF'
FEP_WWW_DIR=/opt/feitoemportugal/www   # must contain current/
FEP_BIND=127.0.0.1                     # only a local proxy can reach it
FEP_PORT=8080
EOF
docker compose up -d
```

Then point your TLS terminator (Caddy, Traefik, nginx, HAProxy, a load balancer
or a CDN) at that port. Have it redirect `http://` to `https://` with a 301 or
308 and pass the original `Host` header through.

If your proxy reaches containers over a Docker network instead of a published
port, describe that in a `docker-compose.override.yml` next to the compose file.
Compose merges it automatically, and it stays out of the repository:

```yaml
services:
  web:
    ports: !reset []
    networks: [proxy]
networks:
  proxy:
    external: true
```

Without Docker, include `nginx.conf` in your nginx's `http {}` block and adjust
`root` and the `include` path of the headers snippet.

After changing the config: `docker compose exec web nginx -t`, then
`docker compose exec web nginx -s reload`.

## The submission service (optional)

The site is static, but the contribution forms (`/submeter`, `/en/submit`) post to
a small runtime service, `submit-api/`. It stores each submission, emails the
maintainer, and, for a clean new-brand suggestion, opens a draft PR. It is
**optional**: without it the forms fall back to the GitHub issue links, and the
rest of the site is unaffected.

It runs behind the same nginx, under `/api/submit/` on the **site's own origin**.
That is deliberate: the forms post and `fetch` same-origin, so the production CSP
(`script-src 'self'`, `connect-src 'self'`, `form-action 'self'`) needs **no
change**. The anti-spam is [Altcha](https://altcha.org) proof-of-work, solved in
the browser and verified in the service with `node:crypto`. No third-party script,
which is the whole reason the CSP stays untouched.

The service is off by default (a Compose profile). Unlike the static site, which
is just the build in `FEP_WWW_DIR`, the service is **built from the repository**,
so this deploy needs a checkout. From a clone on the server:

```bash
cp .env.example deploy/.env      # then fill in the submit-* values
cd deploy
docker compose --profile submit up -d --build
```

What to set in `.env` (see [`.env.example`](../.env.example) for the full list):

| Variable | |
|---|---|
| `SECRET_KEY` | **Required.** Signs Altcha challenges and hashes stored IPs. `openssl rand -hex 32` |
| `SITE_ORIGIN` | The public origin, for the thank-you redirect and reading `/api/v1/brands.json` |
| `SMTP_*`, `MAIL_TO` | The maintainer mailbox (nodemailer). Unset ⇒ mail is only logged. See the email section below |
| `GITHUB_TOKEN`, `GITHUB_REPO` | A token (repo contents + PR) to auto-open draft-brand PRs. Unset ⇒ email only |
| `RATE_MAX`, `RETENTION_DAYS` | Per-IP hourly limit (5) and how long a row is kept (90 days) |

Storage is one SQLite file on the `submit-data` volume. The service sweeps rows
older than `RETENTION_DAYS` on boot and once a day; nothing else to schedule. The
submitter's email is stored only when given and never published; the IP is kept
only as a salted hash, for the rate limit.

Secrets live only in `deploy/.env` on the server, never in the repository
([the repo stays host-agnostic](../AGENTS.md)). `GITHUB_BASE` defaults to `main`.

### Email: the notification mailbox

The service sends the maintainer notification over plain SMTP, so any mailbox that
offers SMTP works — a mailbox from your domain's email provider, or a transactional
sender. The simplest setup is one real mailbox that both sends and receives: the
service authenticates to it and the notification lands in the same inbox you read.

1. **Create (or pick) a mailbox** with a password, and get its SMTP details from the
   provider: host, port (usually `587` for STARTTLS or `465` for SSL), and whether
   the login is the full address.
2. **Make sure the domain can send as it:** the provider's MX/SPF (and ideally DKIM)
   records must be in DNS. A domain can carry only **one SPF record**, so if an old
   provider's records are still there, remove them first. DNS changes can take a few
   hours.
3. **Fill `deploy/.env`** (see [`.env.example`](../.env.example)):

   ```ini
   SMTP_HOST=smtp.your-provider.example
   SMTP_PORT=587                         # 587 STARTTLS, or 465 with SMTP_SECURE=true
   SMTP_SECURE=false
   SMTP_USER=you@your-domain.example     # often the full address is the login
   SMTP_PASS=<the mailbox password>
   MAIL_FROM=you@your-domain.example
   MAIL_TO=you@your-domain.example       # where submissions land
   ```

4. **Restart the service** (`docker compose --profile submit up -d`) and submit a
   test form. The mail should arrive within seconds; if not, check
   `docker compose logs submit` and confirm the SMTP host, port and password.

Until SMTP is set the service just logs the mail, and a new-brand submission still
opens its PR, so nothing is lost in the meantime.

### CSP

The `security-headers.conf` CSP is **unchanged** by this service. If you add the
service after the fact, only `nginx.conf` gains the `/api/submit/` proxy; reload
nginx (`docker compose exec web nginx -s reload`) and the forms light up.

## Visit counts with Umami (optional)

The site counts visits with a self-hosted [Umami](https://umami.is): no cookies,
no profile of the visitor, and the IP address is only used, never stored. It is
off unless two things are set: the `stats` Compose profile on the server, and
`UMAMI_WEBSITE_ID` at build time.

How it fits the CSP: nginx proxies only `/stats/script.js` (the tracker) and
`/stats/api/send` (where it posts) to the `umami` container, so the browser only
talks to the site's own origin and `security-headers.conf` stays unchanged. The
pages carry `data-do-not-track="true"` and `data-domains` set to the `site`
hostname, so a local or preview build counts nothing.

1. In `deploy/.env`, set `UMAMI_DB_PASSWORD` and `UMAMI_APP_SECRET` (each
   `openssl rand -hex 32`). See `.env.example` at the repository root.
2. Start it: `docker compose --profile stats up -d`. With the `submit` service
   too, name both profiles: `--profile submit --profile stats`.
3. Reach the dashboard. It listens on `UMAMI_BIND:UMAMI_PORT` (default
   `127.0.0.1:3000`): put it behind your reverse proxy on a hostname of its own,
   ideally behind your proxy's login, or use an SSH tunnel. Never route it
   through the public site.
4. Log in with Umami's default `admin` / `umami` and **change that password
   at once**. Add a website with your domain and copy its website id.
5. Set the id as `UMAMI_WEBSITE_ID`: the `production` variable for automatic
   deploys (below), or an environment variable for a manual `pnpm build`. The
   next build adds the tracker to every page.
6. Reload nginx if it predates the `/stats/` locations
   (`docker compose exec web nginx -s reload`, or `up -d --force-recreate web`
   when `nginx.conf` is a bind-mounted file you replaced).

Check: `curl -sI https://your-domain.example/stats/script.js` answers 200, and a
page view shows up in the dashboard's realtime view within seconds.

## Option 3: automatic deploys from GitHub Actions

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) runs on every push to
`main`. It runs the same checks as CI, builds, uploads the build to the server over
SSH, switches the site to it, and checks that the live site serves the new build.
The job skips itself when no deploy target is configured, so forks are unaffected.

### How a deploy works

```
<root>/
  <commit-sha>/     one directory per deployed commit
  current -> <sha>  what the web server serves
```

1. `rsync -rlc --delete --link-dest=/current site/dist/ <sha>/`. Files that did not
   change are hard-linked from the live release instead of copied, and keep their
   mtime, so their ETags survive.
2. `activate <sha>`:
   - Hard-links in the previous release's hashed assets, so a tab still showing
     old HTML can lazy-load its old chunks.
   - Swaps `current` with an atomic rename.
   - Keeps the newest five releases.
3. Smoke test: `$SITE_URL/api/v1/brands.json` must carry this build's
   `generated_at`.

The CI key never gets a shell. On the server it is pinned to
[`fep-deploy-gate`](fep-deploy-gate), which allows exactly an rsync confined to the
release directory (through `rrsync`) and `activate <40-hex sha>`.

### Server setup

On a Debian/Ubuntu server, as root:

```bash
apt-get install rsync          # provides /usr/bin/rrsync, which needs python3
adduser --system --group --shell /bin/sh --home /opt/feitoemportugal fep-deploy
install -d -o fep-deploy -g fep-deploy -m 755 /opt/feitoemportugal/www
install -d -o fep-deploy -g fep-deploy -m 700 /opt/feitoemportugal/.ssh
install -m 755 deploy/fep-deploy-gate /usr/local/bin/fep-deploy-gate
```

The web server must read `/opt/feitoemportugal/www/current` (`FEP_WWW_DIR` in
option 2). For another path, see the header of `fep-deploy-gate`.

Make a key pair for CI on your own machine and install the public half, pinned to
the gate:

```bash
ssh-keygen -t ed25519 -N '' -C ci-deploy -f ci-deploy
# on the server, in /opt/feitoemportugal/.ssh/authorized_keys (owner fep-deploy, mode 600):
restrict,command="/usr/local/bin/fep-deploy-gate" ssh-ed25519 AAAA... ci-deploy
```

If your sshd restricts logins with `AllowUsers` or `AllowGroups`, add `fep-deploy`.

Test it from your machine. Expected output: `fep-deploy-gate: not a commit sha: x`.

```bash
ssh -i ci-deploy fep-deploy@your-server 'activate x'
```

### GitHub configuration

In the repository: **Settings → Environments → New environment** `production`.

| Name | Kind | Value |
|---|---|---|
| `DEPLOY_SSH_KEY` | secret | The private key. One line of `base64 -w0 ci-deploy` is safest to paste; the raw key also works |
| `DEPLOY_KNOWN_HOSTS` | secret | Output of `ssh-keyscan -t ed25519 your-server`, checked against the server's real fingerprint (`ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the server) |
| `DEPLOY_HOST` | variable | Server address |
| `DEPLOY_USER` | variable | Optional, default `fep-deploy` |
| `DEPLOY_PORT` | variable | Optional, default `22` |
| `SITE_URL` | variable | Your public origin, e.g. `https://your-domain.example` |
| `UMAMI_WEBSITE_ID` | variable | Optional. The website id from your Umami dashboard; leave unset for no analytics |

Then delete the private key from your machine. GitHub never shows a secret's value
again; to rotate, make a new pair and replace the line in `authorized_keys`.

### Rolling back

Any release still on disk can be made live again:

```bash
ls -t /opt/feitoemportugal/www/
sudo -u fep-deploy env SSH_ORIGINAL_COMMAND="activate <sha>" /usr/local/bin/fep-deploy-gate
```

## Troubleshooting

- **"Configure SSH" fails with "not a valid private key".** The secret holds
  something else: a partial paste, or the public key. Store it as one line of
  `base64 -w0`.
- **The fingerprint printed in "Configure SSH" differs from the server's.** The key
  in GitHub is not the one in `authorized_keys`. Compare with
  `ssh-keygen -lf /opt/feitoemportugal/.ssh/authorized_keys`.
- **"Upload release" times out.** Something is dropping the runner's address: a
  firewall, an intrusion-prevention blocklist, or a per-source SSH rate limit.
  GitHub runners share address ranges that sometimes land on blocklists. Re-running
  the job usually gets a different address.
- **rsync: "do not use .. in --link-dest".** `rrsync` roots every path at the
  release directory, so the link-dest must be `/current`, not `../current`.
- **A new nginx `location` loses the security headers.** nginx drops inherited
  `add_header` directives as soon as a location sets its own, so every location
  includes `security-headers.conf`. A new one must too.
- **Something works in `pnpm dev` but not in production.** Check the browser console
  for CSP violations: the dev server sends no CSP.
