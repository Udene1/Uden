# Uden — Implementation Plan & Project Guardrail

> **Source of truth.** This file records the actual repository state and the build order. Future sessions must inspect it and recent commits before changing direction.

## Product vision

Uden is a production-grade, multi-tenant **AI work partner**, not a chatbot wrapper. A user gives Uden real knowledge work; Uden should understand it, decompose complex work, route each unit to the cheapest capable model, execute with quality gates and escalation, control spend, preserve an auditable work trail, and expose the work and economics through the dashboard.

The system should optimize for **useful completed work, quality, cost efficiency, explainability and tenant safety**.

## Non-negotiables

- Real implementation; no fake success paths or production-looking mock data.
- Do not weaken tests or replace required real integrations merely to get green tests.
- Cost and quality are first-class constraints.
- Every graph node is independently routable and auditable.
- Tenant isolation applies to every read, write and execution path.
- Preserve the Cloudflare Workers + Hono + D1/KV engine, Next.js dashboard and shared TypeScript contracts.
- Build coherent layers in order; do not drift into unrelated features.
- Every substantial milestone ends with verification where available and a focused Git commit.

## Architecture

### Engine
Cloudflare Workers, Hono, D1, KV, API-key authentication, deterministic classifier, model registry/pricing, cost-aware routing/fallbacks, quality checks, escalation, provider adapters (OpenAI/Anthropic/Google/DeepSeek), usage accounting and task-graph planning/execution.

### Dashboard
Next.js App Router with existing task/project/analytics/settings surfaces. Graph visualization is a real data surface and must not invent execution data.

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
- [x] Per-node routing.
- [x] Graph planning endpoint.
- [x] Dependency validation and cycle rejection.
- [x] Explicit upstream context propagation.
- [x] Real provider execution per node.
- [x] Quality gates and fallback escalation.
- [x] Budget checks and usage accounting.
- [x] Downstream blocking after failed dependencies.
- [x] Aggregate graph result and root-task accounting.
- [x] Authenticated graph execution endpoint.

### True durable execution slice
- [x] D1 graph/node/attempt persistence is wired into execution, not only written after completion.
- [x] Node running/completed/failed/blocked transitions are persisted during execution.
- [x] Primary and escalation attempt records capture model/provider/tokens/cost/quality/timestamps/errors.
- [x] Execution ownership lease and expiry protection added.
- [x] Persisted resume endpoint added; completed nodes are preserved while incomplete nodes are retried.
- [x] Attempt identity is idempotent at the graph-attempt table level.
- [x] Graph usage accounting is keyed by the durable attempt ID, so replaying the same completed attempt cannot create a second usage row.
- [x] Base schema and migrations are aligned; migration `0003_graph_durable_execution.sql` adds ownership/lease fields and the unique attempt identity.

### Dashboard graph maturity
- [x] Basic real graph visualization and node inspection.
- [x] Render dependency edges with staged graph layout.
- [x] Show attempt history from `task_graph_attempts`.
- [x] Show execution timeline and per-attempt latency from persisted timestamps.
- [x] Show escalation reason in persisted attempt history.
- [x] Show blocked-node dependency explanation in node state.
- [x] Add graph refresh/live state polling while execution is running.
- [x] Add explicit resume controls for failed/blocked graphs.

### Verification / CI
- [x] GitHub Actions CI workflow added for `npm ci`, workspace build and tests.
- [x] Real D1 integration coverage uses Wrangler's local D1/workerd proxy without mocks.
- [x] D1 coverage verifies graph persistence, tenant isolation, idempotent attempt/usage writes and execution lease ownership.
- [x] Reliability D1 coverage verifies multi-node dependency blocking, budget reservation exhaustion/release and persisted crash recovery.
- [ ] First CI run must be observed and failures fixed rather than assumed green.

## Reliability/security — active

- [x] Input/context size limits for graph requests and node relationships.
- [x] Graph pagination bounds.
- [x] Tenant-scoped graph reads/writes and attempt reads.
- [x] Graph execution rate limiting through KV-backed fixed windows.
- [x] Execution ownership/concurrency protection.
- [x] Stable durable attempt IDs and idempotent usage accounting.
- [x] Provider error sanitization with secret redaction and bounded error messages.
- [x] Transient provider retry/backoff with bounded attempts.
- [x] Real multi-node dependency/failure-blocking coverage.
- [x] Budget exhaustion coverage.
- [x] Persisted crash/resume verification without provider mocks.
- [x] Atomic D1 budget reservation before provider execution.
- [x] Durable reservation release on completed/failed attempts.
- [x] Production-grade background graph execution through Cloudflare Queues with retry policy and DLQ.
- [x] Background jobs persist the graph before enqueueing; queue redelivery resumes the same graph ID instead of creating duplicate graphs.
- [ ] Structured operational logging without unnecessary prompt leakage.
- [ ] First real end-to-end graph execution test using the repository's real provider/integration recording strategy.

## Permissions / human-in-the-loop

- [ ] Graph-level cost/risk proposal before spend where required.
- [ ] Approval/rejection and preservation of approved routing.
- [ ] Sensitive/high-risk node approval gates.
- [ ] Authorization for graph mutation/resume.

## Analytics

- [ ] Cost by graph/node/domain.
- [ ] Escalation rate by node/domain/model.
- [ ] Estimated vs actual graph cost.
- [ ] Routing savings.
- [ ] Quality before/after escalation.
- [ ] Completion time and latency.
- [ ] Failure/blocked-node rate.

All analytics must originate from recorded execution data.

## Production hardening

- [x] Strict tenant scoping for graph reads/writes/execution paths.
- [x] Concurrency/idempotency controls for graph execution and attempts.
- [x] Atomic budget reservation.
- [x] Durable job execution outside a single request for long-running graph workloads.
- [x] Retry/backoff policy for transient provider failures.
- [ ] Observability and operational alerts.
- [ ] Final typecheck/build/test/deployment verification.

## Anti-drift order

**Reliability/security → permissions → analytics → production hardening.**

Do not jump ahead unless a concrete dependency requires it.

## Definition of done

A milestone is done only when it is integrated into the real architecture, preserves existing behavior, has appropriate tests, keeps real integrations intact, is verified as far as the environment permits, is committed with a clear message, and this plan is updated.

## Immediate next action

**Finish reliability verification/observability, then move into permissions and analytics.**
