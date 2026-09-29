# REDHUB UI DESIGN SYSTEM V1 — EXTERNAL HANDOFF MIRROR

> **Purpose:** continuity note for ChatGPT conversations on the GitHub connection of `bambangirawanlawyer`.
>
> **IMPORTANT:** this repository (`bambangirawanlawyer/redvote-wa-gateway`) is **NOT** the RedHub source repository.  
> The real RedHub repository is connected to another ChatGPT account. This file is only an **external handoff mirror** so a new chat on this account can recover the project context without guessing.
>
> If the user later provides a newer verified RedHub checkpoint/result, that newer result supersedes this mirror until this file is updated again.

Last mirror update: **2026-09-29**

---

## 1. REDHUB PROJECT IDENTITY

- Product: **RedHub**
- Tagline: **TERHUBUNG & TERUKUR**
- Framework: **Flutter + Material 3**
- Typography: **Poppins**
- Primary Red: **#D90429**
- Visual character: premium, modern, professional, technology, clean, bold/tegas, data-driven, terstruktur.
- Red is an accent / primary-action color, not the full application background.
- Near-black/dark is the premium navigation/brand foundation.
- White/off-white is the primary content surface.
- Avoid excessive gradient, glow, heavy shadow, oversized decoration, or repeated bull watermark.
- Production UI must use actual application data. Mockup/reference data must never replace production data.

---

## 2. SOURCE-OF-TRUTH RULE

The **real RedHub GitHub repository** remains the source of truth in the account that has access to it.

On this ChatGPT/GitHub connection:

- DO NOT claim this mirror is the actual RedHub repository.
- DO NOT search unrelated repositories and treat them as RedHub.
- DO NOT infer repository state from `kurirobat-app`, `laundry-delivery`, `redvote-wa-gateway`, or `kurirobat-api`.
- Use this file only as the **last known verified state** when the actual RedHub repository is unavailable.
- When the user provides a newer verified report from the real RedHub repository, prefer the newer report.

---

## 3. LAST KNOWN VERIFIED REDHUB REPOSITORY STATE

RedHub branch:

`feat/fonnte-invitation`

Last known verified RedHub remote HEAD after UI-012:

`2b897ddfa544f5a4beae09f461c2c3f9d56f5ab4`

Last locked checkpoint:

**UI-012 — WhatsApp Features — PASS / LOCKED**

Current phase:

**UI-013 — Responsive Quality Gate**

Next step:

**UI-013 — Responsive Quality Gate — TODO / NOT STARTED**

The user intends to run UI-013 on the account that has RedHub repository access, then paste the verified UI-013 result into a new chat on this account.

---

## 4. CHECKPOINT STATUS

| Checkpoint | Status |
|---|---|
| UI-000 — UI Governance & Brand Asset Registration | PASS / LOCKED |
| UI-001 — Official Asset Mapping | PASS / LOCKED |
| UI-002 — RedHub Design System V1 | PASS / LOCKED |
| UI-003 — Design Tokens | PASS / LOCKED |
| UI-004 — Shared UI Components | PASS / LOCKED |
| UI-005 — Web App Shell | PASS / LOCKED |
| UI-006 — Dashboard | PASS / LOCKED |
| UI-007 — Login / Splash / Loading | PASS / LOCKED |
| UI-008 — Struktur Organisasi | PASS / LOCKED |
| UI-009 — Rapat | PASS / LOCKED |
| UI-010 — Absensi | PASS / LOCKED |
| UI-011 — Laporan Kehadiran | PASS / LOCKED |
| UI-012 — WhatsApp Features | PASS / LOCKED |
| UI-012A — Direktori WhatsApp | PASS / LOCKED |
| UI-012B — Undangan & Broadcast | PASS / LOCKED |
| UI-012C — Pengaturan WhatsApp | PASS / LOCKED |
| UI-013 — Responsive Quality Gate | TODO / NOT STARTED |
| UI-014 — Android Branding | TODO |
| UI-015 — Visual Consistency Quality Gate | TODO |
| UI-016 — REDHUB UI V1 Final Lock | TODO |

---

## 5. KNOWN CHECKPOINT COMMITS

Known RedHub commits from the completed UI work:

- UI-003: `5747689949039acee6d76995db6faeb57654e19b` — `refactor(ui): implement RedHub design tokens`
- UI-004: `48abf1f880f08d26d543c1caa8bc17d10e87105b` — `feat(ui): add RedHub shared component system`
- UI-005: `95fc0638c55093c582a4910a789b360fd7934c36` — `feat(ui): implement RedHub premium app shell`
- UI-006: `b9637227099181fc05f43c245b48aa33498fa7a1` — `feat(ui): redesign RedHub dashboard`
- UI-007: `d3b30faf07657fe870961c1aeace97d4048d2b08` — `feat(ui): redesign RedHub auth entry experience`
- UI-008: `7978f938fbf88cc61cd53216b9b999f8017751b2` — `feat(ui): redesign RedHub organization structure`
- UI-009: `e3984f1d8361d8cfd3b58e36b7340b73205ec478` — `feat(ui): redesign RedHub meetings`
- UI-010: `efc24f3e85323ebb214c6ef0261eb0199db1f1aa` — `feat(ui): redesign RedHub attendance`
- UI-011: `e67f6de4483772449d89e1cadf47ec6a8ddcad63` — `feat(ui): redesign RedHub attendance reports`
- UI-012A: `d687e9ced18d28776a7d9484a62e90256efffd90` — `feat(ui): redesign RedHub WhatsApp directory`
- UI-012 final verified HEAD: `2b897ddfa544f5a4beae09f461c2c3f9d56f5ab4`

Sub-commit hashes for UI-012B/UI-012C were not mirrored into this chat; use the final verified UI-012 HEAD above unless the user provides newer details.

---

## 6. DESIGN SYSTEM IMPLEMENTATION PATHS

Locked paths from the actual RedHub project:

- Design tokens: `lib/design_system/tokens/`
- Token barrel: `lib/design_system/tokens/app_tokens.dart`
- Global theme: `lib/design_system/theme/app_theme.dart`
- Shared UI components: `lib/design_system/components/`
- Shared component barrel: `lib/design_system/components/app_components.dart`
- App Shell: `lib/design_system/shell/redhub_app_shell.dart`

Official production assets are mapped by the actual RedHub repository documentation. Runtime code must not use `assets/branding/reference/` images directly.

---

## 7. SHARED COMPONENTS LOCKED BY UI-004

The RedHub shared component system includes:

- `RedHubButton`
- `RedHubIconButton`
- `RedHubCard`
- `RedHubMetricCard`
- `RedHubTextField`
- `RedHubSearchField`
- `RedHubTextArea`
- `RedHubSelectField`
- `RedHubDateTimeField`
- `RedHubStatusBadge`
- `RedHubAvatar`
- `RedHubSectionHeader`
- `RedHubLoadingState`
- `RedHubEmptyState`
- `RedHubErrorState`
- `RedHubDialog`
- `RedHubDataContainer`
- `RedHubNavigationItem`
- `RedHubMobileNavigationItem`

Pages/features should reuse official components and centralized tokens instead of recreating local design systems.

---

## 8. FEATURE IMPLEMENTATION SUMMARY

### UI-005 — App Shell

Source:
`lib/design_system/shell/redhub_app_shell.dart`

Known behavior:
- Desktop >= 1024px: persistent 280px near-black premium sidebar.
- Tablet/mobile: light AppBar + dark Drawer.
- Desktop official logo: `assets/branding/logo/redhub-horizontal-darkbg.png`
- Mobile/tablet header symbol: `assets/branding/logo/redhub-symbol-standard.png`
- Menu, routing, permissions, logout/auth logic were preserved.

### UI-006 — Dashboard

Presentation:
`lib/features/dashboard/dashboard_view.dart`

Integration:
`lib/features/dashboard/role_dashboard.dart`

Locked actual metrics:
- Rapat Tercatat
- Rata-rata Kehadiran
- Pengurus Aktif
- Agenda Mendatang

Also retained:
- Agenda Terdekat
- Ringkasan Kehadiran
- Akses Cepat

Production data, metric formulas, roles, permissions and routing were preserved.

### UI-007 — Auth Entry

Login:
`lib/features/auth/login_screen.dart`

Presentation:
`lib/features/auth/auth_entry_view.dart`

Native Android splash:
- `android/app/src/main/res/drawable/launch_background.xml`
- `android/app/src/main/res/drawable-v21/launch_background.xml`
- `android/app/src/main/res/drawable-xxxhdpi/redhub_splash.png`

No artificial splash delay. Auth/session/role/profile logic unchanged.

### UI-008 — Struktur Organisasi

Root:
`lib/features/organization/organization_structure_screen.dart`

Presentation:
`lib/features/organization/organization_structure_view.dart`

Actual domain relationship:
`OrganizationUnit.id -> OrganizationMember.unitId`

Unit types remain:
- DPC
- PAC
- BADAN
- SAYAP

No invented parent-child tree because model had no `parentUnitId`.

### UI-009 — Rapat

Root:
`lib/features/meetings/meeting_audience_screen.dart`

Presentation:
`lib/features/meetings/meeting_audience_view.dart`

Actual scope:
- create meeting
- participant preview
- not a meeting history/list manager

Known statuses:
- create -> `PUBLISHED`
- close -> `CLOSED`
- `ARCHIVED` recognized as final
- `DRAFT` fallback if stored status missing

Meeting domain/business logic remained unchanged.

### UI-010 — Absensi

Roots:
- `scanner_meeting_list_screen.dart`
- `attendance_scanner_screen.dart`
- `member_qr_card_screen.dart`

Presentations:
- `scanner_meeting_list_view.dart`
- `attendance_scanner_view.dart`
- `member_qr_card_view.dart`

Actual modes:
- `QR`
- `ADMIN_MANUAL`

Actual statuses:
- `HADIR`
- `TERLAMBAT`
- `IZIN`
- `SAKIT`
- `ALFA`
- `PENDING` remains transient before final attendance status.

QR logic, token parsing, duplicate prevention, server timestamp, grace-period logic and reports source data remained unchanged.

### UI-011 — Laporan Kehadiran

Root:
`lib/features/reports/reports_screen.dart`

Presentation:
`lib/features/reports/reports_view.dart`

Preserved:
- `ReportService`
- `ReportAggregator`
- `report_models.dart`

Actual counts:
- participantCount
- hadir
- terlambat
- izin
- sakit
- alfa
- pending

Existing formulas remained unchanged:
- Member attendance rate = `(hadir + terlambat) / requiredMeetings * 100`
- Punctuality = `hadir / (hadir + terlambat) * 100`
- Meeting attendance rate = `(hadir + terlambat) / participantCount * 100`

Finalization remains owned by `ReportService.closeMeeting()`.

### UI-012A — Direktori WhatsApp

Root:
`lib/features/organization/member_phone_screen.dart`

Presentation:
`lib/features/organization/member_phone_view.dart`

Repository:
`OrganizationRepository`

Phone source:
`organizations/{organizationId}/members/{memberId}.phone`

Existing normalization:
repository only uses `phone.trim()`.

Important:
- No direct WhatsApp deep-link feature existed.
- No direct Fonnte relation existed.
- Search = N/A.
- Filter = N/A.
- Grouping remained flat active-member list.

### UI-012B — Undangan & Broadcast

Status:
**PASS / LOCKED**

The actual implementation and documentation were completed in the RedHub repository account. Preserve all invitation/broadcast/Fonnte business logic. Do not infer missing source paths in this mirror; read the newer verified user report or actual RedHub repo if available.

### UI-012C — Pengaturan WhatsApp

Status:
**PASS / LOCKED**

The actual implementation and documentation were completed in the RedHub repository account. Preserve provider/Fonnte credentials, endpoint, configuration persistence, validation, permissions, delivery behavior and secret handling. Do not infer source paths from this mirror.

Parent:
**UI-012 — WhatsApp Features = PASS / LOCKED**

---

## 9. GLOBAL BUSINESS-LOGIC FREEZE

UI work must not silently change:

- API contracts
- database schemas
- repositories/services
- auth/session behavior
- role/permission behavior
- routing contracts
- meeting lifecycle/domain rules
- attendance validation/status/timestamp logic
- report formulas/finalization
- Fonnte/provider endpoint/auth/payload/recipient/delivery behavior
- workflow

If a non-UI/domain issue is found, record it separately instead of fixing it inside a UI checkpoint unless explicitly approved.

---

## 10. KNOWN NON-FAILING ENVIRONMENT DIAGNOSTICS

Across several checkpoints:

- Test environment may fail to fetch some Poppins weights from `fonts.gstatic.com` through `google_fonts`.
- Test suites still exited with code 0 when this occurred.
- Flutter web builds may report Wasm dry-run advisory and normal icon tree-shaking messages.
- Android builds may show Java native-access / Kotlin migration advisories.

Do not remove Poppins or change production typography solely to silence the known test-environment font diagnostic.

---

## 11. REMAINING ROADMAP

### UI-013 — Responsive Quality Gate

Purpose:
- cross-feature desktop/tablet/mobile/PWA responsive audit
- fix overflow/wrapping/stacking/spacing/touch-target/layout issues
- no redesign and no business-logic changes
- test representative viewports (for example 1440/1280/1024/768/390, guided by official breakpoints)
- audit shared components first when an issue is global
- create `docs/ui/REDHUB_RESPONSIVE_QA.md`
- after PASS: NEXT STEP = UI-014

### UI-014 — Android Branding

Purpose:
- lock Android launcher/adaptive icon/splash/notification branding using official assets
- no new bull/logo variant
- verify Android build
- after PASS: NEXT STEP = UI-015

### UI-015 — Visual Consistency Quality Gate

Purpose:
- final visual audit across all migrated pages
- logo/color/font/spacing/radius/shadow/icon/gradient/legacy-style consistency
- no major redesign
- after PASS: NEXT STEP = UI-016

### UI-016 — REDHUB UI V1 Final Lock

Purpose:
- verify UI-000 through UI-015 are PASS / LOCKED
- final documentation/handoff
- final build/test
- permanently lock RedHub UI V1 decisions until explicitly revised

---

## 12. HOW A NEW CHAT ON THIS ACCOUNT MUST CONTINUE

When the user opens a new ChatGPT conversation on the GitHub connection of `bambangirawanlawyer`:

1. Read this file first:
   `bambangirawanlawyer/redvote-wa-gateway/docs/REDHUB_UI_EXTERNAL_HANDOFF.md`
2. Explicitly acknowledge that `redvote-wa-gateway` is only an **external handoff mirror**, not the RedHub source repository.
3. Do not search unrelated repositories for RedHub.
4. Use this file as the last-known verified state unless the user provides a newer verified RedHub result.
5. The user intends to paste the **UI-013 result** into the new chat.
6. If the pasted UI-013 result shows PASS / LOCKED, continue from **UI-014 — Android Branding**.
7. Never repeat a PASS / LOCKED checkpoint unless the actual RedHub source of truth explicitly shows otherwise.
8. Continue one checkpoint at a time and STOP after each checkpoint.
9. After the user reports a new PASS / LOCKED checkpoint, update this external mirror if the user asks to keep cross-chat continuity.

---

## 13. SHORT STARTUP PROMPT FOR A NEW CHAT

The user can send:

> Lanjutkan REDHUB UI DESIGN SYSTEM V1.  
> Repository RedHub asli berada di akun lain.  
> Di akun ini, baca external handoff mirror berikut terlebih dahulu:  
> `bambangirawanlawyer/redvote-wa-gateway/docs/REDHUB_UI_EXTERNAL_HANDOFF.md`  
> Jangan menganggap redvote-wa-gateway sebagai repository RedHub.  
> Setelah membaca catatan tersebut, gunakan sebagai last known state dan saya akan mengirim hasil checkpoint terbaru dari repository RedHub asli.

---

## 14. CURRENT STOP POINT

**DO NOT START FROM THIS MIRROR AUTOMATICALLY.**

Current last-known state at the time this file was written:

- UI-012 = PASS / LOCKED
- UI-013 = TODO / NOT STARTED
- UI-014 = TODO
- UI-015 = TODO
- UI-016 = TODO
- Real RedHub HEAD last verified: `2b897ddfa544f5a4beae09f461c2c3f9d56f5ab4`

The next verified result expected from the user is **UI-013 — Responsive Quality Gate**.
