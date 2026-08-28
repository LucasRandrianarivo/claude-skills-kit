# Field notes — Containers, orchestration, servers, deploys

Consulted by `/docker`, `/k8s`, `/nginx`, `/cicd`, `/deploy`, `/iac`, `/incident`.

---

## Containers — the model

An image is layers; a container is a process. Two consequences explain most container bugs:
- **Layers are immutable and additive.** Deleting a file in layer 8 doesn't remove it from layer 3 — a secret copied then deleted is still in the image and readable with `docker history`/`docker save`.
- **PID 1 is your process.** It gets no default signal handlers and doesn't reap children. Shell-form `CMD` wraps you in `/bin/sh -c`, which does not forward SIGTERM — so every deploy waits the full grace period and then SIGKILLs mid-request. Exec form (`CMD ["node","server.js"]`) plus an init for child-spawning processes.

**Cache order is the whole build**: copy the manifest+lockfile, install, *then* copy source. Reversed, every commit reinstalls everything. Verify by touching one file and rebuilding — if the install layer re-runs, the Dockerfile is wrong.

Other traps: `latest` base tags make builds irreproducible; running as root by default; `.dockerignore` missing so `.git` and `.env` enter the build context; alpine/musl breaking native modules or DNS resolution in ways glibc images don't; the build stage's `node_modules` (with devDependencies) copied into the runtime stage; a HEALTHCHECK that hits a route answering before the database connects.

## Kubernetes — what actually breaks

| Symptom | Cause | Fix |
|---|---|---|
| `CrashLoopBackOff` | App exits on startup (bad config, missing secret) — read `kubectl logs --previous` | Fix config; validate at boot with a clear message |
| `OOMKilled` | Memory limit below real usage; JVM/Node heap unaware of the cgroup limit | Raise limit or set the runtime's max heap from the limit |
| Pods restart under load | Liveness probe failing because the app is *busy*, not dead | Liveness = "is the process wedged"; readiness = "can it take traffic". Never point liveness at a dependency check |
| Rollout drops requests | No `preStop` + grace period; endpoints not yet updated when the process exits | `terminationGracePeriodSeconds` > longest request; `preStop: sleep 5`; handle SIGTERM by draining |
| Traffic to a pod that isn't ready | Missing/incorrect readiness probe | Readiness gates endpoint membership — that's its only job |
| Scaling does nothing | HPA on CPU while the bottleneck is I/O or a queue | Scale on the metric that saturates (queue depth, RPS, latency) |
| Node pressure evicts pods | No resource `requests` → best-effort QoS, first to be evicted | Set requests (scheduling) and limits (protection); requests ≈ steady state |
| Config change didn't apply | ConfigMap/Secret mounted but the app reads at boot | Roll the deployment on config change (checksum annotation) |
| Works in one namespace, not another | NetworkPolicy, RBAC, or a missing secret | Check policy and ServiceAccount, not the app |

Also: a single-replica Deployment has no rolling update worth the name; PodDisruptionBudgets are what keep a node drain from taking your service down; `latest` images plus `imagePullPolicy: Always` make rollbacks meaningless — pin by digest.

## Nginx / reverse proxies

The recurring five: missing `map $http_upgrade $connection_upgrade` (WebSockets fail); `proxy_buffering on` for SSE/streaming (responses arrive all at once); `client_max_body_size` left at 1MB (uploads 413); `add_header` in a nested `location` silently dropping the parent's security headers; and caching an authenticated response into a shared cache (one user's data served to another). Behind a CDN or LB, also set `set_real_ip_from`/`real_ip_header`, or every client looks like the proxy and per-IP limits are meaningless.

TLS: redirect 80→443 but leave `/.well-known/acme-challenge/` reachable, or renewals silently fail and the site expires. Test config before every reload (`nginx -t`); a bad reload takes the site down.

## Deploys

- **Blue/green** swaps traffic between two full environments — instant rollback, double the resources. **Canary** shifts a percentage — cheap, needs metrics to decide. **Rolling** is the default in orchestrators — no extra resources, both versions run simultaneously, so **the schema and API must be compatible with both**.
- The migration/deploy order is a design decision, not an afterthought: expand (compatible schema) → deploy code → contract (drop the old) in a later deploy. Anything else breaks during the window when both versions run.
- A rollback that requires a database rollback is not a rollback. This is why reversible, additive migrations matter more than clever ones.
- Zero-downtime requires: graceful shutdown (stop accepting, finish in-flight, then exit), readiness gating, and connection draining at the LB. Missing any one produces 502s on every deploy that nobody attributes to the deploy.

## CI/CD

Cache the package manager's store keyed on the lockfile; cancel superseded runs; run the same commands developers run. Never `pull_request_target` with a checkout of the PR head and secrets in scope — that's remote code execution against your repository. Pin third-party actions by SHA. Prefer OIDC short-lived cloud credentials over stored keys. And a check that's `continue-on-error` is not a check.

## Numbers worth knowing

- TLS handshake: 1–2 RTT (0-RTT with TLS 1.3 resumption). Cross-region RTT: 30–150ms — enough to dominate anything chatty.
- Container start: milliseconds for the container, seconds-to-minutes for your app's readiness. Autoscaling responds on the *readiness* timescale.
- Default `terminationGracePeriodSeconds` is 30s; if your slowest request is 60s, deploys cut it.

## Where this gets decided wrong

- Kubernetes for an app that a single container and a managed database would run better — the operational surface is the cost, and it is paid daily.
- Debugging a container by `exec`-ing in and patching it: the fix disappears at the next restart, and the image is still wrong.
- Treating infrastructure as pets in the console, then wondering why staging and production differ (`/iac` exists for this).
- Alerting on node CPU while the user-facing symptom is queue latency.

## Where to check the current truth
Defaults (grace periods, probe behavior, base images) change between versions. Fetch and cite these before stating a version-specific fact — the `expertise` rule requires it:
- Kubernetes docs — https://kubernetes.io/docs/ (probes, QoS, PDB, rollout)
- Docker docs — https://docs.docker.com/build/ (multi-stage, cache, BuildKit)
- nginx docs — https://nginx.org/en/docs/ (directive contexts and inheritance)
- The Twelve-Factor App — https://12factor.net (config, disposability)
