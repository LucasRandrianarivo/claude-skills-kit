# Field notes — HTTP, caching, CDN, cookies

Consulted by `/nginx`, `/cache`, `/web-vitals`, `/api-design`, `/seo`, `/integrate`.

---

## Cache-Control, decoded

| Directive | Meaning in practice |
|---|---|
| `max-age=N` | Fresh for N seconds in **any** cache (browser + shared) |
| `s-maxage=N` | Overrides `max-age` for shared caches (CDN) only |
| `public` | May be stored by a shared cache even if the request had `Authorization` |
| `private` | Browser only. **Required** for anything user-specific |
| `no-cache` | Store it, but revalidate before every use (not "don't cache") |
| `no-store` | Never write it anywhere. For secrets and personal data |
| `must-revalidate` | Once stale, never serve without revalidating |
| `immutable` | Never revalidate while fresh — for content-hashed assets |
| `stale-while-revalidate=N` | Serve stale up to N seconds while refreshing in the background |

The two-line policy that covers most sites: **content-hashed assets** → `public, max-age=31536000, immutable`; **HTML** → `no-cache` (or a short `s-maxage` + `stale-while-revalidate`). Getting these backwards ships a stale application shell that points at deleted asset URLs — a white screen that only clears when the user hard-refreshes.

**The dangerous one**: a personalized response cached publicly. Any response that varies by session must be `private` (or `no-store`) **and** must not be cacheable by the CDN. Verify with an anonymous request after an authenticated one.

## Validators and `Vary`

- `ETag` (strong) + `If-None-Match` → 304 with no body. Cheap for large, rarely-changing responses.
- `Last-Modified` + `If-Modified-Since` has 1-second granularity — fine for files, wrong for fast-changing resources.
- `Vary: Accept-Encoding` always; `Vary: Accept-Language` / `Cookie` when the response really differs. **`Vary: Cookie` on an HTML page usually means it can't be shared-cached at all** — that's the honest outcome, not a reason to omit the header.
- A CDN that ignores `Vary` (some do, on some headers) will serve the wrong variant. Verify with the real CDN, not with curl against the origin.

## Status codes that carry meaning

- `201` + `Location` for creation; `202` when the work is queued (and give a status URL).
- `204` for a successful delete with no body.
- `304` only in response to a conditional request.
- `401` = not authenticated (with `WWW-Authenticate`); `403` = authenticated but not allowed. Using 403 for both makes clients unable to trigger a re-login.
- `404` vs `403` for "exists but not yours": choose per whether existence is sensitive, then be consistent — inconsistency is itself an enumeration oracle.
- `409` for a state conflict, `422` for semantically invalid content, `429` with `Retry-After`.
- `5xx` means *we* failed: never return 200 with `{"error": …}` — every intermediary, monitor and retry policy reads the status line first.

## Cookies

`Secure` (HTTPS only), `HttpOnly` (invisible to JS), `SameSite`: `Lax` is the sane default (sent on top-level navigations), `Strict` breaks inbound links from other sites, `None` requires `Secure` and enables cross-site sending — only with a stated reason. Scope with `Domain`/`Path` deliberately: a cookie on `.example.com` is readable by every subdomain, including one you don't control. Prefer the `__Host-` prefix for session cookies. Size counts against every request on that host.

## CORS, without the folklore

CORS is a **browser** restriction, not a server security mechanism — it doesn't protect an API from curl. It protects users from *other sites* reading responses. Consequences: never reflect an arbitrary `Origin` with `Access-Control-Allow-Credentials: true`; allowlist origins explicitly. A failing preflight (`OPTIONS`) is usually a missing `Access-Control-Allow-Headers` for a custom header. And a CORS error in the console frequently means the request 500'd — the error page has no CORS headers, so the browser reports CORS instead of the real failure.

## Compression, protocols, connections

- Brotli for text at rest/at the CDN; gzip as fallback. Never compress already-compressed formats (images, video, zip).
- **Don't compress responses that mix secrets and attacker-controlled input** over the same channel (the BREACH class of attack) — a CSRF token in a compressed HTML page with a reflected parameter is the textbook case.
- HTTP/2 and /3 remove the per-origin connection limit, so domain sharding is now a pessimization; each extra origin costs a connection setup instead.
- `Connection: keep-alive` and upstream keepalive pools matter more than most micro-optimizations: a new TCP+TLS handshake per request adds RTTs to every call.
- Streaming (`Transfer-Encoding: chunked`, SSE) requires proxy buffering **off** for that route — otherwise the proxy holds the whole response and streaming silently becomes batching.

## CDN behavior worth knowing

- The cache key is host + path + (configured) query params and headers. An analytics query parameter you didn't strip fragments your cache into thousands of copies.
- `s-maxage` + `stale-while-revalidate` + `stale-if-error` turns the CDN into an availability layer: it serves the last good response while the origin is down.
- Purge is eventually consistent, per POP. Design for "the old one may be served for a bit" rather than assuming an instant global purge.
- Origin shield / tiered caching prevents a cold-cache stampede from hitting the origin from every POP at once.

## Verification

```
curl -sSI https://host/path                 # status, cache-control, vary, headers
curl -sS -H 'If-None-Match: "<etag>"' -o /dev/null -w '%{http_code}\n' <url>   # 304?
curl -sSI <asset-url> | grep -i cache       # immutable on hashed assets?
curl -sSI <page-url> -H 'Cookie: session=x' # personalized response not public?
```
Check the response **through the CDN**, not only against the origin — they disagree, and the CDN is what users get.

## Where to check the current truth
Header semantics are specified; CDN behavior is vendor-specific and drifts. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- RFC 9110 (semantics) and RFC 9111 (caching) — https://httpwg.org/specs/
- MDN HTTP headers — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
- Your CDN's caching documentation — the cache key and `Vary` handling differ by vendor
- web.dev caching — https://web.dev/articles/http-cache
