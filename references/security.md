# Field notes — Application security

Consulted by `/security-review`, `/cso`, `/auth`, `specialist-security`, `specialist-red-team`, `/rgpd`.
Defensive use: find and fix. Nothing here is for attacking systems you don't own.

---

## The mental model

Almost every real breach in a web application is one of four failures:
1. **Broken access control** — the request was allowed to touch data it shouldn't (this is #1 in practice, by a wide margin).
2. **Injection** — data was interpreted as code/query/markup by some interpreter.
3. **Secrets exposure** — a credential in a repo, a bundle, a log, or an image layer.
4. **Trust of the wrong party** — a client-supplied value, a webhook payload, an LLM output, or a dependency, believed without verification.

Ask of every change: *who supplies this value, and what interprets it?*

## Access control — the bugs that actually happen

| Bug | Looks like | Fix |
|---|---|---|
| **IDOR** | `GET /invoices/:id` loads by id, then renders | Filter by owner/tenant **in the query**: `WHERE id = ? AND tenant_id = ?` |
| Client-side-only authorization | The admin button is hidden | Re-check server-side on every action; a hidden control is not a permission |
| Mass assignment | `User.update(req.body)` | Explicit allowlist of updatable fields; never bind `role`, `tenant_id`, `is_admin` |
| Missing function-level check | A new endpoint copied from a public one | Deny by default; the public route list is explicit and short |
| Enumeration | 404 vs 403 differ for existing objects | Return the same status for "not yours" and "doesn't exist" where existence is sensitive |
| Privilege escalation via workflow | Invite/impersonate/export paths | Same permission model, audited, with an explicit re-auth for sensitive actions |
| Non-HTTP surfaces | Jobs, GraphQL resolvers, webhooks, file URLs, exports | Same checks; signed, expiring URLs for files |

The test that finds these: for each endpoint, run it as *another tenant's user* and assert it fails. Most codebases have never run that test.

## Injection, by interpreter

- **SQL** — parameterize. Always. Not "escape". ORMs are safe until `raw()`/string interpolation appears; grep for it. Dynamic column/table names can't be parameterized — allowlist them.
- **Shell** — never build a command string; pass an argument array. No `shell: true` with interpolation.
- **HTML/XSS** — the framework escapes by default; the holes are `dangerouslySetInnerHTML`, `v-html`, `innerHTML`, `.html_safe`, and Markdown renderers with raw HTML enabled. Sanitize with a maintained library (DOMPurify), server-side where possible, and set a CSP so a miss isn't fatal.
- **NoSQL** — an object where a string was expected (`{"$ne": null}`) turns a filter into a bypass; validate types before querying.
- **Template injection** — user input into a template *string* (not a variable) executes.
- **Path traversal** — `../` in any user-controlled path segment; resolve and verify the result stays under the intended root.
- **SSRF** — any URL supplied by a user (or by an LLM, or by a webhook) that your server fetches: allowlist hosts, resolve DNS and reject private/link-local ranges, disable redirects or re-validate each hop. Cloud metadata endpoints are the classic target.
- **Deserialization** — never deserialize untrusted data into arbitrary types (pickle, Java serialization, YAML `load` vs `safe_load`).

## Auth & session traps

- Session id not regenerated at login → session fixation.
- JWT in `localStorage` → any XSS is a full account takeover. httpOnly cookie + `SameSite` is the boring correct answer.
- JWT verified with `algorithm: none`, or with the public key used as an HMAC secret — pin the algorithm explicitly.
- Refresh tokens that never rotate, or rotate without detecting reuse.
- Password reset tokens that are long-lived, reusable, or leak via the `Referer` header of an analytics script on the reset page.
- Timing differences that reveal whether an account exists (login, reset, registration).
- MFA that can be reset by the same channel it protects.
- OAuth: missing `state` (CSRF), missing PKCE, loose `redirect_uri` matching, ID token accepted without validating signature/issuer/audience/expiry.

## Secrets & supply chain

- A secret in git is public from the moment it's pushed: **rotate first**, clean history second — rewriting does not un-publish.
- `NEXT_PUBLIC_` / `VITE_` / `EXPO_PUBLIC_` prefixes ship to every user. Grep the built bundle for known secret fragments before release.
- Secrets in image layers survive `rm` in a later layer; use build secrets or runtime injection.
- Dependencies: lockfile committed, `npm audit`/`pip-audit`/`govulncheck` in CI, install scripts reviewed for new dependencies, and pinned actions/images by digest. Typosquats and compromised maintainer releases are the realistic vector — a dependency added by an assistant or a junior PR deserves the same scrutiny as code.

## Headers & transport (the cheap wins)

`Content-Security-Policy` (start report-only, kill `unsafe-inline` via nonces), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors`, `Permissions-Policy`, cookies `httpOnly; Secure; SameSite=Lax`. CORS: never reflect an arbitrary `Origin` with `credentials: true` — that's an open door with a lock painted on it.

## Rate limiting & abuse

Limit by account **and** by IP; the expensive endpoints (login, reset, search, export, anything calling a paid API) need it most. Account lockout without a per-IP limit is a denial-of-service tool against your own users; a per-IP limit alone is defeated by a botnet. Alert on the pattern, don't just block.

## LLM-specific (new class, same principles)

Prompt injection is untrusted input reaching an interpreter that also has your privileges. Treat model output as user input: never `eval` it, never fetch its URLs without an allowlist, never let it call a privileged tool without a policy check on the *action*, not on the prompt. Content retrieved by the model (a web page, a document, a PR comment) can carry instructions — isolate it, and never let it escalate what the session may do.

## Verification, not vibes

- Reproduce the finding: an unauthenticated `curl` returning the data is the proof; reading code is a hypothesis.
- Every fix ships with the negative test.
- Report severity by exploitability × impact, and name the concrete attacker path — "this is insecure" is not a finding.
