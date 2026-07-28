# Rule: Redact — Secret & Sensitive Data Protection

## Status: Always Active

This rule is always in effect. It cannot be disabled.

Before content leaves your hands, scan it for secrets. "Leaves your hands" means any of:

1. **Writing or editing any file** (source, config, docs, reports)
2. **Committing** — scan the staged diff before `git commit`
3. **Posting to a PR, issue, or comment** (e.g. via `gh`)
4. **Pasting command output** into a report, summary, or chat response

On a match: never reproduce the secret. Replace it with `<REDACTED:type>` and warn the user.

---

## Tiers

| Tier | Meaning | Behavior |
|------|---------|----------|
| HIGH | Genuinely-secret credential | Always redact. No discussion. |
| MEDIUM | Sensitive or credential-shaped, but false-positive-prone | Redact by default; if redaction breaks what the user asked for, ask before including |
| LOW | Hygiene issue, not a secret | Leave content, flag it in a note |

## HIGH — credentials (always redact)

| Type | What it matches | Detection pattern |
|------|-----------------|-------------------|
| `aws-access-key` | AWS access key ID | `AKIA[0-9A-Z]{16}` |
| `aws-secret-key` | AWS secret access key | `[A-Za-z0-9/+=]{40}` with `aws_secret_access_key` within ~100 chars |
| `github-pat` | GitHub PAT (classic) | `ghp_[A-Za-z0-9]{36}` |
| `github-oauth` | GitHub OAuth token | `gho_[A-Za-z0-9]{36}` |
| `github-server` | GitHub server-to-server token | `ghs_[A-Za-z0-9]{36}` |
| `github-fine-grained` | GitHub fine-grained PAT | `github_pat_[A-Za-z0-9_]{82}` |
| `gitlab-token` | GitLab personal/trigger/deploy token | `gl(pat\|ptt\|dt)-[A-Za-z0-9_-]{20,}` |
| `huggingface-token` | HuggingFace token | `hf_[A-Za-z0-9]{30,}` |
| `npm-token` | npm access token | `npm_[A-Za-z0-9]{36}` |
| `digitalocean-token` | DigitalOcean PAT | `dop_v1_[a-f0-9]{64}` |
| `gcp-service-account` | GCP service-account JSON key | `"private_key": "-----BEGIN … PRIVATE KEY-----` with `"private_key_id"` within ~300 chars |
| `anthropic-key` | Anthropic API key | `sk-ant-[A-Za-z0-9_-]{20,}` |
| `openai-key` | OpenAI API key | `sk-(proj\|svcacct\|admin)-[A-Za-z0-9_-]{20,}` or bare `sk-[A-Za-z0-9]{32,}` |
| `sendgrid-key` | SendGrid API key | `SG.[A-Za-z0-9_-]{22}.[A-Za-z0-9_-]{43}` |
| `stripe-secret` | Stripe live secret key | `sk_live_[A-Za-z0-9]{24,}` |
| `slack-token` | Slack bot/user/app token | `xox[baprs]-[A-Za-z0-9-]{10,}` |
| `slack-webhook` | Slack incoming webhook URL | `https://hooks.slack.com/services/T…/B…/` + 24 chars |
| `discord-webhook` | Discord webhook URL | `discord(app).com/api/webhooks/<17-20 digits>/<60+ chars>` |
| `twilio-auth-token` | Twilio auth token | 32 hex chars with an `AC` + 32-hex Account SID within ~200 chars |
| `private-key` | PEM private key block | `-----BEGIN (RSA\|EC\|DSA\|OPENSSH\|PGP\|ENCRYPTED )?PRIVATE KEY-----` |
| `db-url` | Connection string with embedded password | `(postgres(ql)\|mysql\|mongodb(+srv)\|redis\|amqp)://user:password@host` — real password only (see validators) |
| `basic-auth-url` | HTTP(S) URL with embedded credentials | `https?://user:password@host` — real password only |

## MEDIUM — sensitive / credential-shaped (redact by default, confirm)

| Type | What it matches | Detection pattern |
|------|-----------------|-------------------|
| `stripe-publishable` | Stripe live publishable key (often intentionally public) | `pk_live_[A-Za-z0-9]{24,}` |
| `google-api-key` | Google API key (sometimes a public client key) | `AIza[0-9A-Za-z_-]{35}` |
| `jwt` | JSON Web Token | `eyJ…` `.` `eyJ…` `.` `sig` (3 base64url segments) |
| `env-secret` | Env-style secret assignment | `NAME(KEY\|TOKEN\|SECRET\|PASSWORD\|PASSWD\|CREDENTIALS\|DSN\|AUTH\|COOKIE\|SESSION\|PRIVATE)=value`, value ≥ 8 chars and high-entropy |
| `bearer-token` | Authorization Bearer token | `Bearer ` + 20+ chars, `authorization` within ~80 chars, high-entropy |
| `email` | Email address | standard email shape |
| `phone` | Phone number (E.164 / national) | ≥ 10 digits after stripping separators |
| `ssn` | US Social Security Number | `\d{3}-\d{2}-\d{4}`, excluding 000/666/9xx area forms |
| `credit-card` | Payment card number | 13–19 digits (spaces/dashes ok), Luhn-valid only |
| `public-ip` | Public IPv4 address | dotted quad that is NOT private/loopback/link-local/CGNAT |
| `wallet` | Crypto wallet address (ETH/BTC) | `0x` + 40 hex, `bc1…`, or base58 `1…`/`3…` shapes |
| `internal-hostname` | Internal hostname | `*.internal` / `.corp` / `.local` / `.lan` / `.prod` / `.staging` |
| `localhost-url` | localhost URL with a non-trivial path | `http(s)://localhost:port/…` |
| `nda-marker` | Confidentiality marker | `CONFIDENTIAL`, `UNDER NDA`, `ATTORNEY-CLIENT`, `PRIVILEGED`, `DO NOT DISTRIBUTE`, `EYES ONLY` |
| `named-criticism` | Negative judgment about a named person | words like incompetent/negligent/fraudulent/fired/terminated near a Capitalized Full Name |

## LOW — surface only (flag, don't redact)

| Type | What it matches |
|------|-----------------|
| `user-path` | Absolute path under a home dir (`/Users/<name>/…`, `/home/<name>/…`) |
| `todo-owner` | `TODO(owner)` marker carried into a shipped artifact |

---

## Validators — cutting false positives

Apply these AFTER a pattern matches; all must pass for the match to count:

| Validator | Applies to | Rule |
|-----------|-----------|------|
| Placeholder suppression | all | The matched span itself is a placeholder → not a finding: starts with `your-`/`your_`, is `<…>`, all-`*`, `xxxxxx…`, or contains example/changeme/redacted/placeholder/dummy/fake/test-key. Judge the span, not the surrounding line |
| Variable reference | env, URLs, bearer | `$VAR`, `${VAR}` values are not secrets |
| High entropy | `env-secret`, `bearer-token` | Value must look random (mixed character classes, no dictionary word); `FOO_KEY=changeme` never fires |
| Luhn checksum | `credit-card` | Digits must pass Luhn |
| Public IP | `public-ip` | Exclude 10/8, 127/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10, 224+ |
| Proximity anchor | `aws-secret-key`, `twilio-auth-token`, `gcp-service-account`, `bearer-token` | The anchor pattern must appear within the stated window, otherwise a bare hex/base64 run is not a finding |

## Behavior on Detection

1. **STOP** — do not write, commit, or post the content as-is
2. **Replace** each secret span with `<REDACTED:type>`, e.g. `<REDACTED:github-pat>`
3. **WARN** the user:
   ```
   REDACTED: found <type> in <destination>.
   The secret was not written. If it is a live credential that has already
   been exposed (committed, pasted, logged), rotate it.
   ```
4. **Tier behavior**: HIGH — redact unconditionally. MEDIUM — redact by default; if the redaction defeats the purpose of the task (e.g. the user asked for their own email in a contact page), ask. LOW — keep the content, add a note.

## Env Files

- **Never `cat` a `.env` file (or `.env.*`) into a report, PR, issue, or chat response.** To discuss its contents, list keys only: `sed -E 's/=.*//' .env`
- Never copy values out of `.env` into other files, examples, or docs — reference the variable name instead
- Before `git add`/`git commit`, verify `.env` files are gitignored; warn if one is staged
- Writing a secret INTO a local, gitignored `.env` at the user's request is fine — that is its intended store. Warn if the target file is tracked by git

**Iron rule: a secret that appears in tool output must never be repeated in your response, a file, or a commit — summarize around it.**
