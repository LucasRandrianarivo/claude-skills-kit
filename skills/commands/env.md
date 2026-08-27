---
description: Configuration & secrets — env vars per environment, validation at startup, secret storage and rotation, .env hygiene
argument-hint: "[--audit] [--add <VAR>] [--rotate <VAR>] [--sync]"
---

# /env — Configuration & Secrets

## Usage
```
/env --audit             — audit config and secret handling across the project
/env --add STRIPE_KEY    — add a variable everywhere it must exist
/env --rotate <VAR>      — rotate a secret without downtime
/env --sync              — reconcile .env.example, code usage, CI and deploy config
```

## Overview
Configuration failures are boring and expensive: a missing variable that crashes at 2am instead of at boot, a production key in a `.env` committed three years ago, a staging service quietly pointing at the production database. This skill makes config **explicit, validated, and environment-scoped**, and treats secrets as things that must be rotatable.

The principle: **config comes from the environment; secrets never live in the repository; the app refuses to start if either is wrong.**

---

## Phase 1: Inventory

1. Grep every read: `process.env`, `import.meta.env`, `os.environ`, `ENV[`, `System.getenv`, config modules, framework config files.
2. List every consumer: local dev, tests, CI, each deployed environment, Docker/compose, Kubernetes manifests, serverless config, the mobile bundle.
3. Classify each variable:

| Class | Examples | Where it lives |
|---|---|---|
| **Public config** | API base URL, feature flags, public keys (`NEXT_PUBLIC_*`, `VITE_*`, `EXPO_PUBLIC_*`) | Repo/build config — **assume the world reads it** |
| **Private config** | Log level, timeouts, pool size, region | Environment |
| **Secret** | DB password, API keys, signing keys, webhook secrets, OAuth client secrets | Secret manager / CI secret store only |

The classification is the audit: any secret in the public column is a 🔴, and a `NEXT_PUBLIC_`/`VITE_`/`EXPO_PUBLIC_` prefix on a real secret means it's already published to every user who loaded the app.

## Phase 2: Validate at startup, not at use

One config module, loaded once, that:
- Declares every variable with its type, whether it's required, and its default (defaults for non-secrets only — a secret must never have one).
- **Parses and validates at boot** (Zod/envalid/pydantic-settings/viper) and exits with a message naming the missing or malformed variables. A `undefined` reaching an HTTP client at request time is a 3am page; a startup failure is a deploy that never went live.
- Exports typed values; the rest of the code imports from this module and **never reads the environment directly** — that's what makes the inventory possible.
- Refuses obviously wrong combinations: production with a debug flag on, a test key in production, a staging URL in a production build.

## Phase 3: Files and hygiene

- `.env` is git-ignored. `.env.example` is committed and lists **every** variable with a comment and a placeholder — never a real value.
- Per-environment files follow the framework's convention (`.env.local`, `.env.test`); precedence is documented so nobody debugs a variable that was overridden three files up.
- `.dockerignore`/build context excludes `.env` (see `/docker`) — otherwise the secret is in an image layer.
- Client bundles: verify what actually shipped (`grep` the built assets for a known secret fragment). A build-time inlined secret is not recoverable by deleting the variable later.

## Phase 4: Secrets

- **Storage**: the platform's secret manager (GitHub/GitLab CI secrets, Vault, AWS/GCP Secret Manager, Doppler, 1Password) — never a repo file, never a wiki, never a chat message.
- **Scope**: different values per environment, never shared between staging and production. A staging incident must not be able to touch production data.
- **Least privilege**: a key scoped to the operations used; a read-only key where writes aren't needed.
- **Access**: who can read production secrets is a short, reviewed list; every read is auditable where the tooling allows.
- **In CI**: masked and protected; never echoed, never passed as a command argument visible in logs (see `/cicd`).

## Phase 5 (`--rotate`): Rotate without downtime

The rotation that works, in order:
1. **Create the new credential** alongside the old (both valid).
2. **Deploy** the new value to every consumer — app, jobs, CI, third-party dashboards.
3. **Verify** every consumer works on the new credential (check the vendor's usage logs where available).
4. **Revoke the old one**, and confirm nothing breaks.
5. Record the rotation date and the next due date.

Anything else causes an outage. Also: rotate on **every** departure of someone who had access, and immediately on any exposure — a secret pushed to git is public from that moment, and rewriting history does not un-publish it (`/git` covers the order: rotate first, clean second).

## Phase 6: Report

```
## Config & Secrets Audit

Variables: <n> (public <n> · private <n> · secret <n>)
Validation at boot: ✓/✗   Single config module: ✓/✗   .env.example complete: <n> missing

| # | Severity | Variable | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | 🔴 | NEXT_PUBLIC_STRIPE_SECRET | secret shipped in the client bundle (found in dist/main.js) | move server-side, rotate the key |

Environments: <dev/staging/prod> — drift: <variables missing per environment>
Rotation: <n> secrets with a known age · oldest <n> months · rotation runbook: ✓/✗
```

🔴 = a secret exposed (repo, bundle, log, image layer) or shared across environments. 🟡 = no validation, missing from `.env.example`, no rotation path. 🔵 = naming and documentation.

## Rules
- Never print a secret's value — in output, logs, reports, or error messages. Reference it by name; the `redact` rule applies.
- Never commit a real value, not even "temporarily", not even in a test fixture.
- An exposed secret is rotated first; cleaning history comes after and does not replace it.
- The app must fail to start on missing or invalid config — silent defaults for secrets are forbidden.
- Public-prefixed variables are public: treat them as such when classifying, no exceptions.
- Never point a non-production environment at a production datastore.
