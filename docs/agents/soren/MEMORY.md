# MEMORY.md — Architect

## Core Business Context
- **Company:** Forged Financial — life insurance operations + AI automation
- **Agency:** Part of one of the fastest-growing life insurance agencies ever ($100K/month → $10M/month in under 1 year)
- **Boss's role:** Systems builder — designing and building the infrastructure that automates and scales the agency
- **End goal:** Build for Forged Financial first, then package and scale to other insurance agencies
- **Scale mindset:** Everything designed for 100+ agencies from day one

## Key Systems
- **YN-CRM:** Custom CRM dashboard (single-file HTML monolith, 11,221 lines). Lives at ForgedFinancial/YN-CRM on GitHub. Deployed via Cloudflare Pages at yncrm.pages.dev
- **Forged-OS:** React + Vite + Tailwind multi-agent dashboard. Lives alongside YN-CRM at /forged-os/. In development.
- **VPS:** Ubuntu 24.04, IP 76.13.126.53, Tailscale SSH. Runs OpenClaw, sync server, agent workspaces.
- **Cloudflare Worker proxy:** forged-sync.danielruh.workers.dev — proxies frontend requests to VPS (solves self-signed cert)
- **ReadyMode:** Dialer integration for outbound calling

## Insurance Sales Lifecycle (What We're Building For)
Lead Generation → Contact/Qualify → Appointment Set → Quote → E-App → Underwriting → Issued → Delivery → Service → Renewal
- Every system we build must understand and support this lifecycle
- Automation opportunities exist at every stage
- Scale considerations: what works for 10 agents must work for 1,000

## Architecture Patterns
- [To be filled as plans are created and lessons learned]

## Planning Lessons
- [To be filled as post-mortems reveal what works and what doesn't]

## Research Library
- [To be filled as Scout gathers competitive intelligence, carrier API docs, compliance requirements]

## Future Opportunities
- [To be filled as builds reveal automation, AI enhancement, and integration opportunities]
