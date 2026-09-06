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
- [ ] First CI run must be observed and failures fixed rather than assumed green.
- [ ] Extend D1 integration coverage to a full provider-independent crash/resume execution path.

## Reliability/security — now active

- [x] Input/context size limits for graph requests and node relationships.
- [x] Graph pagination bounds.
- [x] Tenant-scoped graph reads/writes and attempt reads.
- [x] Graph execution rate limiting through KV-backed fixed windows.
- [x] Execution ownership/concurrency protection.
- [x] Idempotent persisted attempt/usage identity.
- [ ] Real end-to-end graph execution test using the repository's real integration/recording strategy.
- [ ] Multi-node dependency test.
- [ ] Budget exhaustion test.
- [ ] Provider failure and downstream blocking test.
- [ ] Idempotent resume/retry execution test.
- [ ] Atomic budget reservation before parallel execution.
- [ ] Safe provider error handling and secret protection.
- [ ] Structured operational logging without unnecessary prompt leakage.

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

- [ ] Strict tenant scoping everywhere.
- [ ] Concurrency/idempotency controls.
- [ ] Atomic budget reservation.
- [ ] Durable job execution outside a single request where required by workload duration.
- [ ] Retry/backoff policy for transient provider failures.
- [ ] Observability and operational alerts.
- [ ] Final typecheck/build/test/deployment verification.

## Anti-drift order

**Reliability/security → permissions → analytics → production hardening.**

Do not jump ahead unless a concrete dependency requires it.

## Definition of done

A milestone is done only when it is integrated into the real architecture, preserves existing behavior, has appropriate tests, keeps real integrations intact, is verified as far as the environment permits, is committed with a clear message, and this plan is updated.

## Immediate next action

**Continue reliability/security: provider error sanitization, real multi-node/budget/failure tests, durable resume verification, then atomic budget reservation and production-grade background execution.**
