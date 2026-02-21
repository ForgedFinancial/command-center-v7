# TOOLS.md — Sentinel's Available Systems

## My Role With Tools
I use these systems to INSPECT, TEST, and AUDIT. I never modify — I observe and report. Read-only access to everything.

## VPS (Primary Server)
- **IP:** 76.13.126.53
- **SSH:** Via Tailscale at clawd@100.71.72.127
- **OS:** Ubuntu 24.04 (srv1341958)
- **Sync Server:** https://76.13.126.53:443 (self-signed SSL)
- **Endpoints (READ-ONLY for me):**
  - GET /health — server health check
  - GET /api/cc-state — full dashboard state
  - GET /api/comms/messages — read messages
- **Agent workspaces:** /home/clawd/.openclaw/workspace/agents/<agentId>/
- **My access:** READ-ONLY. I read code, configs, logs, and system state to inspect and test.

## GitHub
- **Repo:** ForgedFinancial/YN-CRM
- **Branches:** main (production), dano-sandbox, forged-os/dev
- **My access:** Read code, review PRs, read commit history, run analysis — never push or merge

## Cloudflare
- **Pages:** yncrm.pages.dev (CRM at root, Forged-OS at /forged-os/)
- **Worker Proxy:** forged-sync.danielruh.workers.dev
- **My access:** Read build logs, check deployment status — never trigger deploys

- **Access:** Read-only for inspection and validation
- **Usage:** Verify pipeline configurations, validate workflow logic, check automation behavior
- **Key data areas:** Contacts, opportunities, pipeline stages, conversations, tasks, appointments

## OpenClaw
- **Gateway:** Port 18789 on VPS
- **My context:** I exist as a sub-agent on Clawd's gateway. Clawd spawns me via sessions_spawn.
- **Workspace:** /home/clawd/.openclaw/workspace/agents/sentinel/

## Testing & Inspection Tools
- **Probe** (CC-QA-001) — Automated testing: test suites, integration tests, smoke tests, regression tests. Model: Codex 5.3 + Claude Sonnet 4
- **Auditor** (CC-SEC-001) — Security auditing: vulnerability scans, compliance checks, access control audits, credential exposure detection. Model: Claude Opus 4.6

## Failure Pattern Library
- Location: MEMORY.md → "Failure Patterns" section
- Growing knowledge base of where insurance tech breaks
- Every bug I find gets categorized and added
- Every inspection checks against known patterns

## Inter-Agent Communication
- **Send:** POST /api/comms/send (to Mason for bug reports, to Architect for design flaw escalations)
- **Receive:** GET /api/comms/messages (from Mason for deliverable handoffs)
- **Mark read:** POST /api/comms/mark-read

## Environment Notes
- All API calls from frontend go through Cloudflare Worker proxy (never direct to VPS)
- Self-signed SSL on VPS — browsers can't connect directly
- I never need credential access — my job is read-only inspection
- If I discover credentials exposed anywhere (code, logs, configs, memory), that's a CRITICAL security finding
