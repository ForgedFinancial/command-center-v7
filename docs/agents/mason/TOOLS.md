# TOOLS.md — Mason's Available Systems

## My Role With Tools
I USE these systems. I write code, configure services, deploy to staging, wire up integrations. These are my workbench.

## VPS (Primary Server)
- **IP:** 76.13.126.53
- **SSH:** Via Tailscale at clawd@100.71.72.127
- **OS:** Ubuntu 24.04 (srv1341958)
- **Sync Server:** https://76.13.126.53:443 (self-signed SSL)
- **Endpoints:**
  - GET /health — server health check
  - GET /api/cc-state — full dashboard state
  - POST /api/push — push updates
  - GET /api/poll — poll for changes
  - POST /api/comms/send — inter-agent messaging
  - GET /api/comms/messages — read messages
  - POST /api/comms/mark-read — mark messages read
- **Agent workspaces:** /home/clawd/.openclaw/workspace/agents/<agentId>/
- **My access:** FULL READ/WRITE on dev/staging. Production changes require Boss's approval through Clawd.

## GitHub
- **Repo:** ForgedFinancial/YN-CRM
- **Branches:** main (production), dano-sandbox, forged-os/dev
- **CI/CD:** Cloudflare Pages auto-deploys from main
- **My workflow:** Work on dev branches → self-test → hand to Sentinel → on approval, merge to main (with Boss's sign-off)
- **Credential reference:** Token in CLAWD-VPS-INFO.md — never store in workspace files

## Cloudflare
- **Pages:** yncrm.pages.dev (CRM at root, Forged-OS at /forged-os/)
- **Worker Proxy:** forged-sync.danielruh.workers.dev (proxies to VPS, solves self-signed cert)
- **Build command:** bash build.sh
- **Output directory:** _site
- **My access:** Deploy to Pages via GitHub (main branch merge triggers auto-deploy)

- **Access:** API integration for pipeline data, lead tracking, workflow automation
- **Usage:** Build and configure pipelines, forms, workflows, automations
- **Key data areas:** Contacts, opportunities, pipeline stages, conversations, tasks, appointments

## OpenClaw
- **Gateway:** Port 18789 on VPS
- **My context:** I exist as a sub-agent on Clawd's gateway. Clawd spawns me via sessions_spawn.
- **Workspace:** /home/clawd/.openclaw/workspace/agents/mason/

## Tech Stack (What I Build With)
- **Frontend:** React + Vite + Tailwind CSS (Forged-OS dashboard)
- **Legacy CRM:** Single-file HTML monolith, 11,221 lines (YN-CRM)
- **Backend:** Node.js, Python
- **Database:** As needed per project (Postgres, SQLite, etc.)
- **Dialer:** ReadyMode integration

## Sub-Agent Tools
- **Coder** (CC-CODE-001) — Pure code generation: components, endpoints, schemas, utilities. Model: Codex 5.3
- **Scribe** (CC-DOC-001) — Documentation: SOPs, process docs, training materials. Model: Claude Sonnet 4

## Inter-Agent Communication
- **Send:** POST /api/comms/send (to Sentinel for deliverable handoff, to Architect for clarification requests)
- **Receive:** GET /api/comms/messages (from Architect for specs, from Sentinel for bug reports)
- **Mark read:** POST /api/comms/mark-read

## Environment Notes
- All API calls from frontend go through Cloudflare Worker proxy (never direct to VPS)
- Self-signed SSL on VPS — browsers can't connect directly
- Credential references only — actual keys live in CLAWD-VPS-INFO.md on Boss's Desktop
- NEVER store credentials in code, logs, memory files, or commit history
