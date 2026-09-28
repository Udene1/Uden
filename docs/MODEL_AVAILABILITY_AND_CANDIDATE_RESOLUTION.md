# Durable Model Availability and Candidate Resolution

## Purpose
Uden owns durable task state. Models and providers are replaceable execution infrastructure. A configured model is not proof that it is currently executable.

The engine resolves task-node candidates using observed availability before execution, while preserving durable-attempt and reconciliation guarantees.

## Architecture
Task graph -> router -> candidate resolver -> durable provider attempt -> observed result -> usage/cost + availability state.

The candidate resolver considers requested/fallback model references, provider credentials, AgentRouter live catalogue when configured, persisted availability state, cooldowns, capability constraints, and routing policy.

No model version is hardcoded into the availability system.

## Availability states
- unknown: no durable observation yet
- healthy: last execution/discovery succeeded
- unavailable: deterministic failure such as missing credential, invalid model, or unsupported model
- cooldown: temporary provider failure, rate limit, or transient service failure

The state is evidence, not an eternal truth. Temporary failures expire through cooldown. Deterministic failures remain unavailable until configuration/discovery or successful execution changes the state.

## Failure semantics
### Safe to skip and continue
- missing credential
- authentication/authorization failure
- model not found
- unsupported model/connection
- provider request rejected before external execution

These are routing events. They must not fail the task when another viable candidate exists.

### Temporary skip
- rate limit
- provider unavailable
- timeout/network failure where the external outcome is known to be not started

Record the failure, continue with another candidate, and apply a bounded cooldown.

### Ambiguous outcome
If an external request may have been accepted, preserve the durable attempt and reconciliation rules. Never create a second external operation merely because a provider became uncertain.

## Durable records
Uden records candidate/model reference, provider/connection, tenant scope, availability state, failure code, last observed time, cooldown time, consecutive failures, and successful observation time.

Execution attempts remain authoritative for what actually ran. Usage records remain authoritative for actual model, tokens, and cost.

## Key invariant
A provider outage is not a task failure.

A task fails only when Uden has exhausted viable candidates, or when the task itself cannot proceed for a non-provider reason.

## Implementation phases
1. Add the availability state table and data-access helpers.
2. Classify provider failures into deterministic, temporary, and ambiguous outcomes.
3. Resolve candidates against durable availability before attempting execution.
4. Persist health/unavailability after each observed provider outcome.
5. Keep ambiguous outcomes on the reconciliation path.
6. Record skipped candidates in execution evidence.
7. Add tests for missing credentials, provider failures, fallback success, cooldowns, and ambiguous outcomes.

## Cost and model identity
Every successful attempt continues to record both the requested model reference and provider-reported actualModel. Cost accounting continues through the existing usage pipeline.

## Non-goals
- hardcoding model versions
- replacing the existing router
- bypassing execution fencing
- retrying ambiguous external side effects
- treating AgentRouter discovery as proof that every discovered model is executable