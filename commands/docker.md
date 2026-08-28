---
description: Dockerfile & compose — multi-stage builds, small secure images, caching, compose for local dev, healthchecks
argument-hint: "[--audit] [--build] [--compose] [--optimize]"
---

# /docker — Containerization

## Usage
```
/docker                    — audit the existing Dockerfile/compose, fix the top issues
/docker --build            — write a production Dockerfile for this project
/docker --compose          — write a local dev compose stack (app + db + cache)
/docker --optimize         — image size and build-time pass only
```

## Overview
Most Dockerfiles work and are still wrong: 1.2GB because the build toolchain shipped to production, a cache that rebuilds everything on a source change, running as root, secrets baked into a layer, and no healthcheck so the orchestrator can't tell alive from hung.

This skill fixes the four things that matter: **correctness, size, build speed, security**.

Field notes: `.claude/references/devops.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Read the project and what exists

1. Runtime and version (from the manifest and engines/`.nvmrc`/`.python-version`); package manager and lockfile; build output path; the start command; required env vars; exposed port.
2. Existing `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and any registry/CI build step.
3. Whether the app is compiled/bundled (a build stage exists), interpreted, or a static site (then the final image is a web server, per `/nginx`).

## Phase 2: The production Dockerfile

Structure, always multi-stage:

```dockerfile
# 1. deps — install with the lockfile, cached on the lockfile alone
FROM <runtime>:<pinned-minor>-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. build — source changes invalidate from here, not from the install
FROM deps AS build
COPY . .
RUN npm run build

# 3. prod-deps — production dependencies only, resolved from the same lockfile
FROM deps AS prod-deps
RUN npm ci --omit=dev

# 4. runtime — only what production needs
FROM <runtime>:<pinned-minor>-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build     /app/dist         ./dist
COPY --from=prod-deps /app/node_modules ./node_modules   # never from `deps`: that stage holds devDependencies
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node healthcheck.js
CMD ["node", "dist/server.js"]
```

Rules applied by this skill:
- **Layer order = cache strategy**: manifest+lockfile first, install, *then* source. Copying source before installing dependencies rebuilds everything on every commit — the single most common waste.
- **Pin the base image** to a minor version (and prefer `-slim`/`-alpine` where the runtime supports it; watch out for musl-incompatible native deps).
- **Never run as root**: create or use a non-root user, and make sure the app's writable paths are owned by it.
- **`.dockerignore`** with `node_modules`, `.git`, tests, `.env`, build caches, coverage — it shrinks the context and prevents secrets from entering the build.
- **No secrets in layers**: never `COPY .env`, never `ARG` a token that ends up in history. Use BuildKit secret mounts (`RUN --mount=type=secret,...`) or inject at runtime.
- **Only production dependencies** in the final stage: copying `node_modules` from the stage that ran the full install ships the whole dev toolchain — resolve them in a dedicated stage (`--omit=dev` / `--production` / `--only=main`) or prune before copying. Verify with `docker run <img> ls node_modules | wc -l` against the local production install.
- **A real HEALTHCHECK** that exercises the app's readiness path, not `curl localhost` against a route that answers before the DB connects.
- **Signals**: `CMD ["executable", "args"]` in exec form so SIGTERM reaches the process; add an init (`--init`/tini) when the process spawns children.
- **Deterministic installs**: `npm ci` / `pnpm i --frozen-lockfile` / `uv sync --frozen` / `go mod download`, never a bare `install`.

## Phase 3: Compose for local development

The dev stack the README should have described:
- App with a bind mount for source and a named volume for dependencies (so the host's `node_modules` doesn't shadow the container's).
- Its real dependencies: database, cache, queue — pinned versions matching production's majors.
- `healthcheck` on each service and `depends_on: condition: service_healthy`, so the app doesn't race the database.
- Named volumes for data (so `docker compose down` doesn't wipe the dev database).
- `.env.example` documenting every variable the stack needs; the compose file reads `.env`, which is git-ignored.
- One documented command to get from clone to running app — and verify it works from a clean state.

## Phase 4: Audit checklist

| # | Check | Failure |
|---|---|---|
| 1 | Multi-stage with a lean runtime | Build toolchain shipped to production |
| 2 | Lockfile-only layer before source copy | Full reinstall on every code change |
| 3 | Base image pinned, not `latest` | Irreproducible builds, surprise breakage |
| 4 | Non-root `USER` | Container escape severity, file ownership problems |
| 5 | `.dockerignore` present and covering `.git`/`.env` | Secrets and 500MB of context in the build |
| 6 | No secrets in `ARG`/`ENV`/copied files | Credentials readable in image history |
| 7 | Production-only dependencies at runtime | Larger attack surface and image |
| 8 | HEALTHCHECK meaningful | Orchestrator can't detect a hung app |
| 9 | Exec-form CMD, signal handling | 10-second SIGKILL on every deploy, dropped requests |
| 10 | Image size sane for the stack | Slow pulls, slow deploys, slow rollbacks |
| 11 | Vulnerability scan in CI (`docker scout`, `trivy`) | Known CVEs shipping to production |
| 12 | Same image promoted across environments | "Works in staging" with a different build |

## Phase 5: Verify

1. `docker build .` from a clean cache — record size and build time.
2. Rebuild after touching one source file — the install layer must be **cached** (that's the whole point).
3. `docker run` it: healthcheck goes healthy, the app answers, `docker stop` exits fast (signals work), logs go to stdout/stderr.
4. `docker history` — check no layer contains a secret; `docker image ls` — record the before/after size.
5. Scan with `trivy`/`docker scout` if available; report high/critical findings.

## Phase 6: Report

```
## Docker — <project>

Image: <before> MB → <after> MB    Cold build: <t1> → <t2>    Cached rebuild: <t>
| # | Severity | Where | Issue | Fix |
|---|----------|-------|-------|-----|
| 1 | 🔴 | Dockerfile:14 | COPY . . before npm ci — cache always busted | copy the lockfile first |

Runtime: non-root ✓  healthcheck ✓  signals ✓  prod deps only ✓
Compose: <services> · healthy startup order ✓ · one-command boot ✓
Scan: <n> critical / <n> high
```

## Rules
- Never bake a secret into an image; runtime injection or BuildKit secrets only.
- Never `latest` for a base image in a committed Dockerfile.
- Never run the production container as root without an explicit, stated reason.
- Verify with an actual build and run — image size claims without a build are guesses.
- Keep dev and production images consistent in runtime version; drift there produces bugs nobody can reproduce.
