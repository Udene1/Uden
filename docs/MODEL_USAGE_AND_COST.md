# Model Usage & Cost Telemetry

Uden records model execution as durable evidence.

## Recorded identity

Each model attempt keeps both:

- `model`: the model Uden requested/routed to.
- `actual_model`: the model identifier returned by the provider when available.
- `provider`: native provider or AgentRouter.
- `request_id`: provider request identifier when available.

This distinction matters for routed services such as AgentRouter, where the requested model and the provider-reported model are the authoritative execution facts.

## Recorded usage

For every completed model attempt Uden records:

- input/prompt tokens
- output/completion tokens
- cached input tokens when exposed
- reasoning tokens when exposed
- latency at the provider boundary
- execution status
- start/completion timestamps
- quality result
- escalation reason when applicable

## Cost calculation

Cost is calculated from the **actual model when its pricing is known**.

The usage record stores the pricing snapshot used for the calculation:

- pricing model
- pricing source
- input price per million tokens
- output price per million tokens
- calculated cost in cents

If Uden does not have a trustworthy price for the actual model, it records `pricing_source=unavailable` and does not invent a cost.

AgentRouter usage can therefore be recorded immediately even when Uden does not yet have a local price for a newly discovered model. AgentRouter's own billing remains the external billing authority.

## Durable execution

Graph attempts and usage records are fenced by the execution lease. This prevents an abandoned or stale executor from writing model usage against a newer execution.

Usage records are also idempotent by attempt ID.

## Aggregation

Tenant cost can be aggregated by:

- month
- task
- execution graph
- actual model
- provider

The existing monthly budget uses persisted usage records, so model execution becomes part of the same durable economic state as the task.

## Important invariant

Never infer the actual model from the requested model after execution.

The provider response is authoritative whenever it supplies an actual model identifier.
