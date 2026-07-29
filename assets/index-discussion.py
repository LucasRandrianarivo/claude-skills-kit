#!/usr/bin/env python3
"""Hook PostCompact : archive le résumé de compaction et l'indexe dans le RAG.

Lit le JSON du hook sur stdin, extrait le résumé (plusieurs noms de champs
possibles selon les versions), le redacte, l'archive dans ~/.claude/discussions/
et l'upsert dans la collection Chroma `discussions` (localhost:8765).
Conçu pour être async : ne bloque jamais la session, échoue en silence dans un log.
"""
import sys, json, os, re, datetime, hashlib, traceback

HOME = os.path.expanduser("~")
ARCHIVE_DIR = os.path.join(HOME, ".claude", "discussions")
LOG = os.path.join(ARCHIVE_DIR, ".indexer.log")

SECRET_PATTERNS = [
    re.compile(r'(?i)((?:password|passwd|pwd|secret|token|api[_-]?key|apikey|client[_-]?secret|private[_-]?key|access[_-]?key|authorization|bearer|credential|mot de passe)\s*["\']?\s*[:=]\s*["\']?)([^\s"\',;]{4,})'),
    re.compile(r'(?i)(bearer\s+)([A-Za-z0-9._\-]{16,})'),
    re.compile(r'(://[^/\s:]+:)([^@\s]{3,})(@)'),
    re.compile(r'\b(SG\.[A-Za-z0-9._\-]{20,})\b'),
    re.compile(r'\b(gh[pousr]_[A-Za-z0-9]{20,})\b'),
    re.compile(r'\b(sk-[A-Za-z0-9\-_]{20,})\b'),
    re.compile(r'\b([A-Fa-f0-9]{40,})\b'),
]

def redact(t):
    for p in SECRET_PATTERNS:
        t = p.sub(lambda m: (m.group(1) + '<REDACTED>' + m.group(3)) if len(m.groups()) == 3
                  else ((m.group(1) + '<REDACTED>') if len(m.groups()) == 2 else '<REDACTED>'), t)
    return t

def chunks(text, lo=400, hi=1500):
    paras, buf, out = text.split("\n\n"), "", []
    for p in paras:
        if len(buf) + len(p) > hi and len(buf) >= lo:
            out.append(buf.strip()); buf = p
        else:
            buf += ("\n\n" if buf else "") + p
    if buf.strip():
        out.append(buf.strip())
    return [c for c in out if len(c) > 80]

def main():
    raw = sys.stdin.read()
    data = json.loads(raw) if raw.strip() else {}
    # le nom du champ varie ; on essaie large, sinon on garde le JSON brut
    summary = None
    for k in ("summary", "compact_summary", "compactSummary", "message", "content"):
        v = data.get(k)
        if isinstance(v, str) and len(v) > 200:
            summary = v
            break
    if not summary:
        hso = data.get("hookSpecificOutput") or {}
        v = hso.get("summary")
        if isinstance(v, str) and len(v) > 200:
            summary = v
    if not summary:
        # rien d'exploitable (résumé trop court ou champ inconnu) : tracer et sortir
        os.makedirs(ARCHIVE_DIR, exist_ok=True)
        with open(LOG, "a") as f:
            f.write(f"{datetime.datetime.now().isoformat()} champs reçus: {sorted(data.keys())} — pas de résumé exploitable\n")
        return

    summary = redact(summary)
    now = datetime.datetime.now()
    session = (data.get("session_id") or "unknown")[:8]
    cwd = data.get("cwd") or os.getcwd()
    project = os.path.basename(cwd.rstrip("/")) or "unknown"
    slug = f"{now:%Y-%m-%d-%H%M}-{project}-{session}"

    os.makedirs(ARCHIVE_DIR, exist_ok=True)
    archive = os.path.join(ARCHIVE_DIR, slug + ".md")
    with open(archive, "w") as f:
        f.write(f"# Compaction {now:%Y-%m-%d %H:%M} — {project} (session {session})\n\n{summary}\n")

    import chromadb  # import tardif : ~2 s, on est en async
    col = chromadb.HttpClient(host="localhost", port=int(os.environ.get("CLAUDE_RAG_PORT", "8765"))).get_or_create_collection("discussions")
    cs = [f"[Discussion {project} {now:%Y-%m-%d}]\n{c}" for c in chunks(summary)]
    digest = hashlib.sha1(summary.encode()).hexdigest()[:10]
    col.upsert(
        ids=[f"{slug}-{digest}-{i}" for i in range(len(cs))],
        documents=cs,
        metadatas=[{"source": archive, "project": project, "date": f"{now:%Y-%m-%d}", "session": session} for _ in cs],
    )
    with open(LOG, "a") as f:
        f.write(f"{now.isoformat()} indexé {slug}: {len(cs)} chunks\n")

if __name__ == "__main__":
    try:
        main()
    except Exception:
        os.makedirs(ARCHIVE_DIR, exist_ok=True)
        with open(LOG, "a") as f:
            f.write(f"{datetime.datetime.now().isoformat()} ERREUR\n{traceback.format_exc()}\n")
