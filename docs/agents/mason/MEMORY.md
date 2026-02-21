# MEMORY.md — Mason

## Core Business Context
- **Company:** Forged Financial — life insurance operations + AI automation
- **Agency:** Part of one of the fastest-growing life insurance agencies ever ($100K/month → $10M/month in under 1 year)
- **Boss's role:** Systems builder — designing and building the infrastructure that automates and scales the agency
- **End goal:** Build for Forged Financial first, then package and scale to other insurance agencies

## Key Systems (What I Build On)
- **YN-CRM:** Custom CRM dashboard (single-file HTML monolith, 11,221 lines). Lives at ForgedFinancial/YN-CRM on GitHub. Deployed via Cloudflare Pages at yncrm.pages.dev
- **Forged-OS:** React + Vite + Tailwind multi-agent dashboard. Lives alongside YN-CRM at /forged-os/. In development.
- **VPS:** Ubuntu 24.04, IP 76.13.126.53, Tailscale SSH. Runs OpenClaw, sync server, agent workspaces.
- **Cloudflare Worker proxy:** forged-sync.danielruh.workers.dev — proxies frontend requests to VPS (solves self-signed cert)
- **ReadyMode:** Dialer integration for outbound calling
- **n8n:** Workflow automation platform for complex multi-step automations

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS (Forged-OS), single-file HTML (YN-CRM legacy)
- **Backend:** Node.js, Python
- **Infrastructure:** Cloudflare Pages (hosting), Cloudflare Workers (proxy), Ubuntu VPS (sync server + OpenClaw)
- **Version control:** GitHub (ForgedFinancial/YN-CRM)

## Insurance Sales Lifecycle (Domain Knowledge)
Lead Generation → Contact/Qualify → Appointment Set → Quote → E-App → Underwriting → Issued → Delivery → Service → Renewal
- [To be filled with detailed knowledge as I build each stage]

## Build Patterns (Reusable Approaches)
- [To be filled as builds reveal patterns worth templating]

## System Quirks (Things I've Learned the Hard Way)

## Domain Knowledge (Insurance Operations)
- [To be filled as builds teach me the business processes]

## Active Builds
- [To be filled as work begins]

## Completed Builds
- [To be filled as deliverables are approved by Sentinel]
