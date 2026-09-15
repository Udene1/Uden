# Uden Dashboard UI Plan

Status: approved planning baseline for the dashboard redesign.

## 1. Product principle

Uden should feel like an AI work environment, not an analytics/admin dashboard. The primary question on every authenticated surface is: **what is the user trying to accomplish, what is Uden doing, and what needs the user's attention?**

The UI must expose durable execution state, approvals, recovery, evidence, and outcomes without requiring the user to inspect developer logs.

No new dashboard feature should introduce a new visual pattern without fitting the design system below.

## 2. Current-state audit

The current dashboard already contains useful product concepts, but the home surface is overloaded. It combines the primary task composer, four usage metrics, starter prompts, latest graph, usage details, recent work, and product capability claims in one long page.

The current global stylesheet also mixes design tokens, reusable component classes, utility-like classes, and page-specific styling. It uses a strong glass/gradient visual language while individual pages/components can independently introduce borders, radii, spacing, and card treatments.

Current structure includes:

- `src/app/dashboard/page.tsx` — authenticated workspace overview.
- `src/components/layout/` — application shell/navigation.
- `src/components/ui/` — reusable UI primitives.
- `src/components/graph/` — execution/graph UI.
- `src/components/charts/` — data visualization.
- `src/app/globals.css` — current global tokens and shared classes.

The redesign should consolidate these into a deliberate system rather than continuing incremental cosmetic changes.

## 3. Information architecture

Primary navigation:

1. **Home** — current work, attention items, and start-work entry point.
2. **Projects** — repositories/workspaces and project context.
3. **Work** — tasks, executions, approvals, recovery, and history.
4. **Knowledge** — connected Drive/email and other durable context sources.
5. **Settings** — account, connections, models, security, and preferences.

Secondary/contextual surfaces:

- Project overview
- Project files
- Git state and changes
- Execution graph
- Execution evidence/events
- Task detail
- Approval/review surfaces
- Usage/cost details

Do not expose every backend capability as a top-level navigation item. Navigation should follow user intent, not service boundaries.

## 4. Home / Work surface

The home screen should answer three questions immediately:

- **What am I working on?**
- **What is Uden doing right now?**
- **What needs my attention?**

Proposed hierarchy:

```text
Home
├── Contextual greeting / workspace identity
├── Primary work composer
├── Active work / attention queue
├── Recent work
└── Optional lightweight workspace health/cost summary
```

The current four-metric KPI strip, starter cards, latest execution card, usage card, and capability footer should not all compete for first-screen attention. Move detailed analytics into Work/Usage surfaces and keep Home focused on action and state.

## 5. Work and execution model

The UI must represent the execution lifecycle explicitly:

```text
Requested
  ↓
Planned
  ↓
Running
  ├── Waiting for approval
  ├── Blocked
  ├── Recovering
  ├── Failed / Unknown
  └── Completed
  ↓
Result + Evidence
```

Important distinctions must remain visible:

- waiting is not failure;
- unknown is not failure;
- recovery is not a new user task;
- completed means the system has the evidence required by the operation;
- approval is an explicit user decision, not a decorative badge.

## 6. Project surface

Projects should be the durable workspace around which coding/build work is organized.

```text
Project
├── Overview
├── Work
├── Files
├── Git
├── Runs / Graphs
└── Activity / Evidence
```

The project view should prioritize current state and next action. Raw implementation metadata belongs behind contextual details.

## 7. Knowledge surface

Connected knowledge should be presented as sources Uden can use, not as separate product silos.

```text
Knowledge
├── Sources
├── Recent context
├── Search / retrieval
└── Connection health
```

Drive, email, repositories, and future sources should share the same source/status vocabulary.

## 8. Design system

### Visual direction

- Calm, technical, premium, and restrained.
- Dark-first, with light theme retained where already supported.
- Reduce gratuitous gradients, glows, and glass effects.
- Prefer clear surfaces and hierarchy over decoration.
- Accent color communicates action/focus, not every heading.
- Status colors are reserved for state semantics.

### Layout

- Establish one page container and consistent content width.
- Use a small spacing scale rather than arbitrary Tailwind values everywhere.
- Standardize page header, section header, content grid, and responsive behavior.
- Avoid nested cards where a flat section would communicate the same information.

### Typography

- One primary sans family and one mono family for identifiers/log-like values.
- Establish explicit display, heading, body, label, caption, and metadata sizes.
- Use weight and spacing to establish hierarchy before color.

### Surfaces

Standardize a small set:

- page background
- primary surface
- secondary/inset surface
- elevated surface/modal
- divider/border

Do not create a new card treatment for every page.

### Controls

Standardize:

- primary/secondary/ghost/danger buttons
- text inputs
- textareas
- selects
- segmented controls
- tabs
- menus
- dialogs
- confirmation/approval controls

Interactive controls must have consistent hover, focus, disabled, loading, and error states.

### Status

One semantic status component should be used consistently for task, graph, connection, approval, and recovery state. Status text must be human-readable; internal state names can remain in details.

### Data display

Tables, metrics, timelines, graphs, and event histories should share the same typography, spacing, borders, and responsive rules.

## 9. Core components to consolidate

Target reusable primitives:

- AppShell
- Sidebar / MobileNavigation
- PageHeader
- SectionHeader
- Button
- IconButton
- Input / Textarea / Select
- Tabs
- Menu
- Dialog
- Card / Surface
- StatusBadge
- Metric
- EmptyState
- ErrorState
- LoadingSkeleton
- Timeline / EventList
- ApprovalPanel
- ExecutionState
- WorkItem
- ProjectSummary

Existing components should be reused or refactored before creating replacements.

## 10. Responsive rules

Desktop and mobile are the same product, not separate designs.

- Desktop: persistent navigation and multi-column work surfaces where useful.
- Tablet: collapse secondary columns before shrinking primary content excessively.
- Mobile: bottom/action navigation only where it improves task completion; preserve primary composer and active-work visibility.
- Never hide execution state or approval requirements solely because of viewport size.

## 11. Accessibility and interaction quality

Every interactive element must have:

- keyboard access;
- visible focus state;
- meaningful accessible name;
- disabled/loading semantics;
- sufficient contrast;
- reduced-motion behavior where animation exists.

Do not use color alone to communicate execution or approval state.

## 12. Implementation sequence

### Batch 1 — Foundation

- Define tokens and spacing scale.
- Clean up `globals.css`.
- Standardize shared UI primitives.
- Standardize application shell/navigation.
- Establish page/container primitives.
- Add visual regression/verification expectations.

### Batch 2 — Home

- Rebuild `/dashboard` around work and attention.
- Keep primary composer dominant.
- Introduce active-work/attention surface.
- Reduce dashboard analytics clutter.
- Preserve existing real data/API behavior.

### Batch 3 — Work

- Redesign tasks/history.
- Redesign task detail.
- Make execution state and evidence first-class.
- Surface approval/recovery/unknown states clearly.

### Batch 4 — Projects and Git

- Project overview.
- Files/Git/change surfaces.
- Branch/commit/PR state.
- Safe action/approval presentation.

### Batch 5 — Graphs and evidence

- Execution graph visual hierarchy.
- Event/evidence timeline.
- Recovery and fencing visibility.
- Result/evidence presentation.

### Batch 6 — Knowledge and Settings

- Connected sources.
- Connection health.
- Models/preferences/security.

### Batch 7 — Polish and verification

- Mobile pass.
- Accessibility pass.
- Loading/error/empty states.
- Browser visual verification.
- Remove obsolete CSS/components.

## 13. Non-negotiable implementation constraints

- No mock data introduced to make the UI appear complete.
- No throwaway redesign that bypasses the real API/state model.
- No backend behavior changes merely to satisfy visual layout.
- Do not duplicate business logic into presentation components.
- Preserve truthful execution states.
- Verify every redesigned surface against real data and failure states.
- Prefer deleting obsolete UI over maintaining two competing systems.

## 14. Definition of done

The redesign is complete when:

1. A new user can understand where to start without studying the navigation.
2. A returning user can immediately see active work and required attention.
3. Execution state is understandable without opening developer logs.
4. High-risk actions and approvals are unmistakable.
5. Completed work exposes outcome/evidence rather than only a success badge.
6. Desktop and mobile share the same information architecture.
7. Shared components have one consistent visual language.
8. Loading, empty, error, blocked, unknown, recovering, and approval states are intentionally designed.
9. Browser verification is performed on the actual deployed/preview build.
10. The old visual patterns and obsolete components are removed rather than left as parallel systems.
