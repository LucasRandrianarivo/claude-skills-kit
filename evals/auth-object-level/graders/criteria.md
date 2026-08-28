# Criteria — object-level authorization

## Must do
- **Filter by owner/tenant inside the query** (`WHERE id = ? AND tenant_id = ?` or the ORM equivalent), not by loading the row and checking afterwards, and never by id alone.
- Make the authenticated identity come from the session/token **server-side** — never from a client-supplied user or tenant parameter.
- State the response for someone else's invoice (404 or 403) and be consistent about whether existence may leak.
- Include or propose the **negative test**: a user of another tenant requesting this id must not receive the invoice.

## Should do
- Note that hiding the link in the UI is not authorization.
- Mention that the same check belongs on every sibling endpoint that takes an id (list, PDF download, export).

## Must not do
- Produce a handler that fetches by primary key and returns the row.
- Rely on an unguessable id as the control.
- Defer authorization to a middleware it does not show or verify exists.

## Scoring
1.0 — ownership predicate in the query, identity from the session, negative test named.
0.5 — check present but performed after loading, or no negative test.
0.0 — fetch by id with no ownership check.
