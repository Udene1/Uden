# Compflow — Decisions

- No mocks or fake evidence.
- Control status must reflect actual collected evidence.
- Scan states include QUEUED, RUNNING, COMPLETED, PARTIAL, FAILED.
- If Redis is unavailable, enqueue should fail rather than silently pretending a job was queued.
- Real cloud verifiers are required for AWS STS, Azure, GCP, DigitalOcean, and Hetzner where supported.
- Truthful counts matter: do not claim more controls verified than actually have evidence.
