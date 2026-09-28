# REDVOTE WA Gateway — Master Handoff

## Project
Private WhatsApp gateway service for REDVOTE applications.

## Source of Truth
GitHub repository: `bambangirawanlawyer/redvote-wa-gateway`

## Production Target
- Domain: `wa.redvote.id`
- VPS: existing REDVOTE VPS
- OS: Ubuntu 24.04 LTS
- Runtime: Node.js 24 / TypeScript
- Bind: `127.0.0.1:3400`
- Reverse proxy: Nginx
- Service manager: systemd
- Database: PostgreSQL existing instance on `127.0.0.1:5433`
- Dedicated DB: `redvote_wa`
- Dedicated DB role: `redvote_wa_app`
- WhatsApp engine: Baileys

## Architecture
Client App -> HTTPS/Nginx -> REST API -> Queue/Rate Control -> Baileys -> WhatsApp.
PostgreSQL stores application state, jobs and message logs. WhatsApp sessions and secrets must never be committed to Git.

## V1 Scope
- Admin authentication
- Device/session manager and QR pairing
- API token management
- Send text
- Send image/document
- Persistent message queue
- Conservative rate control
- Controlled retry
- Webhook callbacks
- Message logs
- Health monitoring
- Test-send workflow

## Security Rules
- Secrets, WhatsApp sessions, API tokens and database passwords never enter Git.
- Gateway binds only to localhost; public access is through Nginx/HTTPS.
- Existing VPS applications must not be modified or interrupted.
- Database and database role are isolated from other applications.
- Provider architecture is for reliable delivery, not bypassing WhatsApp restrictions.

## VPS Baseline
- 1 vCPU
- 2.2 GiB RAM; about 1.5 GiB available after Laundry API was disabled
- 40 GB disk; about 24 GB available
- PostgreSQL 18.6
- Nginx 1.24
- Node.js 24.20.0 / npm 11.19.0
- Port 3400 confirmed unused at planning time
- `laundry-delivery-api.service` disabled/inactive; its files and DB retained

## LAST CHECKPOINT
CP-002 — VPS Isolation & Foundation: PASS / LOCKED

## CURRENT PHASE
CP-003 — Gateway Foundation & WhatsApp Engine/QR
