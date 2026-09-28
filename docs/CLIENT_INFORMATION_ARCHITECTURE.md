# Uden Client Information Architecture

## Principle

Uden is one operating system with one information architecture across web, desktop, and mobile.

The primary surface is **Work**: a clean place to state an objective and see the current execution.

Connectors and advanced system capabilities are **contextual capabilities**, not permanent dashboard content.

## Navigation

### Primary
- Work
- Tasks
- Projects

### Investigation
- Graphs
- Execution history / Analytics

### Connections
A dedicated Connections area contains integrations such as:
- GitHub
- Origin / Cursor workspace
- Google Workspace
  - Gmail
  - Drive
  - Calendar
- Other future connectors

These must not occupy the main workspace simultaneously.

### System
- Settings
- Account / Sign out

## Main workspace

The default screen should remain focused:

1. What do you want Uden to get done?
2. Start Work
3. Current active work
4. Attention items such as approvals or failures
5. Recent work

When an execution is selected, its execution state, evidence, and failure artifacts become the relevant context.

## Desktop

Desktop is the power client, but uses the same information architecture:
- collapsible left navigation
- Work as the default surface
- connectors behind Connections
- graphs/history in their own views
- local workspace and Git capabilities shown when relevant rather than permanently stacked under the composer

Desktop can expose deeper controls than web/mobile without turning the home screen into an admin dashboard.

## Mobile

Mobile uses the same sections through a drawer:
- Work
- Tasks
- Projects
- Graphs / History
- Connections
- Settings

The mobile home remains focused on starting and monitoring work.

## Cross-client rule

The backend state is shared. Clients differ in presentation and local capabilities, not in the user's conceptual model.

**One Uden system. One information architecture. Multiple client surfaces.**
