# Uden — Implementation Plan & Project Guardrail

> **Source of truth.** Record actual repository state and build order here. Inspect this file and recent commits before changing direction.

## Product vision
Uden is a production-grade, multi-tenant **AI work partner**, not a chatbot wrapper. Users give Uden real work; Uden understands it, decomposes it into a durable task graph, routes each unit to capable models, executes with quality/approval gates, controls spend, verifies results, preserves an auditable work trail, and exposes that work through multiple clients.

### Clients
- **Web:** primary Uden control center for work, graphs, projects, approvals, analytics and administration.
- **Desktop:** full-capability work environment, including local filesystem/Git/runtime/Ollama capabilities where supported.
- **Mobile:** deliberately reduced companion client for task creation, monitoring, approvals, notifications and result review.

## Non-negotiables
- Real implementation; no fake success paths or production-looking mock data.
- Never weaken tests or replace required integrations to get green CI.
- Cost, quality, safety and verification are first-class constraints.
- Every graph node is independently routable and auditable.
- Tenant isolation applies to every read, write and execution path.
- Preserve Cloudflare Workers + Hono + D1/KV engine and shared TypeScript contracts.
- Client execution views consume real API data and never invent execution state.
- Uden-managed providers are the normal product path; BYOK uses the same provider abstraction.
- Do not create special architecture for free-tier providers. Ollama is an ordinary provider endpoint.
- Every substantial milestone is verified where possible, committed clearly, and reflected here.

## Architecture
### Engine
Workers/Hono, D1/KV, authentication, classifier, model registry/pricing, cost-aware routing/fallbacks, quality checks/escalation, provider adapters, usage accounting, durable graph execution, leases/fences, approvals and observability.

### Web
Next.js App Router. Work-first experience with task composer, graph workspace, live execution timeline, approvals, projects/files, verification, provider/usage visibility, analytics and settings.

### Desktop
Native-capable shell using the same API/domain contracts. Local capabilities are explicit and must cross the same execution-security boundaries; no duplicated engine semantics. The native bridge now has registered workspace roots, bounded direct process execution, safe repository cloning, one-time native approval tokens for high-risk commands, durable runtime registration/heartbeat, and fenced runtime execution.

### Mobile
Companion client using shared contracts. It exposes the high-value operational subset rather than cloning desktop.

### Shared
Shared TypeScript contracts for tasks, models, pricing, task graphs, execution events and client capabilities. Execution runtime contracts distinguish cloud sandbox, scheduled cloud automation, and local desktop execution.

## Completed
### Engine foundation
- [x] Shared domain/model contracts and registry.
- [x] Deterministic classifier.
- [x] Cost-aware router and fallback chains.
- [x] Quality checks and escalation.
- [x] Real provider adapters.
- [x] Usage/cost accounting.
- [x] Tenant/task/project/usage APIs.

### Graph and durable execution
- [x] TaskGraph/TaskNode contracts and statuses.
- [x] Deterministic compound-task decomposition.
- [x] Per-node routing, dependency validation and upstream context.
- [x] Real provider execution, quality gates, fallback escalation and budget checks.
- [x] Downstream blocking and aggregate root accounting.
- [x] Authenticated graph execution endpoint.
- [x] D1 graph/node/attempt persistence and state transitions.
- [x] Execution ownership lease/expiry protection.
- [x] Persisted resume and completed-node preservation.
- [x] Stable attempt identity and idempotent usage accounting.
- [x] Queue background execution with retry/DLQ and graph resume.
- [x] External execution fencing for provider/runtime/repository boundaries.
- [x] Durable execution principal propagation through graph persistence and queue resume.
- [x] Durable approval request/decision records with tenant-scoped principal authorization.
- [x] Separate plan estimate, reservation and actual provider cost accounting.

### Existing web foundation
- [x] Next.js dashboard shell/navigation.
- [x] Graph, task, project, analytics and settings routes.
- [x] Real analytics/task data wiring; fake analytics data removed.

### Reliability/security
- [x] Input/context and pagination bounds.
- [x] Tenant-scoped graph reads/writes/attempt reads.
- [x] KV graph rate limiting.
- [x] Concurrency/idempotency controls.
- [x] Provider error sanitization and secret redaction.
- [x] Retry/backoff for transient provider failures.
- [x] Atomic budget reservation/release.
- [x] Real D1 reliability tests, including dependency blocking, budget exhaustion and crash/resume.
- [x] External fence checks immediately around meaningful provider/runtime/repository calls.
- [x] Runtime side effects fail closed before attempting stale fenced writes.
- [x] Runtime execution records carry the exact graph owner + generation fence.
- [x] Runtime authorization verifies advertised capability before dispatch.

### Permissions/observability/analytics
- [x] Tenant roles and permission checks.
- [x] Graph execute/resume/read authorization.
- [x] High-risk pre-spend approval gate and audit event.
- [x] Structured request/queue logging, safe errors and audit trail.
- [x] Worker logs/traces and external alert wiring.
- [x] Cost/quality/failure/escalation analytics from recorded execution data.

## Active engine gates
- [ ] Observe the latest CI run green after the recent hardening changes.
- [ ] Add quantified routing-savings baseline from alternative-model pricing.
- [ ] Add first real provider E2E using supplied credentials; never fake provider responses.
- [ ] Deliberately review/remediate dependency security findings; do not blindly run `npm audit fix`.
- [ ] Complete final deployment/binding/secret verification in the actual environment.
- [ ] Integrate repository-operation reconciliation into the graph mutation path.
- [ ] Add the real GitHub pull-request-files endpoint and normalize repository results across GitHub and Origin.

## Desktop runtime gates
- [x] Native direct command bridge with bounded execution and workspace containment.
- [x] Native repository clone primitive using direct argv execution rather than shell interpolation.
- [x] One-time native approval token for high-risk local commands.
- [x] Shared execution-runtime contract separating cloud sandbox, cloud automation and desktop local execution.
- [x] Durable server-side runtime registration, heartbeat, capability discovery and runtime-execution persistence API.
- [x] Desktop durable runtime client and heartbeat supervisor.
- [x] Desktop runtime execution wrapper binds local commands to graph attempt IDs and server-side execution fences.
- [x] Runtime execution records persist owner + generation and reject stale completion after reclaim.
- [ ] Durable reconnect/recovery when the desktop disappears during a local execution; ambiguous local side effects must reconcile before replay.
- [ ] Route project/git work to desktop runtime only when the graph has an eligible local capability.
- [ ] Add native UI for workspace registration and approval review; never hide dangerous execution behind a generic "run" button.

## Product UI — ACTIVE NOW
### Web control center
- [ ] Replace legacy "AI routing engine / Work Partner" marketing presentation with Uden product identity and work-first UX.
- [ ] Establish reusable Uden design system and responsive shell.
- [ ] Build real workbench/task composer against authenticated APIs.
- [ ] Build task planning → execution → verification flow using real graph state.
- [ ] Build unified graph workspace: dependency edges, node states, attempts, diagnostics, live timeline, pause/resume and failure recovery.
- [ ] Build approval center against durable approval records.
- [ ] Build project workspace for real files, changes, runtime jobs and verification.
- [ ] Keep analytics/economics as an operational surface, not the product's center of gravity.
- [ ] Remove remaining production-looking placeholder identity/data from client surfaces.

## Verification
- [ ] Web build/typecheck/test verification.
- [ ] Desktop build/typecheck verification once shell is selected.
- [ ] Mobile build/typecheck verification once shell is selected.
- [ ] Real multi-provider verification with supplied Gemini/NVIDIA/OpenRouter/DeepSeek credentials and local Ollama where available.
- [ ] Final deployment/readiness gate only after CI and integration verification are green.

## Build order
1. Stabilize CI and close remaining engine gates that affect durable execution/security.
2. Build the **web workbench first** against real APIs and remove legacy/placeholder product presentation.
3. Extract shared client contracts/capabilities.
4. Build the **desktop full-capability client**.
5. Build the **mobile reduced-capability companion**.
6. Exercise the system with real providers and Ollama.
7. Complete deployment/readiness verification.

## Anti-drift order
**Reliability/security → permissions → web workbench → shared client contracts → desktop → mobile → analytics/operational polish → production hardening.**

## Definition of done
A milestone is done only when integrated into the real architecture, preserves existing behavior, has appropriate tests, keeps real integrations intact, is verified as far as the environment permits, is committed clearly, and this plan is updated.

## Immediate next action
**Finish runtime reconnect/reconciliation and capability-aware graph routing; then close repository-operation reconciliation and the real GitHub pull-request-files adapter before shifting hard into the web workbench.**
