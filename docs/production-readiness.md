# Uden production-readiness gates

This document is an engineering gate, not a test checklist to be bypassed.

## Execution safety

- Every externally meaningful graph capability must receive an `ExecutionFence` containing tenant and graph identity.
- Provider calls must assert the fence immediately before and after the provider call.
- Project runtime/sandbox execution must assert the fence before and after starting execution.
- Runtime result polling must preserve the same graph fence when a graph owns the job.
- GitHub repository capabilities must validate the fence before and after the external request.
- Stale workers must fail closed; never convert a fence failure into a successful result.
- Direct project runtime execution without a graph fence is rejected.

## Approval safety

- Project `patch` and `execute` graph nodes require explicit approval unless an already-persisted approval is present.
- Approval state is durable in D1 and survives worker restart.
- Rejected/pending approval must not be interpreted as completed work.

## Durability

- Graphs, nodes, attempts, runtime linkage, verification and execution leases are persisted in D1.
- Lease ownership is generation-fenced. A worker cannot mutate state after another worker takes the next generation.
- Queue redelivery resumes the persisted graph rather than creating a duplicate graph.
- Runtime jobs are represented by durable job IDs and must be reconciled before a graph is considered complete.

## Economics

- Budget reservation happens before provider execution.
- Actual token usage and calculated cost are persisted from provider responses.
- Repeated attempt identity must be idempotent.
- Reservations are released after the attempt is accounted for and stale reservations are reclaimable by generation.
- Estimated routing cost is a planning value only; it must never be reported as actual spend.

## Real integration policy

- D1 integration tests use Wrangler's real local D1 implementation and migrations.
- Runtime tests must use the real sandbox/runtime boundary when the capability is configured.
- Provider end-to-end verification is an opt-in integration test using a real provider credential; no fake provider response may be used to claim production verification.
- Unit tests may isolate pure deterministic logic, but execution-path tests must not replace external execution with mocks.

## Release gate

A release is not considered production-ready until:

1. `npm run build` passes.
2. `npm test` passes.
3. All D1 integration suites pass against the current migration set.
4. Execution-fence tests prove stale attempts, usage, budget and runtime results are rejected.
5. Approval lifecycle tests prove persistence across resume/recovery.
6. Runtime continuation proves a real job can move from running to terminal state.
7. At least one real provider integration run has been executed outside unit-test mocks and its usage/cost record reconciled.
8. Deployment configuration contains all required bindings/secrets and no provider credential is committed to the repository.

A red CI result blocks the milestone. Do not weaken or skip a failing test merely to obtain green CI.
