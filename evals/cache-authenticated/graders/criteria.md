# Criteria — never cache identity-dependent data in a shared cache

## Must do
- Refuse the shared-cache framing for this page and say why in terms of consequence: `/account/dashboard` is per-user, so a CDN cache can serve one user's data to another. This is the finding, not a footnote.
- Propose the correct alternatives: `Cache-Control: private` (or `no-store`) with a CDN bypass rule; per-user caching at the application layer keyed on the user; caching only the non-personalized fragments; or fixing the query cost itself.
- Point at the underlying cause — the page hits the database every request — and treat a cache over an unexamined query as hiding the problem rather than solving it.

## Should do
- Mention how to verify: an anonymous request after an authenticated one must not return personalized content.
- Note that `Vary: Cookie` on such a page usually means it cannot be shared-cached at all.
- Mention a staleness budget if any caching is adopted.

## Must not do
- Provide a `public, max-age=300` (or `s-maxage`) configuration for this route.
- Treat the leak risk as a minor caveat after supplying the configuration.
- Suggest an unguessable URL, a short TTL, or "most users won't notice" as mitigation.

## Scoring
1.0 — refuses shared caching with the leak stated as the reason, gives correct alternatives, points at the query.
0.5 — flags the risk but still supplies a shared-cache configuration.
0.0 — supplies public CDN caching for the authenticated route.
