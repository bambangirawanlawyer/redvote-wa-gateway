# REDVOTE WA Gateway — Decisions

## D-001 Source of Truth
GitHub is the canonical source of application code and project documentation. VPS is a deployment target.

## D-002 Deployment Isolation
Gateway runs as its own systemd service under `/opt/redvote-wa` and binds to `127.0.0.1:3400`. Nginx exposes `wa.redvote.id` over HTTPS.

## D-003 Database Isolation
Use the existing PostgreSQL server on port 5433, but create dedicated database `redvote_wa` and dedicated role `redvote_wa_app`. Do not reuse application databases or credentials.

## D-004 WhatsApp Engine
Use Baileys for V1 to avoid Chromium/Puppeteer overhead on the 1-vCPU VPS.

## D-005 Queue
Use PostgreSQL-backed persistence for V1. Redis/RabbitMQ are not required at the current scale.

## D-006 Secrets
Never commit `.env`, API secrets, database passwords, WhatsApp credentials, or session data. Only `.env.example` belongs in Git.

## D-007 Scope Discipline
Build mandatory gateway capabilities first. Billing, CRM, campaign builder, public SaaS multi-tenancy and other Fonnte-like commercial features are outside V1.

## D-008 Enforcement
Rate controls, retry and failover are reliability mechanisms and must not be designed to circumvent WhatsApp restrictions or enforcement.
