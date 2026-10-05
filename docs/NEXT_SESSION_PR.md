# WA Gateway — Next Session PR

**Updated:** 2026-10-05
**Project:** RedHub WA Gateway
**Current work:** WA-011 — RedHub Device Management & Pairing Integration
**Status:** IN PROGRESS

## Do Not Repeat

WA-000 through WA-010 are PASS / LOCKED.

Do not:
- touch old VPS `202.10.45.147`;
- unpair/logout/delete `jember-main`;
- run `docker compose down -v`;
- move broadcast/reminder scheduling into the gateway;
- expose the gateway bearer token to Flutter;
- edit compiled production `main.dart.js` as a replacement for Flutter source.

## Production State

- VPS: `202.10.36.74`
- Gateway: `127.0.0.1:3410`
- Provider: `REDHUB_GATEWAY`
- Broadcast mode: `LIVE`
- Tenant/default device: `jember / jember-main`
- WhatsApp: `CONNECTED`
- Existing sender: `6285702459733`
- Fonnte credential: retained for rollback
- Backend active release: `/opt/redhub-hybrid/releases/20261005-234245`
- Backend branch: `feat/redhub-wa-device-management`
- Gateway documentation branch: `feat/redhub-wa-011-device-management`

## RB-004 — Backend Multi-Device Management

**PASS / LOCKED**

Implemented and deployed:
- `listWhatsappDevices`;
- `startWhatsappDevicePairing`;
- `getWhatsappDevicePairing`;
- `setDefaultWhatsappDevice`;
- per-broadcast `gatewayDeviceId`;
- reminder persistence of selected/default gateway device.

Verification:
- unit tests 11/11 PASS;
- syntax PASS;
- production health PASS;
- Jember device list PASS;
- `jember-main` CONNECTED;
- management endpoint authentication gate PASS (anonymous -> 401).

Gateway token remains server-side only.

## WA-011 Remaining Work

Flutter RedHub must implement:

1. **Device list**
   - call `listWhatsappDevices`;
   - show phone, deviceId, status and default badge.

2. **Add number / pairing**
   - enter a safe device ID;
   - call `startWhatsappDevicePairing`;
   - poll `getWhatsappDevicePairing`;
   - render returned QR;
   - stop showing QR when status reaches CONNECTED.

3. **Default sender**
   - enable only for CONNECTED devices;
   - call `setDefaultWhatsappDevice`.

4. **Broadcast sender selector**
   - load CONNECTED devices;
   - default to organization default device;
   - pass selected `gatewayDeviceId` to `broadcastMeetingInvitation`.

5. **Controlled production E2E**
   - pair one additional controlled WhatsApp number;
   - verify both device sessions coexist under tenant `jember`;
   - send one controlled broadcast using the new device;
   - verify gateway audit uses that device;
   - verify H-1 reminder stores/uses the selected/default device;
   - restart gateway and confirm both devices recover without QR.

## Current Blocker

The Flutter RedHub source is not visible in the currently connected GitHub
account and was not found in the known local project directories.

Do not modify compiled web output. Resume UI work only from the actual Flutter
source repository or a verified local clone.

## Resume Rule

When Flutter source becomes available:
- start directly from WA-011 Flutter UI integration;
- do not redo gateway pairing/session primitives;
- do not redo RB-004 backend work unless a regression appears;
- checkpoint each PASS and push to GitHub.
