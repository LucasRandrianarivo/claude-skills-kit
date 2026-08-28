---
description: Infrastructure as code — Terraform/OpenTofu/Pulumi: state, plan review, modules, drift, secrets, safe applies
argument-hint: "[--plan] [--audit] [--module <name>] [--import]"
---

# /iac — Infrastructure as Code

## Usage
```
/iac --plan              — review a plan before it is applied
/iac --audit             — audit the IaC setup: state, structure, secrets, drift
/iac --module vpc        — write or refactor a module
/iac --import            — bring existing manual infrastructure under code
```
Field notes: `.claude/references/devops.md`.

## Overview
Infrastructure as code turns infrastructure changes into reviewable, repeatable artifacts. It also introduces one object that can ruin a day faster than any application bug: **the state file**. Most IaC incidents are state incidents — a lost state, two applies at once, or a plan nobody read that contained a `destroy`.

Iron rule: **the plan is the review**. Nothing is applied that wasn't read.

---

## Phase 1: State — get this right before anything else

- **Remote backend**, always: S3+DynamoDB / GCS / Azure Blob / Terraform Cloud. Local state on a laptop is a single point of failure with no audit trail.
- **Locking enabled**, or two concurrent applies will corrupt state. Verify it's actually on — a missing lock table fails open in some setups.
- **Versioning + backups** on the state bucket. State is the map from code to real resources; losing it means adopting your entire infrastructure by hand.
- **State contains secrets in plaintext** (database passwords, generated keys). Encrypt at rest, restrict read access as tightly as production credentials, and never commit it or paste it into a ticket.
- **One state per environment**, and split large states by lifecycle (network / data / apps). A single monolithic state makes every apply a whole-infrastructure risk and every plan slow.
- Never edit state by hand; `state mv`/`import`/`rm` are the supported operations, and each one deserves a backup first.

## Phase 2: Read the plan like a reviewer

The plan is a diff of reality. Read it in this order:
1. **Every `destroy` and every `replace` (`-/+`)** — these are the lines that cause outages. For each, ask: *is this resource stateful?* A replaced database, disk, or load balancer with a stable address is data loss or downtime. Fix with `lifecycle { prevent_destroy = true }` on the resources that must never be replaced, and `create_before_destroy` where a replacement is acceptable.
2. **What forces the replacement** — the plan names the attribute. Frequently it's an immutable field changed by accident (a name, an AZ, an engine version).
3. **Unexpected changes**: resources you didn't touch appearing in the diff means drift (someone changed it in the console) or a provider upgrade changing defaults.
4. **Count**: "12 to add, 3 to change, 0 to destroy" should match your intent. If it doesn't, stop.
5. **Secrets in the plan output** — plans print values; don't paste one into a public PR without checking.

In CI: `plan` on the pull request as a comment, `apply` only on merge, with a **manual approval** for production and no other path to `apply` (`/cicd`).

## Phase 3: Structure

- **Modules for repeated patterns**, not for wrapping a single resource — a module that adds indirection without reuse is cost with no benefit.
- Version module sources (a tag or a commit), never a floating branch.
- **Pin the provider and the tool version** with a lockfile committed; a provider minor upgrade can rewrite defaults and produce a surprise destroy.
- Variables are typed, described, and validated; sensible defaults for everything except the things that must be decided per environment.
- **Environments differ by variables, not by copied directories.** Copy-paste environments drift the moment someone fixes one and not the other.
- Outputs are the module's contract — treat a change to them as a breaking change.
- No secrets in `.tfvars` in the repository: pull from the secret manager or the CI secret store (`/env`), and mark variables `sensitive`.

## Phase 4: Drift and adoption (`--import`)

- **Drift detection on a schedule** (a scheduled `plan` that alerts on any diff). Drift is normal in teams with console access; unknown drift is what breaks the next apply.
- The right response to drift is usually to codify it, not to silently revert — someone changed it for a reason, in an incident. Find out first.
- **Adopting manual infrastructure**: `import` (or `terraform import`/`import` blocks) resource by resource, running `plan` after each until it is empty. An empty plan is the proof that code matches reality — do not skip it, and do not adopt a whole environment in one commit.

## Phase 5: Safety rails worth having

`prevent_destroy` on stateful resources; deletion protection on databases and buckets at the provider level too (defense in depth against a `-target` mistake); `-target` treated as an emergency tool, not a workflow; a policy check (OPA/Sentinel/tflint/checkov) for the rules that matter — no public buckets, encryption required, tags mandatory; and cost estimation in the PR (Infracost) so a €4k/month change is visible before merge, not on the invoice (`/cost`).

## Phase 6: Report

```
## IaC Audit
Tool: <terraform 1.x>   Backend: <s3+dynamodb> locking ✓ versioning ✓ encrypted ✓
States: <n> (per env ✓ / monolith ✗)   Provider pinned ✓   Modules versioned ✓
Drift: <n> resources differ from code (<list>)
Secrets: none in repo ✓ · state access restricted ✓
Plan review: PR comment ✓ · prod apply gated ✓ · policy checks <list>
| # | Severity | Issue | Consequence | Fix |
| 1 | 🔴 | no state locking | concurrent applies corrupt state | enable the lock table |
```

## Rules
- Never apply a plan nobody read; every `destroy`/`replace` line is justified out loud before proceeding.
- Remote state, locked, versioned, encrypted, access-restricted — before anything else is done.
- Never hand-edit state; back it up before any state operation.
- Pin tool, provider and module versions; a floating version is an unreviewed change.
- Never commit secrets to `.tfvars`, and treat plan output as sensitive.
- Adoption is finished when `plan` is empty — that empty plan is the deliverable.
