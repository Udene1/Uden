# Uden — Implementation Plan & Project Guardrail

> **Source of truth.** This plan tracks what is actually in the repository and the order in which we build it. Future sessions must inspect this file and the latest commits before changing direction.

## Product goal

Uden is a production-grade, multi-tenant AI work partner—not a chatbot wrapper. It should take real knowledge work, decompose complex requests, route each unit to the cheapest capable model, execute with quality gates and escalation, enforce budgets, record economics, and expose the work through the dashboard.

### Non-negotiables

- Real implementation over demos or placeholder success paths.
- No mock-driven completion of required integrations.
- Cost and quality are first-class execution constraints.
- Every node is independently routable and auditable.
- Explicit tenant isolation on every persisted/read operation.
- Preserve the existing Cloudflare Workers + Hono + D1/KV engine and Next.js dashboard architecture.
- Finish one technically coherent layer before jumping to unrelated features.
- Every substantial milestone ends with verification where available and a focused Git commit.

## Architecture already established

### Engine
Cloudflare Workers, Hono, D1, KV, API-key tenant auth, deterministic classifier, cost-aware router/fallbacks, quality checks, escalation, provider adapters (OpenAI/Anthropic/Google/DeepSeek), usage accounting, and task-graph planning/routing.

### Dashboard
Next.js App Router with task, project, analytics and settings surfaces plus existing Recharts components. The graph UI must consume real engine data when it is introduced.

### Shared
Shared TypeScript contracts for tasks, models, pricing, constants and task graphs.

## Completed milestones

### Engine foundation

- [x] Shared domain types/model registry.
- [x] Deterministic task classifier.
- [x] Cost-aware routing and fallback chains.
- [x] Quality checks and escalation.
- [x] Provider adapters.
- [x] Usage/cost accounting.
- [x] Tenant/task/project/usage API foundations.
- [x] Existing Vitest coverage for classifier/routing/quality foundations.

### Task-graph foundation

- [x] `TaskGraph` / `TaskNode` domain primitives and statuses.
- [x] Shared exports.
- [x] Deterministic decomposition of compound requests.
- [x] Per-node routing using complexity/domain/quality/budget/risk context.
- [x] `POST /api/v1/tasks/plan` preview endpoint with no model spend.

### Graph execution slice — completed in this session

- [x] Added `PLAN.md` as the anti-drift source of truth.
- [x] Added real graph orchestration in `packages/engine/src/services/graph-executor.ts`.
- [x] Validate duplicate IDs, missing dependencies, self-dependencies and cycles before execution.
- [x] Resolve dependency order and block downstream nodes after failed dependencies.
- [x] Propagate only explicit `contextFrom` outputs, including upstream quality scores.
- [x] Route each node independently through the existing graph router.
- [x] Execute through the real provider adapter layer.
- [x] Apply existing quality checks to every node attempt.
- [x] Perform budget checks before primary and escalation attempts.
- [x] Escalate through the existing fallback chain and record escalation/usage data.
- [x] Aggregate graph cost, tokens, execution order and terminal output.
- [x] Create a real root task so graph usage/escalation records remain attached to the existing task accounting model.
- [x] Added authenticated `POST /api/v1/tasks/graph/execute` endpoint; accepts either a prompt or a validated plan.
- [x] Added deterministic tests for graph validation and explicit context propagation.
- [x] Kept existing single-task execution path intact.

**Important implementation note:** graph nodes currently execute sequentially even when independent. This is deliberate: atomic budget reservation does not yet exist, so sequential execution avoids concurrent spend races. Parallel graph waves belong in the production-hardening stage after reservation semantics exist.

## Current milestone: graph persistence

The graph is now executable in memory and attached to the existing task/usage model. The next layer is durable graph state.

### Persistence requirements

- [ ] Add D1 graph table scoped to tenant/root task/project.
- [ ] Add D1 graph-node table with dependency/context metadata and lifecycle state.
- [ ] Add node-attempt table/history for every model attempt, including escalation.
- [ ] Persist graph creation and completion/failure state.
- [ ] Persist node outputs, quality scores, selected model, attempted models, tokens and cost.
- [ ] Add tenant-scoped graph read endpoints.
- [ ] Add safe resume/retry semantics for failed nodes.
- [ ] Make retry/idempotency semantics explicit so completed work is not accidentally re-billed.
- [ ] Keep the in-memory executor usable for unit-level deterministic logic.

Do not start the dashboard graph UI until the API can return durable graph state.

## Next milestone: real dashboard graph

After persistence:

- [ ] Graph view with dependency edges.
- [ ] Node states: pending, ready, running, completed, failed, blocked, awaiting approval.
- [ ] Per-node model, tier, quality, cost and latency where available.
- [ ] Execution timeline/order.
- [ ] Aggregate graph cost/tokens.
- [ ] Escalation chain visibility.
- [ ] Node detail view: prompt, upstream context, output and attempt history.
- [ ] Explain why a node is blocked.
- [ ] No hardcoded production-looking graph data.
- [ ] Do not redesign unrelated dashboard surfaces.

## Reliability and integration track

- [ ] End-to-end simple graph execution test using real integration/recording strategy.
- [ ] Multi-node dependency execution test.
- [ ] Parallel-ready-node semantics after atomic reservation is implemented.
- [ ] Quality-triggered escalation test.
- [ ] Budget exhaustion test.
- [ ] Provider failure + downstream blocking test.
- [ ] Tenant isolation test.
- [ ] Idempotent resume/retry test.
- [ ] Run `typecheck`, build and test suites when the environment permits; fix real failures rather than weakening assertions.

## Permission / human-in-the-loop track

- [ ] Graph-level cost/risk proposal.
- [ ] Approval/rejection before spend.
- [ ] Preserve the approved routing plan.
- [ ] Optional approval gates for sensitive/high-risk nodes.
- [ ] Enforce authorization for graph mutation.

## Analytics track

- [ ] Cost by graph/node/domain.
- [ ] Escalation rate by node/domain/model.
- [ ] Estimated vs actual graph cost.
- [ ] Model-routing savings.
- [ ] Quality before/after escalation.
- [ ] Graph completion time.
- [ ] Failure/blocked-node rate.

All analytics must originate from recorded execution data.

## Production security/hardening

- [ ] Strict tenant scoping everywhere.
- [ ] Input and prompt/context size limits.
- [ ] Graph execution rate limiting.
- [ ] Atomic budget reservation for concurrent execution.
- [ ] Safe provider error handling without secret leakage.
- [ ] No secrets in Git.
- [ ] Structured operational logging without unnecessary prompt leakage.
- [ ] Deterministic, auditable billing records.
- [ ] Concurrency/idempotency controls.

## Definition of done

A feature is not done merely because it compiles. It must be integrated, preserve existing behavior unless intentionally changed, have appropriate tests, preserve real integrations, be verified as far as the environment allows, and be committed with a clear message. This plan must then be updated.

## Anti-drift execution order

**Graph execution → graph persistence → dashboard graph → reliability/security → permissions → analytics → production hardening.**

At the beginning of a future session inspect `PLAN.md`, recent commits, graph/task files, tests and CI status. Continue from the first unchecked item that is technically unblocked.

## Immediate next action

**Start graph persistence:** design and implement the D1 schema/migrations plus tenant-scoped graph/node/attempt queries, then wire the executor so graph state and attempt history survive beyond a single request. Commit that coherent persistence slice before moving to the dashboard graph.
