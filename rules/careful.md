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

### System & Device Destruction
| Pattern | Reason |
|---------|--------|
| `chmod -R 777` | Makes a whole tree world-writable — destroys the permission model |
| `chmod 777` on `/` or system dirs | Same, system-wide |
| `dd of=/dev/...` | Overwrites a raw disk device |
| `mkfs.*` on any device | Reformats the device — total data loss |
| `>` redirect to `/dev/sd*` or any block device | Overwrites a raw disk device |
| `crontab -r` | Wipes all cron jobs — no undo |

### Database Destruction
| Pattern | Reason |
|---------|--------|
| `DROP TABLE` | Irreversible data loss |
| `DROP DATABASE` | Irreversible data loss |
| `TRUNCATE TABLE` on production | Data loss |
| `DELETE FROM` without `WHERE` | Full table wipe |
| `db.dropDatabase()` | Irreversible data loss |
| `db.collection.drop()` | Irreversible data loss |

**Migration files count too.** Before applying a migration (`migrate`, `prisma migrate deploy`, `alembic upgrade`, `psql -f`, etc.), scan the migration files being applied for `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE FROM` without `WHERE`. If found, list the statements and warn before running — a migration is just SQL with a runner.

### Git Destruction
| Pattern | Reason |
|---------|--------|
| `git push --force` to main/master | Overwrites shared history |
| `git push -f` to main/master | Overwrites shared history |
| `git reset --hard` without confirmation | Loses uncommitted work |
| `git checkout .` / `git restore .` without confirmation | Discards all uncommitted changes |
| `git clean -fd` without confirmation | Deletes untracked files |
| `git branch -D` on main/master | Deletes primary branch |
| `git rebase` on main/master | Rewrites shared history |

### Docker/Infrastructure Destruction
| Pattern | Reason |
|---------|--------|
| `docker system prune -a` | Removes all images and containers |
| `docker volume prune` | Removes all volumes (data loss) |
| `docker rm -f` | Force-removes containers, running ones included |
| `kubectl delete` on any resource without confirmation | Live cluster impact |
| `kubectl delete namespace` on production | Infrastructure destruction |

### Cloud CLI Destruction
| Pattern | Reason |
|---------|--------|
| `terraform destroy` | Tears down all managed infrastructure |
| `aws s3 rb` | Deletes an S3 bucket |
| `aws s3 rm --recursive` | Mass-deletes objects in a bucket |
| `aws ec2 terminate-instances` | Destroys instances and their ephemeral storage |
| `aws rds delete-db-instance` | Deletes a database instance |
| `gcloud projects delete` | Deletes an entire GCP project |
| `gcloud sql instances delete` | Deletes a Cloud SQL instance |
| `heroku apps:destroy` | Deletes an app and its add-ons/data |

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
   - `git checkout .` / `git restore .` -> `git stash` (recoverable)
   - `terraform destroy` -> review `terraform plan -destroy` output first
4. **Ask** for explicit confirmation if the user insists:
   ```
   If you're sure, please confirm by saying: "Yes, execute <command>"
   ```

## Edge Cases
- `rm -rf` with a variable (`rm -rf $DIR`) — BLOCK unless the variable is clearly a safe path
- Commands piped to `sh` or `bash` — inspect the piped content before executing
- Scripts that contain destructive commands — warn before running the script
- `--force` flags on any command — double-check the implications
