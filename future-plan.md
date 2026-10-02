# Uden Future Plan

> **Status:** Future roadmap / architectural direction  
> **First real pilot:** Cashflow OS  
> **Core thesis:** Uden is the persistent operating memory and execution layer for AI working on real objectives. Models are disposable; durable work state is not.

---

## 1. Direction

Uden should not become another generic AI assistant, chatbot, or model provider.

Frontier models will continue to improve and models should remain interchangeable.

Uden's durable value should live around the models:

- objectives
- persistent state
- evidence and provenance
- decisions and their reasons
- actions and outcomes
- temporal history
- recovery
- permissions and controlled execution
- organizational memory
- model-independent work state

The fundamental loop is:

```
Objective
   ↓
State
   ↓
Evidence
   ↓
Decision
   ↓
Action
   ↓
Outcome
   ↓
Updated State
   ↺
```

Uden should remember not only **what happened**, but **why it happened, what evidence existed, what was attempted, and what reality showed afterward**.

---

## 2. First pilot: Cashflow OS

Cashflow OS should be Uden's first serious real-world pilot.

This is not a demo environment. It is an existing operational commercial system with real leads, contacts, activities, messages, replies, bounces, skips, follow-ups, commercial state, and outcomes.

Uden will connect to Cashflow OS through MCP.

### Boundary

```
                         UDEN
          ┌──────────────────────────────┐
          │ Objectives                   │
          │ Working state                │
          │ Evidence                     │
          │ Decisions + reasoning        │
          │ Planning                     │
          │ Memory                       │
          │ Agent execution              │
          │ Recovery                     │
          └──────────────┬───────────────┘
                         │
                       MCP
                         │
                         ▼
                    CASHFLOW OS
          ┌──────────────────────────────┐
          │ Leads                        │
          │ Contacts                     │
          │ Messages                     │
          │ Activities                   │
          │ Commercial state             │
          │ Outcomes                     │
          └──────────────────────────────┘
```

Cashflow OS remains authoritative for its own operational records.

Uden becomes the intelligence, objective, memory, planning, and execution layer around that work.

Do **not** make Cashflow OS dependent on Uden's internal database.

---

## 3. First real objective

The pilot should eventually operate against a real objective such as:

> **Generate legitimate commercial opportunities and move them toward cash.**

Uden should understand:

1. What the objective is.
2. What has already happened.
3. Which records are actionable.
4. Which records must be skipped and why.
5. What evidence supports those decisions.
6. What previous outreach occurred.
7. What responses changed the state.
8. What the next useful action is.
9. What action was actually performed.
10. What happened afterward.
11. What should be remembered for future work.

The test is not whether an agent can complete isolated tasks.

The test is whether Uden can enter an existing, messy operational environment, understand the current state, act safely, and preserve continuity over time.

---

## 4. Persistent work state

Uden should evolve toward first-class persistent objects for:

- Objectives
- Projects
- Tasks
- Observations
- Evidence
- Claims
- Decisions
- Assumptions
- Actions
- Outcomes
- Failures
- Contradictions
- Constraints
- Permissions
- Agents/actors
- Sources
- Relationships
- State transitions

The system must distinguish:

```
What we currently believe
```

from:

```
What we previously believed
and why it changed
```

---

## 5. Evidence and provenance

AI-generated reasoning must not become indistinguishable from observed reality.

Important state should preserve provenance:

```
Claim
 ├── supporting evidence
 ├── contradicting evidence
 ├── source
 ├── timestamp
 ├── actor/model
 ├── uncertainty
 └── resulting decision
```

Uden should be able to answer:

- Why does Uden believe this?
- What evidence supports it?
- What contradicts it?
- What caused this state to change?

Valid states include:

```
UNKNOWN
UNVERIFIED
CONTRADICTED
INCONCLUSIVE
SUPPORTED
OBSERVED
```

Uden should not manufacture certainty because a model produced a confident sentence.

---

## 6. AI is essential, but state is durable

AI should interpret and reason over persistent state.

Models should be able to:

- understand messy information
- extract observations and claims
- connect evidence
- identify contradictions
- formulate hypotheses
- plan actions
- investigate missing information
- reason over historical state
- propose decisions
- execute approved actions
- explain decisions
- update state after outcomes

The model is an intelligence engine, not the authoritative store of reality.

---

## 7. Disposable models

Uden already treats models as interchangeable. Preserve and deepen that design.

Conceptually:

```
                UDEN STATE
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
       Model A   Model B   Model C
          │         │         │
          └─────────┼─────────┘
                    ▼
             Common work state
```

A model can be replaced without destroying accumulated work.

Model disagreement can also become useful state:

```
Question
   ↓
Model A conclusion
Model B conclusion
Model C conclusion
   ↓
Disagreement
   ↓
Evidence / investigation
   ↓
Updated state
```

Uden should not become dependent on one provider.

---

## 8. Temporal memory

Uden should eventually understand change over time.

It should answer questions such as:

- What did we know last week?
- What did we believe then?
- What changed?
- What evidence changed it?
- What did we try?
- What failed?
- Which assumptions repeatedly failed?
- Which strategies actually produced outcomes?

This is more valuable than ordinary conversation history.

---

## 9. Outcome learning

Meaningful actions should eventually have observable outcomes.

```
Hypothesis
   ↓
Action
   ↓
Expected outcome
   ↓
Observed outcome
   ↓
Comparison
   ↓
State update
```

For Cashflow OS:

```
Hypothesis:
This company is worth contacting.

Action:
Send outreach.

Expected:
Relevant response.

Observed:
Bounce / no response / rejection / interest / opportunity.

Result:
Update commercial state and future decisions.
```

The system should preserve what reality demonstrated, not merely call a new model response "learning."

---

## 10. Safe execution

Uden should distinguish between:

- reading state
- reasoning
- proposing an action
- requesting approval
- executing an action
- recording an outcome

For external systems:

```
Research
   ↓
Evidence / hypothesis
   ↓
Decision
   ↓
Approval when required
   ↓
Auditable write
   ↓
Outcome
```

Model speculation must never silently become authoritative operational state.

---

## 11. MCP as a first-class boundary

MCP should be the bridge between Uden's persistent intelligence and external operational systems.

For the Cashflow pilot, Uden should eventually be able to:

- search/read leads
- inspect contact history
- inspect activities
- inspect messages
- understand commercial state
- identify next actions
- research records
- perform permitted actions
- record outcomes
- preserve auditability

Cashflow OS remains authoritative for its own records.

Uden maintains the broader objective and intelligence context.

---

## 12. Recovery and continuity

A core Uden capability should be:

> **If an agent, model, process, browser, deployment, or task fails, another agent can continue without starting over.**

A future agent should be able to enter a project and understand:

```
Objective
Current state
Completed work
Pending work
Known constraints
Evidence
Previous decisions
Failed attempts
Open questions
Next recommended action
```

Recovery should come from durable state, not hidden context.

---

## 13. Uden's real job

The long-term goal is not:

> Make Uden the smartest model.

It is:

> **Make Uden the system that knows what an organization is trying to accomplish, what has happened, what is known, what is uncertain, what has been tried, and what should happen next.**

Models provide intelligence.

Uden provides continuity.

External systems provide operational reality.

```
Models
  ↓
Reasoning

Uden
  ↓
Persistent objectives + state + evidence + memory + execution

External systems
  ↓
Reality / authoritative records
```

---

## 14. Development strategy while Uden is messy

Uden is currently still messy. That is acceptable.

The immediate priority is **not** to implement every capability in this document.

The priority is to continue finishing Uden's production foundations while using Cashflow OS for real end-to-end testing.

The development loop should be:

```
Finish production foundation
        ↓
Connect to Cashflow OS
        ↓
Run real work
        ↓
Observe failures
        ↓
Fix Uden
        ↓
Run real work again
        ↓
Measure continuity
        ↓
Expand capability
```

Do not build abstractions merely because they sound elegant.

Prefer capabilities exposed by actual failures and requirements during real use.

---

## 15. Success criteria

### Milestone 1 — Continuity

Uden can operate on Cashflow OS over an extended period without losing the objective.

### Milestone 2 — Transferable work state

A new agent/model can enter the work and continue correctly using Uden's durable state.

### Milestone 3 — Evidence-backed action

Uden can explain why an action is appropriate using evidence and historical state.

### Milestone 4 — Closed loop

Uden can execute through the appropriate external system, record the outcome, and incorporate that outcome into future decisions.

### Milestone 5 — Generalization

The same architecture works on other real systems without rebuilding Uden around each domain.

---

## 16. Long-term expansion

If the Cashflow OS pilot works, the same architecture can support:

- engineering projects
- software repositories
- research
- operations
- customer relationships
- sales
- organizational decision-making
- other connected business systems

The domain can change.

The underlying problem remains:

> **How can AI work on real objectives over long periods while preserving state, evidence, decisions, actions, outcomes, and continuity?**

That is the problem Uden should own.

---

## 17. Guiding principles

### Reality over generated text
Observed state and evidence outrank model prose.

### State over context windows
Important work must survive beyond a conversation.

### Continuity over novelty
The system should remember previous work rather than repeatedly rediscovering it.

### Models are disposable
Uden should not depend on one provider or model.

### External systems remain authoritative
Uden should not silently replace the systems it connects to.

### Actions should be auditable
Important decisions and writes need traceability.

### Uncertainty is valid state
Unknown is better than invented certainty.

### Outcomes matter
An action is incomplete until its result can be incorporated into state.

### Build from real failures
Cashflow OS should expose where Uden's architecture is insufficient.

### Do not confuse complexity with capability
The goal is reliable preservation and advancement of real work, not maximum feature count.

---

# Final direction

Uden should become:

> **A persistent operating layer for AI doing real work — where models can change, agents can fail, conversations can end, and yet the objective, evidence, decisions, actions, outcomes, and organizational memory continue.**

Cashflow OS is the first proving ground.

The immediate job is to make Uden reliable enough to operate there.

The future job is to determine whether the same underlying system can make AI genuinely persistent across many kinds of real work.
