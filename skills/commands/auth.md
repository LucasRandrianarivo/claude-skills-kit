---
description: Authentication & authorization — sessions vs tokens, OAuth/OIDC, password & MFA handling, RBAC/ABAC, revocation
argument-hint: "[--build] [--audit] [--oauth <provider>] [--rbac]"
---

# /auth — Authentication & Authorization

## Usage
```
/auth --audit              — audit the existing auth: authn, authz, sessions, recovery
/auth --build              — implement auth for this project
/auth --oauth google       — add a social/OIDC provider
/auth --rbac               — design or fix the permission model
```

## Overview
Auth is the one feature where "it works" and "it's correct" are unrelated. The login page working proves nothing about session fixation, token revocation, or whether user A can read user B's invoice by changing an id. This skill builds and audits both halves — **authentication** (who you are) and **authorization** (what you may do) — where most codebases have only tested the first.

**Default advice: use the ecosystem's maintained solution** (Auth.js/NextAuth, Lucia, Better Auth, Devise, Django auth, Spring Security, Supabase/Clerk/Auth0/Keycloak) rather than hand-rolling. Hand-rolled auth is where the expensive bugs live. Say so once, then work with what the project chose.

Field notes: `.claude/references/security.md` — mechanism, traps and the symptom→cause→fix tables for this domain.

---

## Phase 1: Map what exists

1. Identify the mechanism: server session (cookie + store) · JWT (where? how long? refreshed how?) · OAuth2/OIDC provider · API keys · mTLS · magic links.
2. Trace one full request: where is identity established, where is it verified, where is it trusted without verification? That last one is the finding.
3. List every protected surface: routes, API endpoints, jobs, webhooks, admin screens, file downloads, GraphQL resolvers — and which of them re-check permission server-side.
4. Note the recovery flows: password reset, email change, MFA reset, account deletion. These are the paths attackers use; they're also the least reviewed.

## Phase 2: Authentication rules

**Sessions vs tokens** — pick by the actual constraint:

| | Server sessions (cookie) | JWT / stateless |
|---|---|---|
| Revocation | Immediate (delete the record) | Hard — needs a denylist or short TTL + refresh |
| Best for | Web apps, first-party clients | Service-to-service, multi-service APIs |
| Cost | A session store | Token verification only |

The honest default for a web app is a **server session in an httpOnly cookie**. A JWT you cannot revoke is a credential valid until it expires, including after a compromise.

**Cookies**: `httpOnly`, `Secure`, `SameSite=Lax` (or `Strict`; `None` only with a stated cross-site need), scoped `Path`, host-only unless subdomains genuinely need it. Never store a token in `localStorage` where any XSS reads it.

**Sessions**: regenerate the session id **on login and on privilege change** (session fixation); absolute + idle expiry; server-side invalidation on logout and on password change; a way for a user to see and revoke their sessions.

**Passwords**: Argon2id (or bcrypt cost ≥ 12 / scrypt) — never SHA-anything, never a homemade scheme. No maximum length below 64, no composition rules, do check against a breached-password list. Constant-time comparison. Never log or email a password.

**Reset & recovery**: single-use, expiring token (≤1h), hashed at rest, invalidated on use and on password change; **identical response whether or not the account exists**; rate-limited per account and per IP; a notification email to the account owner on every reset and email change. Email change requires confirming the *old* address too.

**MFA**: TOTP with a proper secret, replay protection on the last used code, one-time recovery codes stored hashed, and a documented reset path that isn't a support-desk bypass. Prefer WebAuthn/passkeys where the stack supports it.

**OAuth2/OIDC** (`--oauth`): authorization code **with PKCE**, `state` verified (CSRF), `nonce` verified (replay), exact redirect-URI allowlist, ID-token signature/issuer/audience/expiry validated against the provider's JWKS, tokens stored server-side. Account linking is explicit: never merge accounts on a matching email alone unless the provider asserts `email_verified` **and** the user confirms.

**Rate limiting & lockout**: per-account and per-IP throttling on login, reset, and MFA; exponential backoff; generic failure messages (no "user not found"); alert on credential-stuffing patterns.

## Phase 3: Authorization rules — where the real bugs are

1. **Every request re-checks**, server-side. A hidden button is not a permission. The UI decides what to *show*; the server decides what's *allowed*.
2. **Object-level checks (IDOR)**: every fetch by id verifies ownership/tenancy in the same query (`WHERE id = ? AND tenant_id = ?`), not after loading. This is the single most common exploitable bug in web apps — check every endpoint that accepts an id.
3. **Deny by default**: routes are protected unless explicitly public, and the list of public routes is short and reviewed. A new endpoint must not inherit access by accident.
4. **One authorization layer**, not scattered `if (user.role === 'admin')`. Centralize in a policy/ability layer that both the UI and the API consult (CASL, Pundit, Oso, a policy module) so the two can't disagree.
5. **RBAC vs ABAC** (`--rbac`): roles for coarse access, attributes/ownership for row-level. Model it explicitly: subject × action × resource → allow/deny, with the tenancy dimension if multi-tenant. Write the matrix down; it becomes the test suite.
6. **Privilege escalation paths**: mass assignment letting a user set their own `role`, an admin invite flow without a permission check, an impersonation feature with no audit trail, an internal endpoint reachable from the internet.
7. **Non-HTTP surfaces**: background jobs, webhooks, GraphQL field resolvers, file/download URLs, exports, and admin CLIs all need the same checks.
8. **Audit trail** for privileged actions: who, what, when, from where — append-only, and it never contains credentials.

## Phase 4: Tests that prove it

Auth without negative tests is untested. For every protected resource:

```
- anonymous → 401 (not 200, not a redirect that leaks data)
- authenticated but not owner → 404 or 403 (choose per whether existence may leak, and be consistent)
- owner → 200
- role without the permission → 403
- token/session expired → 401, and the refresh path behaves
- after logout / password change → previous session rejected
- MFA required but not satisfied → challenged, not bypassed
- id from another tenant → not found, at every endpoint that takes an id
```

Plus: the reset token is single-use; the same reset response for unknown accounts; login rate limiting engages; the OAuth callback rejects a wrong `state`.

## Phase 5: Report

```
## Auth Audit

Mechanism: <session cookie | JWT | OIDC>   Store: <where>   MFA: <yes/no>
Policy layer: <centralized | scattered>    Public routes: <n>

| # | Severity | Where | Issue | Exploit | Fix |
|---|----------|-------|-------|---------|-----|
| 1 | 🔴 | api/invoices/[id] | no tenancy check on fetch by id | any user reads any invoice by changing the id | filter by tenant in the query + test |

Coverage: authn ✓ · authz <n>/<n> endpoints re-check · negative tests <n>
```

🔴 = an unauthenticated or cross-tenant path to data or privilege. 🟡 = weakened control (long-lived unrevocable token, missing rate limit, weak reset flow). 🔵 = hygiene.

## Rules
- Never invent crypto, token formats, or password hashing; use the platform's vetted primitives.
- Never trust a client-supplied identity, role, or tenant id — derive them from the session server-side.
- Never return a different response for "no such user" vs "wrong password" on login, or on password reset.
- A permission check that exists only in the UI is a finding, always.
- Every fix ships with the negative test that would have caught the bug.
- Secrets, signing keys and provider credentials come from the environment, differ per environment, and are rotatable — the `redact` rule applies to every output here.
