# MEMORY.md — Sentinel

## Core Business Context
- **Company:** Forged Financial — life insurance operations + AI automation
- **Agency:** Part of one of the fastest-growing life insurance agencies ever ($100K/month → $10M/month in under 1 year)
- **Boss's role:** Systems builder — designing and building the infrastructure that automates and scales the agency
- **End goal:** Build for Forged Financial first, then package and scale to other insurance agencies

## Key Systems (What I Inspect)
- **YN-CRM:** Custom CRM dashboard (single-file HTML monolith, 11,221 lines). Lives at ForgedFinancial/YN-CRM on GitHub. Deployed via Cloudflare Pages at yncrm.pages.dev
- **Forged-OS:** React + Vite + Tailwind multi-agent dashboard. Lives alongside YN-CRM at /forged-os/. In development.
- **VPS:** Ubuntu 24.04, IP 76.13.126.53, Tailscale SSH. Runs OpenClaw, sync server, agent workspaces.
- **Cloudflare Worker proxy:** forged-sync.danielruh.workers.dev — proxies frontend requests to VPS (solves self-signed cert)

## Failure Pattern Library

### Categories
2. **Carrier API Failures** — timeout behaviors, format inconsistencies, auth token expiry
4. **Compliance Gaps** — automated communication violations, data privacy, consent tracking
5. **Scale Bottlenecks** — single-tenant assumptions, hardcoded limits, memory leaks under load
6. **Security Vulnerabilities** — credential exposure, injection points, access control gaps
7. **Frontend Issues** — state management bugs, race conditions, error boundary gaps
8. **Integration Failures** — webhook reliability, API versioning, retry logic

### Known Patterns
- [To be filled as inspections reveal patterns]

### Pattern Template
```
**Pattern Name:**
**Category:**
**Severity:** CRITICAL / HIGH / MEDIUM / LOW
**Description:**
**Detection Method:**
**Fix Approach:**
**First Seen:** [date]
**Occurrences:** [count]
```

## Inspection History
- [To be filled as inspections are completed]

## Security Baseline
- All API calls from frontend must go through Cloudflare Worker proxy (never direct to VPS)
- Credentials must NEVER appear in: code, logs, memory files, commit history, error messages
- Self-signed SSL on VPS — direct browser connections will fail (by design)
- Agent workspace files are NOT secure storage — no secrets in MEMORY.md or daily logs

## Insurance Sales Lifecycle (What I Validate Against)
Lead Generation → Contact/Qualify → Appointment Set → Quote → E-App → Underwriting → Issued → Delivery → Service → Renewal
- Every build I inspect must correctly handle the stage(s) it touches
- Edge cases to always check: stage transitions, data handoffs between stages, what happens when a lead stalls or falls out of the pipeline

## Quality Metrics
- [To be filled as inspection data accumulates]
- Track: pass rate, common failure categories, time to fix, recurring issues
