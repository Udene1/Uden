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

### Persistence/dashboard slice completed in latest work
- [x] D1 migration for `task_graphs`, `task_graph_nodes` and `task_graph_attempts`.
- [x] Migration commands exposed in engine package scripts.
- [x] Tenant-scoped persistence service for graph/node state and attempt history.
- [x] Tenant-scoped graph listing/read/attempt endpoints.
- [x] Dashboard `/graphs` page.
- [x] Dashboard graph node/status/cost/token/detail visualization.
- [x] Graph navigation added to the dashboard sidebar.
- [x] Dashboard graph data client uses real API calls; no graph mock fallback.

## Known gap — next engineering target

The persistence schema and read layer exist, but the current graph executor still completes its in-memory execution before the route persists the final graph. Therefore **mid-execution crash recovery is not yet complete**, and attempt history is not yet populated by the executor itself on every attempt.

This is intentional technical debt to resolve before claiming durable execution complete.

## Next milestone: true durable execution

1. Wire persistence directly into the graph executor so graph creation, node transitions and every model attempt are written as execution proceeds.
2. Record primary and escalation attempts with exact model, provider, token counts, cost, quality, timestamps and error state.
3. Make graph/node writes idempotent so a Worker retry cannot double-bill a completed attempt.
4. Add execution version / ownership or equivalent concurrency protection.
5. Implement resume/retry from persisted state, continuing only unfinished nodes and preserving completed outputs.
6. Ensure failed/blocked/running states survive Worker/request termination.
7. Add tests for crash/resume, duplicate retry and tenant isolation.

## Then: dashboard graph maturity

- [x] Basic real graph visualization and node inspection.
- [ ] Render actual dependency edges/layout rather than only ordered node cards.
- [ ] Show attempt history from `task_graph_attempts`.
- [ ] Show execution timeline and latency from persisted timestamps.
- [ ] Show escalation chain and why escalation occurred.
- [ ] Show blocked-node dependency explanation.
- [ ] Add graph-level refresh/live execution state where architecture permits.
- [ ] Keep existing dashboard visual language; do not redesign unrelated surfaces.

## Reliability/security

- [ ] Real end-to-end graph execution test using the repository's real integration/recording strategy.
- [ ] Multi-node dependency test.
- [ ] Budget exhaustion test.
- [ ] Provider failure and downstream blocking test.
- [ ] Tenant isolation test.
- [ ] Idempotent resume/retry test.
- [ ] Atomic budget reservation before parallel execution.
- [ ] Input/context size limits.
- [ ] Graph execution rate limiting.
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

**True durable execution → dashboard graph maturity → reliability/security → permissions → analytics → production hardening.**

Do not jump ahead unless a concrete dependency requires it.

## Definition of done

A milestone is done only when it is integrated into the real architecture, preserves existing behavior, has appropriate tests, keeps real integrations intact, is verified as far as the environment permits, is committed with a clear message, and this plan is updated.

## Immediate next action

**Wire `graph-executor.ts` directly to the persistence service, make attempt/state writes durable and idempotent, implement persisted resume/retry, then verify with real tests before further dashboard polish.**
