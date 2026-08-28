---
description: File uploads & media — presigned direct upload, validation, storage layout, image/video pipeline, CDN delivery, lifecycle
argument-hint: "[--build] [--audit] [--images] [--private]"
---

# /files — Uploads, Storage & Media

## Usage
```
/files --build avatar upload    — implement an upload flow
/files --audit                  — audit existing upload/storage/delivery
/files --images                 — the image pipeline (resize, format, CDN)
/files --private                — access-controlled files (signed URLs, expiry)
```
Field notes: `.claude/references/security.md`, `.claude/references/http.md`.

## Overview
Uploads are a security surface disguised as a feature. The three failures: files proxied through the app (memory blown, requests timing out), validation done on what the client claims rather than what the bytes are, and "private" files served from a public bucket with an unguessable name — which is not access control, it's obscurity plus a URL in someone's browser history.

---

## Phase 1: The upload path

**Direct to storage with a presigned URL** is the default: the app issues a short-lived, constrained upload URL; the browser/app uploads straight to S3/GCS/R2/Azure; the app is told when it's done. The application never streams file bytes, so memory and timeouts stop being a concern.

The constraints go **in the presigned policy**, because that's the only place the client can't change them: max content-length, allowed content-type, key prefix (never client-controlled), and a short expiry. Then:

1. **Authorize before issuing** the URL — who may upload, where, and how much (quota).
2. **Record the intent** in your database (pending upload, owner, purpose) before the URL is issued, so an orphan file can be reconciled later.
3. **Confirm server-side**: on the completion callback (or a storage event), verify the object exists, its real size, and its real type — never trust the client's "done, it was a PNG".
4. Multipart/resumable for large files; a mobile upload will be interrupted.

## Phase 2: Validation — on bytes, not on claims

- **Type by content**, via magic bytes / a sniffing library — never by extension or by the `Content-Type` header, both of which the client controls.
- **Allowlist** the types you accept. A denylist is always incomplete.
- **Rename**: generate the stored key yourself (uuid/hash + a validated extension). Never use the client's filename in a path — that's path traversal (`../../`), null bytes, unicode homoglyphs, and Windows reserved names, all at once. Keep the original name as *metadata* for downloads.
- **Size limits** enforced in the presigned policy *and* checked after.
- **Images**: re-encode rather than trusting (strips embedded payloads and, usefully, EXIF/GPS). Cap dimensions before decoding — a 60000×60000 PNG is a memory bomb ("decompression bomb"), and a "small" file can decode to gigabytes.
- **SVG is executable**: it can carry scripts. Sanitize it, or serve it with `Content-Type: image/svg+xml` from a **separate origin** with `Content-Security-Policy` and `Content-Disposition: attachment`.
- **Archives**: zip bombs and path traversal in entry names ("zip slip"). Validate entry paths and expanded size before extracting.
- **Malware scanning** where users share files with each other — the risk isn't your server, it's the next person who downloads it.
- Office documents and PDFs carry macros/JS: never render them inline from your main origin.

## Phase 3: Storage layout & lifecycle

- Keys that scale and stay debuggable: `tenant/<id>/<entity>/<uuid>.<ext>`, with the date in the prefix for high-volume buckets.
- **Buckets are private by default.** Public buckets are for genuinely public assets only, and that decision is explicit.
- Versioning on for anything a user can overwrite; lifecycle rules to expire temporary uploads and to move cold objects to cheaper storage.
- **Orphans in both directions**: a database row without an object (upload failed) and an object without a row (upload succeeded, request died). A periodic reconciliation job is the only thing that keeps them in check — plus deletion of the object when the row is deleted (`/rgpd` requires this to actually work).
- Backups: object storage durability is not a backup — it won't save you from your own delete. Decide and state the policy.

## Phase 4: Delivery

- **Public assets**: CDN, long `max-age` + `immutable` with content-hashed keys (`references/http.md`).
- **Private files**: a short-lived signed URL generated per request **after** an authorization check, or a proxy endpoint that checks then streams (simpler, but it costs your bandwidth and a worker). Never "unguessable URL" as the control — URLs leak through referrers, logs, chat, and screenshots.
- Set `Content-Disposition: attachment` for anything user-supplied you're not deliberately rendering, and serve user content from a **separate domain** so a stored XSS can't reach your session cookies.
- Range requests for media so seeking works.

## Phase 5: The image/video pipeline (`--images`)

Derivatives generated **asynchronously** (`/jobs`), never in the request: resize to the sizes the UI actually uses, convert to AVIF/WebP with a fallback, strip metadata, and cache by a key that includes the transformation. Serve with `srcset`/`sizes` so a phone doesn't download a 2400px hero (`/web-vitals`). Video needs transcoding and HLS/DASH — use a service unless video is your product. Always store the original: derivative recipes change.

## Phase 6: Report

```
## Files Audit
Upload: <presigned direct | proxied>   Max size: <n>   Types: <allowlist>
Validation: magic bytes ✓ · re-encode images ✓ · dimension cap ✓ · filename regenerated ✓
Storage: private buckets ✓ · lifecycle rules ✓ · orphan reconciliation <job>
Delivery: <signed URLs, ttl> · separate origin for user content ✓ · CDN ✓
| # | Severity | Issue | Exploit/consequence | Fix |
| 1 | 🔴 | private docs in a public bucket, random keys | any leaked URL is permanent access | private bucket + signed URLs with expiry |
```

## Rules
- Never trust the extension, the `Content-Type`, or the client's filename.
- Never proxy large files through the application when presigned direct upload is available.
- "Unguessable URL" is not access control.
- Re-encode images and cap dimensions before decoding; treat SVG as code.
- User-uploaded content is served from a separate origin, with `Content-Disposition` where it isn't deliberately rendered.
- Deleting a record must delete its objects — verify it, because compliance depends on it.
