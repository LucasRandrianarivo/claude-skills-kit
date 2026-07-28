---
description: Security audit of changed code — auth, validation, injection, data protection
argument-hint: "[files]"
---

# /security-review — Security Audit (Phase 4)

## Usage
```
/security-review              — review uncommitted changes
/security-review <file paths> — review specific files
/security-review --last       — review the last commit
/security-review --branch     — review all commits on current branch vs main
```

## Argument Parsing

Parse `$ARGUMENTS`:
- **No arguments**: run `git diff` + `git diff --cached` to get uncommitted changes
- **File paths**: review only those files (read each file in full)
- **`--last`**: run `git diff HEAD~1` to review the last commit
- **`--branch`**: run `git log main..HEAD --oneline` then `git diff main...HEAD`

If no changes are found, inform the user and exit.

---

## Review: Security

Perform a thorough security audit on every changed line:

| Check | What to look for |
|-------|-----------------|
| Authentication | Missing auth checks on protected routes/endpoints, bypassable auth logic |
| Authorization | Missing permission checks, privilege escalation paths, IDOR vulnerabilities |
| Input validation | Unvalidated/unsanitized user input reaching DB queries, file ops, or commands |
| SQL injection | Raw string concatenation in queries, missing parameterized queries |
| XSS | Unsanitized user input rendered in HTML/templates, missing output encoding |
| Command injection | User input reaching shell commands, `exec`, `eval`, or equivalent |
| Path traversal | User input in file paths without sanitization (`../../../etc/passwd`) |
| Data exposure | Sensitive data in logs, API responses, error messages, or stack traces |
| Secrets | Hardcoded API keys, passwords, tokens, connection strings in source code |
| CSRF | Missing CSRF tokens on state-changing endpoints |
| Dependency risks | Using known-vulnerable patterns, unsafe deserialization |
| Cryptography | Weak algorithms (MD5, SHA1 for passwords), missing encryption for sensitive data |
| Rate limiting | Missing rate limits on auth endpoints, expensive operations |
| File uploads | Missing type/size validation, storing uploads in executable directories |

---

## Output Format

```
## Security Review

| # | Severity | File | Line | Vulnerability | Risk | Remediation |
|---|----------|------|------|--------------|------|-------------|
| 1 | 🔴 | path/to/file.ext | 42 | SQL injection via `userId` param | Data breach, unauthorized access | Use parameterized query |
| 2 | 🔴 | path/to/file.ext | 87 | Hardcoded DB password | Credential exposure | Move to environment variable |
| 3 | 🟡 | path/to/file.ext | 15 | Missing rate limit on login | Brute force attacks | Add rate limiter middleware |
| 4 | 🔵 | path/to/file.ext | 33 | Error exposes stack trace | Information disclosure | Use generic error in production |

**Severity legend:**
- 🔴 Critical — exploitable vulnerability, must fix before merge
- 🟡 Warning — potential vulnerability, should fix
- 🔵 Suggestion — defense-in-depth improvement

Score: X/10

Actions Required:
- 🔴 BLOCK MERGE: <critical vulnerabilities>
- 🟡 FIX BEFORE DEPLOY: <warning items>
- 🔵 Consider: <suggestions>
```

**Scoring guide:**
- 10: No security issues found
- 8-9: Only 🔵 hardening suggestions
- 6-7: Some 🟡 potential vulnerabilities
- 4-5: Has 🔴 exploitable issues
- 1-3: Multiple critical vulnerabilities — do NOT merge

For 🔴 findings, include a concrete code fix or remediation pattern, not just a description.
