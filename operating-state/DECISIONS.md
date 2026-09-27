# Durable Decisions

## 2026-09-20 — Evidence-first commercial model

We stopped treating the offer as predetermined. A lead is not automatically an engineering lead, Cashflow OS lead, or Compflow lead. Investigation determines the problem and therefore the offer.

## 2026-09-20 — Engineering is a capability

Software engineering remains a major capability, but it should not constrain what we sell. Custom engineering, automation, productized software, Compflow, Cashflow OS, or another service are all valid depending on evidence.

## 2026-09-20 — State must be externalized

Continuity should not depend solely on model memory. Durable working state belongs in inspectable artifacts that another agent can read.

## 2026-09-20 — Cognitia gets less hand-holding

The research process should increasingly remove prior-result guidance and let Cognitia fail when it genuinely lacks a capability. Record what happened rather than explaining away failures.

## 2026-09-27 — One backend, all clients

The Cloudflare Worker is the backend source of truth for Uden. Web uses the dashboard's same-origin proxy; native desktop and mobile clients connect directly to the production Worker by default. Client-specific environment overrides remain available for development and alternate deployments. Do not create separate client-side execution backends.
