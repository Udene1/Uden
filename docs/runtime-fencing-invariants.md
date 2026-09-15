# Runtime fencing invariants

Uden runtime execution is durable state, not a best-effort worker protocol.

## Ownership

A graph execution owner is identified by the pair:

- `execution_owner`
- `execution_version`

A worker may mutate graph/node/runtime state only while both values still match the durable graph lease. Lease expiry or reassignment makes the old worker stale.

## Runtime execution

A runtime execution carries the graph generation and owner that authorized it. These identity fields are immutable after creation. Runtime state may progress forward, but cannot regress into an earlier lifecycle state.

Terminal runtime outcomes (`completed`, `failed`, `timed_out`) are immutable. A later worker cannot rewrite their output, external operation id, error, or terminal timestamp.

## Attempts

Attempts preserve execution history. Their tenant, graph, node, and attempt number cannot be rewritten. Once an attempt is terminal, its outcome and external-operation evidence cannot be changed.

Retries create a new attempt rather than rewriting an old one.

## Recovery

Recovery is allowed only after the original graph generation is no longer live. A recovery lease has its own owner/version and only one recovery worker can claim an abandoned runtime execution at a time.

An abandoned external operation is never assumed to have failed. It remains `possibly_succeeded` or `unknown` until the runtime can reconcile it.

## Required adversarial cases

The runtime test suite must cover:

- stale worker after lease reassignment;
- recovery racing with another recovery worker;
- stale terminal acknowledgement;
- duplicate completion acknowledgement;
- illegal lifecycle regression;
- immutable terminal runtime history;
- immutable attempt identity/history;
- graph terminalization while unresolved runtime side effects exist;
- recovery while the original graph generation is still live.

The authoritative rule is simple: **workers propose state; durable state decides whether the proposal is still authorized.**
