---
description: Kubernetes — probes, resources, rollouts without dropped requests, config/secrets, autoscaling, and debugging what broke
argument-hint: "[--deploy <service>] [--audit] [--debug] [--scale]"
---

# /k8s — Kubernetes

## Usage
```
/k8s --deploy api        — write or fix the manifests for a service
/k8s --audit             — audit existing workloads against what actually breaks
/k8s --debug             — diagnose a failing workload
/k8s --scale             — autoscaling and resource sizing
```
Field notes: `.claude/references/devops.md`.

## Overview
Kubernetes problems are rarely exotic. They cluster into five: **probes that misunderstand their job**, **resources set by guessing**, **rollouts that drop requests**, **config that doesn't reload**, and **autoscaling on the wrong metric**. This skill fixes those, and says plainly when the workload doesn't need Kubernetes at all — the operational surface is paid daily, and a container on a managed platform is often the better trade.

---

## Phase 1: Probes — the most misused feature

| Probe | Question it answers | Must not |
|---|---|---|
| **startup** | "Has it finished booting?" | — (it exists so slow starts don't trip liveness) |
| **readiness** | "Can it take traffic *right now*?" | Be the same endpoint as liveness |
| **liveness** | "Is the process wedged beyond recovery?" | **Check dependencies** |

The classic outage: liveness hits `/health`, which checks the database. The database has a blip, every pod fails liveness, Kubernetes restarts the entire fleet, and now there's a thundering herd of cold pods against a struggling database. **Liveness checks only the process.** Readiness may check dependencies — that removes the pod from the endpoints list without killing it, which is exactly right.

Set `failureThreshold`/`periodSeconds` so a brief pause doesn't restart a healthy pod, and always add a startup probe for slow-booting apps.

## Phase 2: Requests, limits, and getting killed

- **Requests** drive scheduling; **limits** cap usage. A pod with no requests is best-effort QoS and the first thing evicted under node pressure.
- **CPU limits throttle** rather than kill — aggressive CPU limits produce mysterious latency spikes. Many teams set CPU requests and no CPU limit deliberately; know which choice you've made and why.
- **Memory limits kill** (`OOMKilled`). The runtime must know the limit: Node needs `--max-old-space-size`, the JVM needs container-aware settings, or they will happily allocate past it and die.
- Size from measurement (p95 usage over a week, plus headroom), never from a round number. Then re-check after traffic changes.

## Phase 3: Rollouts that don't drop requests

Four things must all be true; missing one produces 502s on every deploy that nobody attributes to the deploy:
1. **Readiness probe** correct, so traffic arrives only when the pod can serve.
2. **SIGTERM handled**: stop accepting new connections, finish in-flight, then exit. Exec-form `CMD` so the signal actually reaches the process (`references/devops.md`).
3. **`preStop` hook with a short sleep** (~5s): endpoint removal and the SIGTERM race each other, so a pod can receive requests *after* it starts shutting down.
4. **`terminationGracePeriodSeconds` longer than the slowest request**, or in-flight work is SIGKILLed.

Plus: `maxUnavailable: 0` for a service that must not lose capacity, a **PodDisruptionBudget** so node drains don't take the service down, and images pinned by **digest** — `latest` makes a rollback meaningless.

## Phase 4: Config, secrets, storage

- ConfigMaps/Secrets mounted or injected; the app reads at boot, so a config change needs a **rollout** — add a checksum annotation on the pod template so a change triggers one automatically.
- Kubernetes Secrets are base64, not encrypted, by default: enable encryption at rest, use an external secret manager (External Secrets, Vault, cloud provider), and keep RBAC on secret reads tight (`/env`).
- Never bake config into the image — one image, promoted across environments, is the whole point.
- Stateful workloads need StatefulSets, real PVCs, and a backup/restore plan you have actually tested. A database in Kubernetes without that is a data-loss incident with a schedule.

## Phase 5: Autoscaling & networking

- **HPA on the metric that saturates**: CPU is right only for CPU-bound work. For I/O-bound services, scale on RPS, latency, or queue depth (custom/external metrics). An HPA on CPU for a service waiting on a database will never scale when it should.
- Scale-up should be fast, scale-down slow (stabilization windows) — flapping replicas cost more than the capacity.
- Cluster autoscaler must have room: pending pods with no schedulable node is a quota or resource-request problem, not an app problem.
- NetworkPolicies default-deny where the cluster supports it; a flat cluster network means one compromised pod reaches everything.
- Ingress: TLS termination, timeouts above your longest request, and the same WebSocket/SSE concerns as any proxy (`/nginx`).

## Phase 6: Debug (`--debug`) — the order that finds it fastest

```
kubectl get pods -o wide                  # state, restarts, node
kubectl describe pod <p>                  # events: scheduling, image pull, probe failures, OOM
kubectl logs <p> --previous               # why the last container died — the single most useful command
kubectl get events --sort-by=.lastTimestamp
kubectl top pod / node                    # actual usage vs requests
kubectl exec -it <p> -- sh                # last resort, and never to "fix" it in place
```
Read the **events** before the logs: scheduling failures, image pull errors and probe failures never appear in application logs. And a fix applied with `exec` disappears at the next restart — change the manifest.

## Phase 7: Report

```
## Kubernetes Audit — <workloads>
| # | Severity | Workload | Issue | Consequence | Fix |
| 1 | 🔴 | api | liveness probe checks the database | a DB blip restarts every pod | liveness = process only; move the check to readiness |

Probes: startup <n>/<n> · readiness ✓ · liveness dependency-free ✓
Resources: requests set <n>/<n> · limits measured ✓ · runtime aware of the memory limit ✓
Rollout: SIGTERM handled ✓ · preStop ✓ · grace > slowest request ✓ · PDB ✓ · digest-pinned ✓
Secrets: external manager ✓ · encryption at rest ✓   HPA: metric <x>
```

## Rules
- Liveness never checks a dependency. Readiness always may.
- Requests and limits come from measurements, and the runtime is told about the memory limit.
- No rollout is "done" until a deploy under load drops zero requests — test it.
- Never patch a running container; change the manifest and roll.
- Pin images by digest; `latest` in a cluster is an unrepeatable deploy.
- If a managed platform would run this workload with less operational surface, say so once, then work with the choice the team made.
