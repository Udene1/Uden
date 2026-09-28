# Uden Model Connections

Uden separates the **model** from the **connection used to reach it**.

Existing model references remain unchanged and use native provider APIs:

- `gpt-4o` → OpenAI native
- `claude-sonnet` → Anthropic native
- `deepseek-v3` → DeepSeek native
- `gemini-2.5-pro` → Google native

A connection-qualified reference can explicitly route the same model through AgentRouter:

- `agentrouter/gpt-4o` → AgentRouter OpenAI-compatible API
- `agentrouter/deepseek-v3` → AgentRouter OpenAI-compatible API
- `agentrouter/claude-sonnet` → AgentRouter Anthropic-compatible API

AgentRouter uses:

- OpenAI-compatible base URL: `https://co.agentrouter.org/v1`
- Anthropic-compatible base URL: `https://co.agentrouter.org`

The credential is `AGENTROUTER_API_KEY`. Native provider credentials remain independent.

## Why the connection is part of the model reference

The selected connection is persisted with the model reference, so durable execution recovery does not silently change an unresolved external attempt from native provider access to a gateway (or vice versa).

## Adding future gateways

New gateways should be added as another connection adapter rather than replacing native providers. A future NVIDIA connection, for example, can expose its own credential/base URL while the underlying model remains identifiable as the model provider.

The same principle applies to additional OpenAI-compatible or Anthropic-compatible gateways.

## Current limitation

Gemini remains native-only until a verified AgentRouter Gemini-compatible route is intentionally added. Uden rejects `agentrouter/gemini-*` rather than accidentally sending an AgentRouter credential to Google's native endpoint.

## Deployment

GitHub Actions publishes `AGENTROUTER_API_KEY` to the production Worker when the repository secret exists. Existing provider secrets are still published independently.
