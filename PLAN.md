# Uden — Implementation Plan & Project Guardrail

> **Purpose:** This file is the source of truth for the build. We update it as milestones are completed so future work continues from the actual repository state instead of drifting into disconnected features.

## 1. Product Goal

Uden (AI Work Partner) is a production-grade, multi-tenant AI work system. A user gives it a real piece of knowledge work; Uden should understand the request, break complex work into useful units, route each unit to the cheapest model that can perform it reliably, execute with quality checks and escalation, control spend, and expose the work and economics through the dashboard.

The target is **an actual work engine, not a chatbot wrapper**.

### Non-negotiable engineering principles

1. **Real implementation over demos.** Do not add fake execution paths, placeholder success responses, or UI-only features that pretend the backend exists.
2. **No mock-driven completion.** Tests may use pure deterministic functions and test doubles where the code boundary genuinely requires isolation, but never replace a required real integration simply to make a test pass.
3. **Cost is a first-class constraint.** Every model decision must be explainable and measurable.
4. **Quality before escalation.** Stronger models are used because a quality gate requires them, not because they are the default.
5. **Tenant isolation everywhere.** Tenant-owned data and execution must never cross tenant boundaries.
6. **Small, verifiable milestones.** Each substantial milestone ends with tests/typechecking where available and a focused commit.
7. **Preserve the existing architecture.** Cloudflare Workers + Hono + D1/KV for the engine; Next.js for the dashboard; shared TypeScript domain contracts.

---

## 2. Current Architecture

### Engine

- Cloudflare Workers runtime
- Hono HTTP API
- D1 persistence
- KV for cache-oriented concerns
- API-key tenant authentication
- Provider adapters for OpenAI, Anthropic, Google and DeepSeek
- Deterministic classifier
- Model router and fallback chains
- Quality checks and escalation
- Cost/budget tracking
- Task graph primitives, decomposition, per-node routing, and graph planning endpoint

### Dashboard

- Next.js App Router
- Existing task, project, analytics and settings surfaces
- Existing Recharts analytics components
- Engine API consumed through the dashboard layer

### Shared package

Owns domain types, model registry/pricing, constants, and task-graph contracts so engine and dashboard do not invent incompatible shapes.

---

## 3. Completed Work — Keep This History

### Foundation / engine overhaul

- [x] Shared domain types and model registry
- [x] Deterministic task classifier
- [x] Cost-aware routing and fallback chains
- [x] Quality checks
- [x] Escalation flow
- [x] Provider adapters
- [x] Usage/cost accounting
- [x] Tenant/task/project/usage API foundations
- [x] Vitest coverage for the classifier/routing/quality foundations

### Task graph foundation

- [x] Task graph domain primitives (`TaskGraph`, `TaskNode`, statuses, routing contracts)
- [x] Shared exports for graph primitives
- [x] Deterministic task decomposition for compound work
- [x] Per-node routing based on node complexity/domain plus tenant quality, budget and risk context
- [x] Graph planning endpoint (`POST /api/v1/tasks/plan`) that previews a graph without model spend

The repository's recent graph commits established the above foundation. **Do not redo these pieces unless a concrete defect is found.**

---

## 4. Current Milestone — Make the Graph Executable

The next major step is to turn the graph from a planning artifact into a real execution primitive.

### 4.1 Graph execution orchestration

Implement a dedicated graph executor that:

1. Accepts a planned `TaskGraph`.
2. Validates graph integrity before spending money:
   - unique node IDs
   - all dependency IDs exist
   - no self-dependencies
   - no dependency cycles
3. Determines ready nodes from completed dependencies.
4. Executes independent ready nodes in the same wave where safe.
5. Builds each node's execution context from explicitly declared `contextFrom` nodes.
6. Routes each node independently using the existing graph router.
7. Executes through the existing provider adapters.
8. Runs the existing quality checks after each model attempt.
9. Escalates through the existing fallback chain when the quality gate requires it.
10. Records real token usage and cost against the tenant/task.
11. Updates node status and captures model, quality, cost, tokens and errors.
12. Stops dependent work when a required node fails instead of silently producing invalid downstream output.
13. Produces a final graph result containing node outcomes, total cost/tokens, execution order and final status.

### 4.2 Context propagation

Context must be explicit and bounded. A node receives outputs only from its declared `contextFrom` dependencies. The executor should construct a deterministic context block rather than dumping the entire graph into every model prompt.

The context format should identify:

- upstream node ID
- upstream node title
- upstream output
- upstream quality score

Avoid hidden/global mutable state.

### 4.3 Budget safety

Before every model attempt:

- check that the tenant still has budget available;
- estimate the attempt where possible;
- do not start an obviously unaffordable premium attempt;
- preserve actual usage accounting after execution.

A graph must not bypass the existing budget enforcement simply because it is composed of multiple nodes.

### 4.4 API surface

Add an authenticated graph execution endpoint under the existing task API. It should support:

- preview/planning (already exists)
- execution of a supplied/derived graph
- structured node results
- aggregate spend and token totals
- failure/blocked-node information

Keep the existing single-task endpoint working unchanged.

---

## 5. Milestone After Execution — Persist Graph State

Once in-memory graph execution is correct:

- [ ] Add D1 tables for graphs and graph nodes (or a carefully justified normalized representation).
- [ ] Persist graph lifecycle state.
- [ ] Persist node attempts separately from final node state so escalation history is auditable.
- [ ] Associate graph IDs with root tasks/projects/tenants.
- [ ] Add tenant-scoped graph read endpoints.
- [ ] Add safe resume/retry semantics for failed nodes.
- [ ] Ensure retries cannot double-charge or duplicate completed work unintentionally.

Do **not** add persistence before the execution semantics are clear and tested.

---

## 6. Milestone After Persistence — Dashboard Graph Visualization

The graph discussed in the previous work session should become a real dashboard feature, not a static illustration.

### Dashboard requirements

- [ ] Graph view showing nodes and dependency edges.
- [ ] Clear states: pending, ready, running, completed, failed, blocked, awaiting approval.
- [ ] Per-node model, tier, quality score, cost and latency where available.
- [ ] Execution timeline / order.
- [ ] Aggregate cost and token usage.
- [ ] Escalation visibility: initial model → fallback model(s).
- [ ] Click a node to inspect prompt, upstream context, output and attempt history.
- [ ] Show blocked nodes and the failed dependency that caused the block.
- [ ] Keep the existing dashboard visual language; do not redesign unrelated pages.

The visualization must consume real graph API data. No hardcoded production-looking graph data.

---

## 7. Quality & Reliability Track

After graph execution and persistence:

- [ ] Add end-to-end tests for simple one-node work.
- [ ] Add multi-node dependency tests.
- [ ] Add parallel-ready-node tests.
- [ ] Add cycle rejection tests.
- [ ] Add missing-dependency rejection tests.
- [ ] Add quality-triggered escalation tests.
- [ ] Add budget exhaustion tests.
- [ ] Add provider failure and downstream blocking tests.
- [ ] Add tenant isolation tests.
- [ ] Add idempotency/retry tests once persistence exists.
- [ ] Run typecheck/build/test suites and fix real failures rather than weakening assertions.

Where an external service is required for a test, prefer the repository's real integration/recording strategy. Do not replace the integration with a mock merely to achieve green CI.

---

## 8. Permission & Human-in-the-Loop Track

Permission-based mode must work at graph level, not only at single-task level.

- [ ] Estimate graph cost before execution.
- [ ] Present an approval proposal containing node count, routing, estimated spend and risk.
- [ ] Allow approval/rejection.
- [ ] Preserve the approved plan when execution starts.
- [ ] Prevent unauthorized mutation of a tenant's graph.
- [ ] Support approval gates for sensitive/high-risk nodes where appropriate.

---

## 9. Analytics Track

Extend the existing analytics foundation with graph economics:

- [ ] cost by graph
- [ ] cost by node/domain
- [ ] escalation rate by node/domain/model
- [ ] estimated vs actual graph cost
- [ ] model savings from per-node routing
- [ ] quality score before/after escalation
- [ ] average graph completion time
- [ ] failure/blocked-node rate

All metrics must originate from recorded execution data.

---

## 10. Security / Production Readiness

Before calling the system production-ready:

- [ ] Strict tenant scoping on every graph/task query and mutation.
- [ ] API authentication and authorization tests.
- [ ] Input size limits and validation.
- [ ] Prompt/context size safeguards.
- [ ] Rate limiting for graph execution.
- [ ] Budget race protection for concurrent node execution.
- [ ] Safe handling of provider/API errors without leaking secrets.
- [ ] No API keys or secrets committed to the repository.
- [ ] Structured operational logging without sensitive prompt leakage.
- [ ] Deterministic, auditable cost records.

---

## 11. Definition of Done

A milestone is **not done** because code compiles in isolation. It is done when:

1. The feature is integrated into the real architecture.
2. Existing behavior remains intact unless intentionally changed.
3. The important paths have tests.
4. Real integrations are preserved.
5. Typecheck/build/tests are run when the environment permits.
6. The result is committed to Git with a clear message.
7. This plan is updated to reflect exactly what was completed and what remains.

---

## 12. Working Order / Anti-Drift Rule

Always work in this order unless a concrete repository constraint requires a change:

**Graph execution → graph persistence → dashboard graph → reliability/security → permissions → analytics → production hardening.**

Do not jump to unrelated features while a preceding layer is incomplete.

When starting a new session, first inspect:

- `PLAN.md`
- latest commits
- current graph/task files
- current tests and CI status

Then continue from the first unchecked item that is technically unblocked.

---

## 13. Current Next Action

**Implement the first real graph execution slice:** validated dependency scheduling + explicit upstream context + per-node routing + real provider execution + quality/escalation + aggregate result, exposed through an authenticated task-graph execution endpoint, with focused tests. Commit the complete slice before moving to persistence or dashboard visualization.
