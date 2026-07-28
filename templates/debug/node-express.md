---
description: Structured 4-phase debugging for Node/Express backends — no fix without root cause
argument-hint: "<bug description>"
---

# /debug — Structured Debugging (Node.js Express/Fastify)

## Usage
```
/debug <bug description or error message>
```

## Iron Rule
**Never apply a fix without first identifying the root cause.** A fix without a diagnosis is a new bug waiting to happen.

---

## Phase 1: Reproduce

Goal: See the bug with your own eyes. No assumptions.

1. Parse `$ARGUMENTS` for the bug description, error message, or affected endpoint
2. Identify the affected route — find it in the router/controller files
3. Reproduce:
   - Run the server: `npm run dev` (or `npm start`, check `package.json`)
   - Hit the endpoint with `curl`, Postman, or the project's test suite
   - Check: server logs (stdout/stderr), response status code, response body
4. Capture the exact error: message, stack trace, request/response details
5. If not reproducible, ask the user for exact request details (method, headers, body, auth)

Output:
```
Bug: <description>
Endpoint: <METHOD /path>
Error: <exact error message or unexpected response>
Reproduced: yes/no
```

## Phase 2: Locate

Goal: Trace the request flow to find where it breaks.

**Express/Fastify request flow:**
```
Route → Middleware (auth, validation, parsing) → Controller → Service → Repository → Database
```

Trace step by step:
1. **Route definition** — Is the route registered? Correct method, path, middleware order?
2. **Middleware** — Does auth middleware reject? Does body parser run before validation? Log `req.body` after each middleware
3. **Controller** — Does it receive the expected data? Check request destructuring
4. **Service** — Business logic. Log inputs and outputs. Check error handling
5. **Repository/DB** — Check query, parameters, connection. Log the raw query if possible
6. **Response** — Is the response formatted correctly? Status code? Headers?

**Narrow down**: Add `console.log` at each layer boundary. Check what goes in vs what comes out.

Output:
```
Root cause: <what is actually wrong and why>
Location: <file>:<line>
Evidence: <what you observed that confirms this>
```

## Phase 3: Fix

Goal: Minimal, targeted fix that addresses the root cause.

1. Confirm the root cause from Phase 2 — if uncertain, go back
2. Write the fix:
   - Change only what is necessary
   - Do not refactor unrelated code
   - Preserve existing conventions (read neighboring files)
3. Verify the fix:
   - Restart the server (or rely on nodemon/tsx --watch)
   - Re-send the request that triggered the bug
   - Confirm correct response status and body
   - Test edge cases: empty body, missing auth, invalid params
4. Run the project's test suite if available

**Rules:**
- One fix per bug. If you discover a second bug, note it but fix separately
- Never suppress errors (empty `catch {}`, swallowing exceptions)
- If the fix requires a dependency update, flag it to the user first

## Phase 4: Report

```
## Debug Report

**Bug**: <description>
**Root cause**: <explanation>
**Location**: <file(s)>

**Fix applied**:
- <file>: <what changed and why>

**Verification**:
- [ ] Error no longer occurs
- [ ] Related endpoints still work
- [ ] Tests pass (or N/A)
- [ ] No new errors in server logs

**Regression risk**: low / medium / high — <why>
```

---

## Common Node.js Express/Fastify Bugs

| Symptom | Likely cause |
|---------|-------------|
| Unhandled promise rejection / crash | Async route handler without `try/catch` or missing `express-async-errors`. Express does not catch async errors by default |
| Middleware order bug | `app.use()` order matters. Auth must come before route, body parser must come before validation, error handler must be last |
| `req.body` is undefined | Missing `express.json()` or `express.urlencoded()` middleware. Or wrong `Content-Type` header |
| 404 on existing route | Route registered after a catch-all, or router not mounted with `app.use()`. Check registration order |
| Database connection timeout | Connection pool exhausted (connections not released), wrong credentials, or DB server unreachable. Check pool config |
| Validation mismatch | Schema expects different shape than client sends. Compare Joi/Zod schema with actual request body |
| CORS errors | `cors()` middleware missing or misconfigured. Check `origin`, `methods`, `credentials` options |
| Memory leak | Event listeners not cleaned up, unbounded array/cache growth, streams not closed. Use `--inspect` to profile |
| `res.json()` after `res.send()` | Response sent twice — headers already sent error. Check conditional logic and early returns |
| Environment variable undefined | `.env` file not loaded (missing `dotenv.config()`), or var not set in deployment environment |
| Slow endpoint | N+1 queries, missing DB index, synchronous blocking operation, large payload without pagination |
