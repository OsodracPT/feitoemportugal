# Deploy

The site is a static build served by nginx on the project VPS, behind the Pangolin
reverse proxy that already fronts other services there. This replaces the
Caddy + Compose setup in the original spec. Pangolin's Traefik already owns ports
80/443 and the Let's Encrypt certificates, so the origin only has to serve files.

```
client ─TLS─▶ gerbil:443 ─▶ Traefik (LE cert, CrowdSec, rate limit)
                              │  Pangolin resources feitoemportugal.org + www, no SSO
                              ▼
               nginx "fep-web"  nostr-net 172.22.0.40:80  (read-only)
                              ▼
          /opt/feitoemportugal/www/current -> <sha>/   (atomic symlink swap)
                              ▲
   GitHub Actions (deploy.yml): validate, typecheck, test, build → rsync as fep-deploy
```

## Files

| Here | On the server | |
|---|---|---|
| `nginx.conf` | `/opt/feitoemportugal/deploy/` | clean URLs, 404 per language, cache, CORS on `/api/v1/` |
| `security-headers.conf` | same | CSP, HSTS and friends, included by every location |
| `docker-compose.yml` | same | the `fep-web` container |
| `fep-deploy-gate` | `/usr/local/bin/` | forced command of the CI key |

`/opt/feitoemportugal/www/` holds one directory per deployed commit plus the
`current` symlink. It belongs to the `fep-deploy` system user. Everything else
there belongs to root.

## How a deploy works

A push to `main` runs `.github/workflows/deploy.yml`:

1. The same four gates as `validate.yml`, then `pnpm build`.
2. `rsync -rlc --delete --link-dest=/current site/dist/ deploy:<sha>/`. Files that
   did not change are hard-linked from the live release and keep their mtime, so
   their ETags carry over.
3. `ssh deploy "activate <sha>"`. The gate records the release's hashed assets,
   hard-links in the previous release's assets so tabs still open on the old HTML
   can lazy-load their chunks, swaps `current` with a rename, and keeps the newest
   five releases.
4. Smoke test: the live `/api/v1/brands.json` must carry this build's `generated_at`.

The CI key can only use `fep-deploy-gate`. That gate allows an rsync confined
to `www/` (through `rrsync`) and `activate <40-hex sha>`, and refuses everything
else.

GitHub configuration, in the `production` environment:

- secret `DEPLOY_SSH_KEY`: private key of `fep-deploy`
- secret `DEPLOY_KNOWN_HOSTS`: the server's host key line (`ssh-keyscan -t ed25519 <host>`,
  checked against `SHA256:4cltlUawPl8qwDmZ8WeOhQiVk43/KXN6RQUNMHgZHow`)
- variable `DEPLOY_HOST`: server address (a *variable*, not a secret)

The "Configure SSH" step prints the fingerprint of the key it loaded. It must match
the server's: `sudo ssh-keygen -lf /opt/feitoemportugal/.ssh/authorized_keys`.

## Common tasks

**Roll back.** Activate an older release that is still on disk:

```bash
ls -t /opt/feitoemportugal/www/
sudo -u fep-deploy env SSH_ORIGINAL_COMMAND="activate <sha>" /usr/local/bin/fep-deploy-gate
```

**Change the nginx config.** Edit it here, copy it to `/opt/feitoemportugal/deploy/`, then:

```bash
docker exec fep-web nginx -t && docker exec fep-web nginx -s reload
```

A change to the compose file needs `docker compose up -d` in that directory.

**Check the origin without the proxy.** Run this from the network namespace Traefik
lives in:

```bash
sudo nsenter -t $(docker inspect -f '{{.State.Pid}}' gerbil) -n \
  curl -sI -H 'Host: feitoemportugal.org' http://172.22.0.40/marcas
```

## Things that bite

- **A deploy that times out at SSH is probably CrowdSec, not GitHub.** The VPS
  drops IPs on the CrowdSec community blocklist at the firewall, and GitHub runner
  addresses sometimes land on it. The workflow retries once; re-running the job
  gets a different runner.
- **Port 22 is rate-limited** (ufw `LIMIT`: 6 new connections per 30 s per address).
  The workflow multiplexes rsync and activate over one connection; keep it that way.
- **`--link-dest` must be `/current`, not `../current`.** rrsync refuses `..` and
  roots absolute paths at `www/`.
- **nginx drops inherited `add_header`** as soon as a location sets its own, so every
  location includes `security-headers.conf`. A new location must too.
- **The CSP has `script-src 'self'` with no inline exception.** It holds because Astro
  emits no inline executable script. If a page starts needing one, the browser will
  block it; check the console after adding client code.
- **No access log on the origin.** Traefik already logs requests in
  `/opt/pangolin/config/traefik/logs/access.log`.

## Not here yet

The submission API (a container on the same network, proxied from `/api/submit`; the
spot is reserved in `nginx.conf`), Umami, and HSTS preload.
