# Provider connection verification

`POST /api/v1/provider-connections/:connectionId/verify` replaces the manual
activation step for an OAuth profile already provisioned in private SwarmClaw.
It requires a user JWT and exact ownership; grants and platform-admin status do
not authorize verification of someone else's connection. Invalid UUIDs return
400. Missing or non-owned connections return 404; revoked or unsupported-provider
connections return 400. Codex is the only implemented verifier.

The Gateway calls the internal service-key-protected SwarmClaw verification
route for that UUID. The request body is not used to establish authentication.
Clients cannot set `authenticated`, a profile path, tokens or connection status.

```json
{
  "id": "6a5fb5be-ebaf-4aa9-af04-645b335510e6",
  "status": "active",
  "authenticated": true,
  "verificationMethod": "codex_login_status",
  "changed": true
}
```

The normal Gateway response envelope wraps this result in `data`. HTTP status
is 200 for a completed check, including an explicit unauthenticated result.

- Verified ChatGPT login moves pending → active. Rechecking active stays active.
- Missing/logged-out/API-key profiles return authenticated=false and remain or
  become pending. Grants remain stored but cannot execute a pending connection.
- SwarmClaw failure, timeout, malformed/mismatched response or unavailable CLI
  returns 503 without modifying the connection.
- A connection revoked during verification cannot be reactivated.

The status update and audit insertion use one PostgreSQL statement with a row
lock; a failed audit insert rolls back the update. Audit events are
`provider_connection.activated`, `provider_connection.verified`, or
`provider_connection.verification_failed`, with the JWT user as actor. Metadata
contains provider, verification method, boolean outcome and old/new status only.

No migration, new package, OAuth token or filesystem path is needed in Gateway.
This endpoint checks local CLI login readiness. A successful inference remains
necessary to establish model access. It does not implement a Desktop OAuth UI,
device-login orchestration, automatic token revocation or a model selector.

## Deployment and checks

First apply Hermes-Platform overlay 0007 and rebuild/recreate SwarmClaw; then
deploy the Gateway branch. Existing profiles and the manually activated personal
connection are retained. Reverify the current active connection to test without
resetting or revoking it. Test missing profiles with a separately created pending
connection, and test ownership denial using a separate ordinary test user.

Run Gateway TypeScript/build checks and the provider-connections service,
provider-connection policy and SwarmClaw service Jest suites. Run the new SwarmClaw
profile/route tests together with existing private-auth/proxy tests using actual
Next.js dependencies before production build. PostgreSQL atomicity and live
HTTP behavior still require deployment verification.
