# Rule: Careful — Destructive Command Protection

## Status: Always Active

This rule is always in effect. It cannot be disabled.

---

## Blocked Commands

Before executing ANY shell command, check if it matches a blocked pattern. If it does, REFUSE to execute and explain why.

### Filesystem Destruction
| Pattern | Reason |
|---------|--------|
| `rm -rf /` | System destruction |
| `rm -rf ~` | Home directory destruction |
| `rm -rf .` | Current directory destruction |
| `rm -rf *` without specific path | Wildcard destruction |
| `rmdir` on project root | Project destruction |
| `find ... -delete` on broad paths | Mass file deletion |

### Database Destruction
| Pattern | Reason |
|---------|--------|
| `DROP TABLE` | Irreversible data loss |
| `DROP DATABASE` | Irreversible data loss |
| `TRUNCATE TABLE` on production | Data loss |
| `DELETE FROM` without `WHERE` | Full table wipe |
| `db.dropDatabase()` | Irreversible data loss |
| `db.collection.drop()` | Irreversible data loss |

### Git Destruction
| Pattern | Reason |
|---------|--------|
| `git push --force` to main/master | Overwrites shared history |
| `git push -f` to main/master | Overwrites shared history |
| `git reset --hard` without confirmation | Loses uncommitted work |
| `git clean -fd` without confirmation | Deletes untracked files |
| `git branch -D` on main/master | Deletes primary branch |
| `git rebase` on main/master | Rewrites shared history |

### Docker/Infrastructure Destruction
| Pattern | Reason |
|---------|--------|
| `docker system prune -a` | Removes all images and containers |
| `docker volume prune` | Removes all volumes (data loss) |
| `kubectl delete namespace` on production | Infrastructure destruction |

---

## Allowed Exceptions

These `rm -rf` targets are safe build artifacts and may be deleted without confirmation:

| Path | Reason |
|------|--------|
| `node_modules/` | Dependency cache, restored by install |
| `.next/` | Next.js build output |
| `dist/` | Build output |
| `build/` | Build output |
| `coverage/` | Test coverage output |
| `.cache/` | Tool cache |
| `__pycache__/` | Python bytecode cache |
| `.turbo/` | Turborepo cache |
| `target/` | Rust/Java build output |
| `.nuxt/` | Nuxt build output |
| `tmp/` or `.tmp/` | Temporary files |

## Behavior on Detection

When a blocked command is detected:

1. **STOP** — do not execute the command
2. **WARN** the user:
   ```
   BLOCKED: <command> is a destructive operation.
   Reason: <why it's dangerous>
   ```
3. **Suggest** a safer alternative if one exists:
   - `git push --force` -> `git push --force-with-lease`
   - `rm -rf .` -> list specific directories to remove
   - `git reset --hard` -> `git stash` first
4. **Ask** for explicit confirmation if the user insists:
   ```
   If you're sure, please confirm by saying: "Yes, execute <command>"
   ```

## Edge Cases
- `rm -rf` with a variable (`rm -rf $DIR`) — BLOCK unless the variable is clearly a safe path
- Commands piped to `sh` or `bash` — inspect the piped content before executing
- Scripts that contain destructive commands — warn before running the script
- `--force` flags on any command — double-check the implications
