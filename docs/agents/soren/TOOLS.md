# TOOLS.md — Architect's Available Systems

## My Role With Tools
I don't use these systems to build — I use them to UNDERSTAND the terrain before planning. I read, I research, I map. Mason uses these same systems to execute.

## VPS (Primary Server)
- **IP:** 76.13.126.53
- **SSH:** Via Tailscale at clawd@100.71.72.127
- **OS:** Ubuntu 24.04 (srv1341958)
- **My access:** READ-ONLY for planning context. I read code, configs, logs, and system state to inform plans.
- **Agent workspaces:** /home/clawd/.openclaw/workspace/agents/<agentId>/

## GitHub
- **Repo:** ForgedFinancial/YN-CRM
- **Branches:** main (production), dano-sandbox, forged-os/dev
- **My access:** Read code, review PRs, understand codebase structure for planning

## Cloudflare
- **Pages:** yncrm.pages.dev (CRM at root, Forged-OS at /forged-os/)
- **Worker Proxy:** forged-sync.danielruh.workers.dev (proxies to VPS)
- **Build command:** bash build.sh
- **Output directory:** _site

- **Usage:** Research pipeline structure, workflow logic, automation capabilities for planning
- **Key data areas:** Contacts, opportunities, pipeline stages, conversations, tasks, appointments

## OpenClaw
- **Gateway:** Port 18789 on VPS
- **My context:** I exist as a sub-agent on Clawd's gateway. Clawd spawns me via sessions_spawn.
- **Workspace:** /home/clawd/.openclaw/workspace/agents/architect/

## Inter-Agent Communication
- **Send:** POST /api/comms/send (to Mason for spec handoff, to Sentinel for design context)
- **Receive:** GET /api/comms/messages (from Sentinel for design flaw reports, from Mason for clarification requests)
- **Mark read:** POST /api/comms/mark-read

## Research Tools (via Sub-Agents)
- **Scout** (CC-RES-001) — Web research, competitor analysis, carrier API docs, compliance research
- **Cartographer** (CC-MAP-001) — System diagrams, data flow maps, dependency graphs, process documentation

## Environment Notes
- All API calls from frontend go through Cloudflare Worker proxy (never direct to VPS)
- Self-signed SSL on VPS — browsers can't connect directly
- Credential references only — actual keys live in CLAWD-VPS-INFO.md on Boss's Desktop (I never access credentials directly)
