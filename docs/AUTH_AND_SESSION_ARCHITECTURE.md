# Uden Authentication and Session Architecture

Status: **Architecture plan — implementation follows after review**

## 1. Decision

Uden will use the **engine as the single authentication and session authority** for every client.

The web dashboard will stop using NextAuth. It will become a normal Uden client, like Desktop and Mobile, and will authenticate against the Cloudflare engine.

The Cloudflare Worker remains authoritative for:

- tenant identity
- client/session identity
- authentication
- session lifecycle and revocation
- tenant membership and permissions
- execution principal
- ownership / lease / fencing semantics
- durable application state

Vercel is only the hosting surface for the web client. It must not become a second identity authority.

## 2. Client model

All clients use the same engine authority:

```
                    Uden Engine (Cloudflare)
                            |
             +--------------+--------------+
             |              |              |
           Desktop         Mobile          Web
             |              |              |
             +--------------+--------------+
                            |
                    Uden Auth / Session
                            |
                    Tenant + Principal
                            |
              Permissions / Ownership / Lease
                            |
                       Fencing
                            |
                   Tasks / Graph / State
```

Client-specific UI and capability restrictions remain client concerns. Authentication identity does not.

Supported client identifiers:

- `desktop`
- `mobile`
- `web`
- `api`

## 3. Credential model

Uden will have two distinct credential layers.

### 3.1 API key — bootstrap / long-lived credential

The existing `sk_...` API key remains the initial tenant credential.

It is used to:

- create a tenant (registration)
- authenticate a client and establish a session
- support explicit API/non-interactive access where appropriate
- recover a client session

The raw API key is never stored in plaintext in D1. Only its SHA-256 hash is stored.

### 3.2 Engine session — runtime credential

A successful API-key authentication creates a Uden session:

```
us_<random-secret>
```

The raw session token is returned only at session creation.

D1 stores only its SHA-256 hash.

Every authenticated application request uses the session token as the runtime credential:

```
Authorization: Bearer us_...
```

The engine resolves the session to:

- tenant
- subject / execution principal
- client type
- creation time
- expiry
- revocation state

The session, not the API key, is the normal runtime identity of a connected client.

## 4. Registration contract

Registration is authoritative on the engine.

### Request

```
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "...",
  "email": "...",
  "client": "web|desktop|mobile|api"
}
```

### Response

```
201 Created

{
  "tenant": { ... },
  "api_key": "sk_...",
  "session_token": "us_...",
  "expires_at": "...",
  "subject": "tenant:<tenant-id>",
  "client": "web"
}
```

Registration must be treated as one bootstrap operation: tenant creation and initial session creation either both succeed or the operation fails without leaving an unusable client state.

The exact transactional/compensating behavior must be implemented so that a tenant cannot be successfully reported to the client while its initial session is missing.

## 5. Login / session establishment

Existing tenants authenticate with their API key:

```
POST /api/v1/auth/session
Content-Type: application/json

{
  "apiKey": "sk_...",
  "client": "web|desktop|mobile|api"
}
```

Successful response:

```
201 Created

{
  "tenant": { ... },
  "session_token": "us_...",
  "expires_at": "...",
  "subject": "tenant:<tenant-id>",
  "client": "web"
}
```

The API key is therefore a bootstrap credential, not the identity carried on every ordinary task/graph/state request.

## 6. Session validation

Authenticated engine routes use the existing authentication middleware.

Resolution order:

1. Read `Authorization: Bearer <credential>`.
2. If credential is a Uden session (`us_`):
   - hash it
   - find an active, unexpired, non-revoked session
   - resolve tenant
   - resolve session subject/principal
   - attach tenant and principal to the request context
3. If credential is an API key (`sk_`):
   - preserve compatibility for explicit API-key clients
   - hash it
   - resolve tenant
   - use the established API-key execution principal
4. Reject invalid, expired, or revoked credentials with `401`.

The session path must not silently downgrade into API-key identity.

## 7. Principal and authorization model

Authentication answers:

> Who is making this request?

Authorization answers:

> What may this principal do inside this tenant?

The authenticated session subject becomes the engine execution principal.

The principal must be resolved by the engine. A client may not supply an arbitrary subject/display name to obtain permissions.

Tenant membership remains authoritative in `tenant_members`.

The initial tenant owner principal should be stable and deterministic:

```
tenant:<tenant-id>
```

A session for a tenant owner therefore resolves to the corresponding tenant membership rather than to a synthetic client-local identity.

This keeps permissions, audit records, execution principals, and sessions connected.

## 8. Session lifecycle

Required operations:

### Create

Created during:

- registration
- API-key login
- explicit re-authentication

### Validate

Performed on every authenticated request.

### Revoke

```
POST /api/v1/auth/logout
Authorization: Bearer us_...
```

Revocation records `revoked_at`.

### Expire

Expired sessions are rejected even if their token hash remains in D1.

### Rotation / recovery

A client that has lost its session but still possesses the valid API key can establish a new session.

API-key rotation is a separate credential operation. Its interaction with existing sessions must be explicit and tested; by default, rotating an API key must not unexpectedly destroy an unrelated active session unless the security policy deliberately requires it.

## 9. Session storage

D1 is the authoritative session store.

A session record contains at minimum:

- id
- tenant_id
- subject
- token_hash
- client
- created_at
- expires_at
- revoked_at

Raw session tokens are never persisted.

KV must not become a second source of truth for authentication sessions.

KV may continue to serve its existing appropriate roles for ephemeral/runtime coordination, but session validity is determined from D1.

## 10. Web dashboard

NextAuth will be removed.

The dashboard will use the same engine contracts as other clients:

```
Browser
  |
  | register/login
  v
Cloudflare Engine
  |
  | session
  v
Web client
  |
  | authenticated requests
  v
Cloudflare Engine
```

The dashboard must not require:

- NextAuth JWTs
- a Vercel-side identity database
- a Vercel-side tenant authority
- a Vercel API proxy for ordinary engine requests

A Vercel route may remain temporarily for compatibility during migration, but the target architecture is browser → engine directly.

## 11. Web session transport

The web client must not put long-lived API keys into ordinary browser storage.

Preferred target:

- API key is used only during explicit registration/login.
- Engine establishes a short/medium-lived session.
- Session is maintained using a secure browser mechanism.
- Prefer an HttpOnly, Secure cookie scoped to the engine origin if CORS/cookie policy permits it.
- Otherwise use an in-memory session token with explicit re-authentication/recovery rather than persistent localStorage storage.

If cookie-based sessions are used, the engine must implement the required CORS and CSRF protections. A cross-origin browser session must never rely on permissive wildcard credential configuration.

Desktop and Mobile may store their session credential in platform-appropriate secure storage.

## 12. Logout

Logout is authoritative at the engine.

Clients call:

```
POST /api/v1/auth/logout
```

The engine revokes the session.

The client then clears its local session state.

Logout must not merely clear a UI token while leaving the engine session active.

## 13. Client isolation

A session belongs to exactly one:

- tenant
- subject
- client type

The client type is metadata and policy context, not a substitute for authorization.

A web session cannot be used to impersonate another tenant.

A session from one tenant must never resolve to another tenant even if a caller manipulates IDs in request bodies.

Tenant identity always comes from authenticated engine context.

## 14. Ownership, leases, and fencing

Authentication/session and runtime coordination are related but distinct layers.

```
Authentication
  -> tenant
  -> subject / execution principal

Authorization
  -> tenant membership
  -> permissions

Runtime coordination
  -> ownership
  -> lease
  -> fencing token

Execution
  -> task / graph / worker
  -> durable state
```

A valid session establishes identity. It does not by itself grant ownership of a worker, graph execution, or lease.

Lease and fencing checks remain authoritative at the existing runtime boundaries.

Where execution records contain an execution principal, that principal must originate from authenticated engine identity rather than a caller-supplied value.

## 15. Auditability

Security-sensitive operations should retain the authenticated subject/principal:

- login/session creation
- logout/revocation
- tenant changes
- API-key rotation
- permission changes
- task/graph operations where audit records already exist

Audit records must not use a generic identity when a real authenticated session principal is available.

## 16. Compatibility and migration

Migration must be incremental.

### Phase 1 — establish engine contract

Confirm and test:

- registration returns tenant + API key + session
- API-key session creation
- session validation
- session expiry
- session revocation
- tenant/principal resolution
- permission resolution
- API-key compatibility

### Phase 2 — harden persistence

Confirm:

- `auth_sessions` migration exists in every required environment
- token hashes only
- indexes support session lookup
- expired/revoked sessions are rejected
- tenant/session creation cannot produce the original "registration succeeded but no engine session" state

### Phase 3 — Desktop/Mobile

Update existing clients to use the engine session contract consistently.

They should:

1. obtain/recover API key
2. establish a session
3. use the session for normal requests
4. recover by re-authenticating when necessary
5. logout through the engine

### Phase 4 — Web

Remove NextAuth.

Implement web registration/login/session/logout against the same engine contract.

Remove unnecessary Vercel authentication/proxy dependencies.

### Phase 5 — end-to-end verification

Verify the same tenant can:

1. register through web
2. authenticate through web
3. authenticate through desktop
4. authenticate through mobile
5. see the same authoritative tenant state
6. perform permitted operations
7. be rejected after session revocation
8. remain isolated from another tenant

## 17. Security invariants

These must remain true:

1. **Cloudflare engine is the authentication authority.**
2. **D1 is the authoritative session store.**
3. **Raw API keys and session tokens are never stored in D1.**
4. **Session tokens are never treated as tenant IDs.**
5. **Tenant ID comes from authenticated session/API-key resolution, never from an untrusted request body.**
6. **Execution principal comes from authenticated engine identity.**
7. **Permissions are resolved from authoritative tenant membership.**
8. **A revoked/expired session cannot authenticate.**
9. **One tenant cannot access another tenant's resources.**
10. **NextAuth is not part of the final authentication architecture.**
11. **Desktop, Mobile, and Web use the same engine authority.**
12. **API keys remain supported as bootstrap credentials and explicit API credentials where required.**

## 18. What we will not do

We will not:

- merge PR #46 wholesale
- add another independent auth database
- make Vercel the identity authority
- keep NextAuth merely because it already works around the problem
- create separate authentication systems for web, desktop, and mobile
- put raw session tokens into D1
- make KV the authoritative session database
- bypass tenant membership/permission checks because a session is valid
- use client-supplied identity fields as authorization
- patch the registration UI until the engine contract is understood and tested

## 19. Relationship to PR #46

PR #46 contains important pieces of the intended direction:

- `auth_sessions`
- `us_` session tokens
- session-aware middleware
- client types
- session creation during tenant registration
- Desktop/Mobile session establishment
- engine execution principal derived from session identity

However, #46 must be treated as **reference material, not a change set to merge wholesale**.

Its implementation caused the Cloudflare tenant-creation smoke test to fail, and its web changes were coupled to the temporary NextAuth/dashboard implementation.

We will reconstruct the useful architecture deliberately and reimplement/test it against the currently authoritative backend.

## 20. Definition of done

Authentication is complete only when all of the following are true:

- The engine owns registration, login, sessions, and logout.
- Web, Desktop, and Mobile can all establish engine sessions.
- Normal authenticated requests use engine session identity.
- API-key compatibility remains deliberate and tested.
- Session persistence, expiry, and revocation work against production D1.
- Tenant membership and permissions resolve from authenticated identity.
- Ownership/lease/fencing continue to receive the correct authenticated principal.
- Web no longer depends on NextAuth.
- Web can communicate directly with the Cloudflare engine.
- A real end-to-end test demonstrates shared tenant identity across clients.
- No client reports successful registration unless it has a usable authenticated session (unless the API caller explicitly requested API-key-only registration).

## 21. Implementation order

We will implement in this order:

1. Verify current schema and existing backend auth/session code.
2. Reconcile the plan with the actual D1 schema, middleware, permissions, leases, ownership, and fencing code.
3. Add/fix engine session persistence and contracts.
4. Add production-safe engine tests.
5. Update Desktop/Mobile without breaking existing API-key compatibility.
6. Remove NextAuth from the dashboard.
7. Make Web a direct engine client.
8. Remove obsolete Vercel authentication/proxy code.
9. Run cross-client production smoke tests.
10. Only then consider further authentication features such as password/email identity, refresh-token families, device management, or additional providers.

**Principle:** establish one correct Uden identity/session model first. Do not add authentication features until the shared engine contract is proven.
