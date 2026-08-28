---
description: Nginx configuration — reverse proxy, TLS, caching, compression, security headers, rate limiting, SPA/SSR routing
argument-hint: "[--audit] [--proxy <upstream>] [--spa] [--ssr] [--tls]"
---

# /nginx — Nginx Configuration & Audit

## Usage
```
/nginx --audit             — audit the existing config, report and fix
/nginx --proxy localhost:3000  — reverse proxy in front of an app server
/nginx --spa               — static SPA hosting with history fallback
/nginx --ssr               — proxy an SSR app with correct caching
/nginx --tls               — TLS/HTTPS hardening only
```

## Overview
Nginx sits between every user and your app: a wrong line here breaks WebSockets, caches a logged-in user's page for everyone, leaks your version, or silently drops uploads at 1MB. This skill writes and audits that config against what the app actually is.

Always: **test before reload.** `nginx -t` is not optional, and a config that fails to reload takes the site down.

Field notes: `.claude/references/http.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Establish the target

1. Find the config: `/etc/nginx/nginx.conf`, `sites-available/`, `conf.d/`, a Docker `nginx.conf`, or a Helm/compose mount. In containers, the config is in the repo — treat it as code.
2. Identify what's being served: static SPA · SSR app (Next/Nuxt/Remix) · API upstream · mixed · file uploads · WebSockets/SSE · long-polling.
3. Note the TLS source: certbot/Let's Encrypt, a cloud LB terminating TLS upstream, or a mounted cert.
4. Note whether Nginx is behind another proxy (CDN, cloud LB) — that changes the real-IP and forwarded-header handling.

## Phase 2: The blocks that matter

**Reverse proxy (app upstream)**

The `map` and the `upstream` live in the `http` block, the `location` inside a
`server` — and they ship together. Copying only the `location` is the most common
mistake: `$connection_upgrade` does not exist without its `map`, and `nginx -t`
fails with `unknown "connection_upgrade" variable`.
```nginx
# http context — once per server
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

upstream app_upstream {
    server 127.0.0.1:3000;
    keepalive 32;                          # without this, a new connection per request
}

server {
    listen 80;
    server_name example.test;

    location / {
        proxy_pass http://app_upstream;
        proxy_http_version 1.1;                       # keepalive + WebSocket support
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # or the app builds http:// URLs
        proxy_set_header Upgrade           $http_upgrade;   # WebSockets
        proxy_set_header Connection        $connection_upgrade;
        proxy_read_timeout 60s;                       # raise only for streaming/SSE
        proxy_buffering on;                           # OFF for SSE/streaming responses
    }
}
```
`proxy_http_version 1.1` and the `Connection` header driven by the map are what make upstream keepalive and WebSocket upgrades work together; without both, the pool above is ignored.

Verify before reloading, always: `nginx -t` catches every one of these at build time rather than at 3am.

**SPA (static + history fallback)**

`add_header` does **not** inherit: the moment a `location` declares one of its own,
every `add_header` from the enclosing `server` block is dropped for that location.
So security headers live in a snippet that each location re-includes:
```nginx
# snippets/security-headers.conf
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```
```nginx
server {
    include snippets/security-headers.conf;                 # applies where no location adds its own

    location / {
        try_files $uri $uri/ /index.html;
    }
    location /assets/ {                                     # hashed filenames → immutable
        include snippets/security-headers.conf;             # re-included, or it is lost here
        add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
    location = /index.html {                                # the shell is never cached
        include snippets/security-headers.conf;
        add_header Cache-Control "no-cache" always;
    }
}
```
Hashed assets are immutable for a year; the HTML entry point never is. Getting this backwards ships a stale app to every returning user.

Verify the inheritance trap explicitly: `curl -I https://host/assets/<file>` must show the
security headers **and** the cache directive. If the security headers are missing there,
a nested `add_header` ate them.

**Compression** — `gzip on` with `gzip_types` covering JSON/JS/CSS/SVG, `gzip_min_length 1024`, `gzip_vary on`. Add brotli if the build has the module. Never compress already-compressed formats.

**Uploads & limits** — `client_max_body_size` set to what the app actually accepts (the default 1MB silently 413s), plus matching timeouts for slow clients.

**TLS**
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_stapling on; ssl_stapling_verify on;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```
Redirect 80 → 443 permanently, but leave `/.well-known/acme-challenge/` reachable over HTTP or renewals break.

**Security headers** (`always`, so they apply to error responses too): `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors`, a CSP appropriate to the app, `Permissions-Policy`. Plus `server_tokens off`.

**Rate limiting** — `limit_req_zone` on auth/login/API paths with a `burst` and `nodelay`; `limit_conn` against connection floods. Set limits above real usage, then watch the 429s.

## Phase 3: Audit checklist

| # | Check | Why it matters |
|---|---|---|
| 1 | `proxy_set_header Host`/`X-Forwarded-*` present | Redirects, absolute URLs and rate limiting by IP all break without them |
| 2 | `Upgrade`/`Connection` headers | WebSockets/HMR fail silently |
| 3 | `proxy_buffering off` on SSE/streaming routes | Streamed responses arrive all at once, or never |
| 4 | `client_max_body_size` matches the app | Uploads 413 at 1MB by default |
| 5 | Cache-Control split (immutable assets vs no-cache HTML) | Stale app shells for returning users |
| 6 | No caching of authenticated responses | Cross-user data leak — the worst failure mode here |
| 7 | HTTP→HTTPS redirect + HSTS, ACME path exempt | Renewal breakage takes the site down at expiry |
| 8 | Modern TLS only, OCSP stapling | Weak protocols, slow handshakes |
| 9 | `server_tokens off`, no directory autoindex, dotfiles denied | Version fingerprinting, accidental exposure |
| 10 | Security headers with `always`, re-included in every `location` that sets its own `add_header` | Missing on 404/500 responses, and silently dropped in nested locations |
| 11 | Rate limits on auth and expensive endpoints | Credential stuffing, scraping |
| 12 | `access_log` format includes upstream time and request id | Debugging a slow endpoint is guesswork otherwise |
| 13 | Default server block returning 444/444-like for unknown hosts | Host-header abuse |
| 14 | Real IP from the upstream proxy (`set_real_ip_from`, `real_ip_header`) | Every client looks like the CDN otherwise |
| 15 | `worker_connections`/file limits sized for expected concurrency | Silent connection refusals under load |

## Phase 4: Apply & verify

1. Write the change; keep a copy of the previous config.
2. `nginx -t` — **never** reload on a failed test.
3. `nginx -s reload` (or the container's reload path).
4. Verify from outside: `curl -I https://host` for headers and cache directives, an upload at the size limit, a WebSocket handshake, an SSE stream, a 404 (headers still present?), and `curl -H "Host: unknown"` for the default server.
5. Check the error log after the first real traffic.

## Phase 5: Report

```
## Nginx Audit — <site>

Config: <files>   Serves: <SPA | SSR | API | mixed>   TLS: <source>
| # | Severity | Directive/Block | Issue | Fix |
|---|----------|-----------------|-------|-----|
| 1 | 🔴 | location / | proxy_cache on an authenticated route, no Vary/bypass | bypass cache when a session cookie is present |

nginx -t: ✓   Reload: ✓   External checks: headers ✓ upload ✓ websocket ✓
```

## Rules
- `nginx -t` before every reload, no exceptions.
- Never cache a response that depends on a session; a wrong cache key here leaks one user's data to another.
- Never disable TLS verification or downgrade protocols to make a client work — fix the client.
- Config lives in version control when the deployment allows it; a hand-edited server is a config nobody can restore.
- Changes go through staging first when a staging environment exists.
