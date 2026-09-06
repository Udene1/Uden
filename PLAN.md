# Uden — Implementation Plan & Project Guardrail

> **Source of truth.** This file records the actual repository state and the build order. Future sessions must inspect it and recent commits before changing direction.

## Product vision

Uden is a production-grade, multi-tenant **AI work partner**, not a chatbot wrapper. A user gives Uden real knowledge work; Uden should understand it, decompose complex work, route each unit to the cheapest capable model, execute with quality gates and escalation, control spend, preserve an auditable work trail, and expose the work and economics through the dashboard.

## Non-negotiables
- Real implementation; no fake success paths or production-looking mock data.
- Do not weaken tests or replace required real integrations merely to get green tests.
- Cost and quality are first-class constraints.
- Every graph node is independently routable and auditable.
- Tenant isolation applies to every read, write and execution path.
- Preserve Cloudflare Workers + Hono + D1/KV engine, Next.js dashboard and shared TypeScript contracts.
- Every substantial milestone ends with verification where available and a focused Git commit.

## Architecture
### Engine
Cloudflare Workers, Hono, D1, KV, API-key authentication, deterministic classifier, model registry/pricing, cost-aware routing/fallbacks, quality checks, escalation, provider adapters, usage accounting and task-graph planning/execution.
### Dashboard
Next.js App Router with real task/project/analytics/settings surfaces. Graph visualization must not invent execution data.
### Shared
Shared TypeScript contracts for tasks, models, pricing, constants and task graphs.

## Completed
### Foundation
- [x] Shared domain/model contracts and registry.
- [x] Deterministic classifier.
- [x] Cost-aware router and fallback chains.
- [x] Quality checks and escalation.
- [x] Real provider adapters.
- [x] Usage/cost accounting.
- [x] Tenant/task/project/usage APIs.
- [x] Classifier/routing/quality tests.

### Graph planning/execution
- [x] TaskGraph/TaskNode contracts and statuses.
- [x] Deterministic compound-task decomposition.
- [x] Per-node routing, dependency validation and explicit upstream context.
- [x] Real provider execution, quality gates, fallback escalation and budget checks.
- [x] Downstream blocking and aggregate root-task accounting.
- [x] Authenticated graph execution endpoint.

### Durable execution
- [x] D1 graph/node/attempt persistence wired into execution.
- [x] Running/completed/failed/blocked transitions persisted during execution.
- [x] Attempt model/provider/token/cost/quality/timestamps/errors persisted.
- [x] Execution ownership lease and expiry protection.
- [x] Persisted resume; completed nodes preserved while incomplete nodes retry.
- [x] Stable durable attempt identity and idempotent usage accounting.
- [x] Background execution through Cloudflare Queues with retry/DLQ; queue redelivery resumes the same graph ID.

### Dashboard graph
- [x] Dependency edges, staged layout, node inspection and persisted attempt history.
- [x] Execution timeline and live refresh.
- [x] Resume controls.

### Verification / CI
- [x] GitHub Actions CI workflow.
- [x] Real D1/workerd integration coverage for persistence, tenant isolation, idempotent attempts/usage and leases.
- [x] Reliability coverage for multi-node dependency blocking, budget reservation exhaustion/release and persisted crash recovery.
- [ ] First CI run must be observed and failures fixed rather than assumed green.
- [ ] First real end-to-end provider execution test using the repository's real integration/recording strategy.

## Reliability/security — completed slice
- [x] Input/context limits and graph pagination bounds.
- [x] Tenant-scoped graph reads/writes/attempt reads.
- [x] KV-backed graph rate limiting.
- [x] Concurrency/idempotency controls.
- [x] Provider error sanitization, secret redaction and bounded errors.
- [x] Transient provider retry/backoff.
- [x] Atomic D1 budget reservation and durable release.
- [x] Real multi-node dependency/failure-blocking and budget exhaustion tests.
- [x] Persisted crash/resume verification without provider mocks.

## Observability — completed slice
- [x] Structured request/queue logging with request IDs and latency.
- [x] Secret/prompt-key redaction in operational logs.
- [x] Safe API error surfaces that do not expose raw provider failures.
- [x] Audit trail for graph execution, queue submission, graph resume and tenant settings changes.
- [ ] External alerting/metrics sink and SLO dashboards.

## Permissions / human-in-the-loop — active
- [x] Tenant roles: owner/admin/member/viewer.
- [x] Permission checks for graph execute/resume/read and settings/audit access.
- [x] Tenant member role management with audit trail.
- [x] Authorization on graph mutation/resume paths.
- [ ] Graph-level cost/risk proposal before spend where required.
- [ ] Approval/rejection preserving approved routing.
- [ ] Sensitive/high-risk node approval gates.
- [ ] Per-user/API-key identity instead of the current tenant API-key subject fallback.

## Analytics — completed initial layer
- [x] Cost/quality/failure metrics by graph, node domain and model.
- [x] Escalation rate and escalated quality.
- [x] Recent graph execution economics and latency source data.
- [x] Actual versus primary-attempt cost data.
- [ ] True estimated-versus-actual cost comparison persisted at plan time.
- [ ] Quantified routing savings baseline based on recorded alternative-model pricing.
- [ ] Dashboard analytics UI wired to the real analytics endpoint.
- [ ] Time-series and operational alert views.

All analytics must originate from recorded execution data.

## Production hardening
- [x] Strict tenant scoping for graph execution paths.
- [x] Concurrency/idempotency controls.
- [x] Atomic budget reservation.
- [x] Durable long-running job execution outside one Worker request.
- [x] Retry/backoff policy for transient provider failures.
- [ ] External observability/alerts.
- [ ] Final typecheck/build/test/deployment verification.

## Anti-drift order
**Reliability/security → permissions → analytics → production hardening.**

## Definition of done
A milestone is done only when integrated into the real architecture, preserves existing behavior, has appropriate tests, keeps real integrations intact, is verified as far as the environment permits, is committed clearly, and this plan is updated.

## Immediate next action
**Finish permission human-in-the-loop gates and wire the analytics endpoint into the dashboard, then production hardening and full CI verification.**
