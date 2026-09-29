# REDHUB UI DESIGN SYSTEM V1 — EXTERNAL HANDOFF MIRROR

> Continuity note for ChatGPT conversations connected to GitHub account `bambangirawanlawyer`.
>
> IMPORTANT: `bambangirawanlawyer/redvote-wa-gateway` is **NOT** the RedHub source repository.  
> The real RedHub repository is connected to another ChatGPT account.  
> This file only mirrors the **last known verified RedHub state** so a new chat on this account can continue without guessing.

Last update: **2026-09-29**

---

## 1. Project identity

- Product: **RedHub**
- Tagline: **TERHUBUNG & TERUKUR**
- Framework: **Flutter + Material 3**
- Typography: **Poppins**
- Primary Red: **#D90429**
- Visual character: premium, modern, professional, clean, technology, bold/tegas, data-driven, terstruktur.
- Red is an accent, not the dominant application background.
- Near-black/dark = premium navigation/brand foundation.
- White/off-white = content workspace.
- Avoid excessive gradient, glow, heavy shadow, oversized decoration, or repeated bull watermark.
- Production UI must use real application/domain data, never mockup dummy data.

---

## 2. Source-of-truth rule

The actual RedHub GitHub repository remains the source of truth on the ChatGPT account that has access to it.

On this account:
- Do **not** treat `redvote-wa-gateway` as the RedHub repo.
- Do **not** search `kurirobat-app`, `laundry-delivery`, `redvote-wa-gateway`, or `kurirobat-api` as substitute RedHub repositories.
- Use this file only as the latest external handoff mirror.
- A newer verified result pasted by the user from the real RedHub repository supersedes this file until this mirror is updated.

---

## 3. Last known verified RedHub repository state

Branch:

`feat/fonnte-invitation`

Remote HEAD after UI-013:

`b241a156e46f36726a4c7e927d7882903ae152f6`

LAST LOCKED CHECKPOINT:

**UI-013 — Responsive Quality Gate — PASS / LOCKED**

CURRENT PHASE:

**UI-014 — Android Branding**

NEXT STEP:

**UI-014 — Android Branding — TODO / NOT STARTED**

Do **not** repeat UI-013.

---

## 4. Checkpoint status

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
| UI-013 — Responsive Quality Gate | PASS / LOCKED |
| UI-014 — Android Branding | TODO / NOT STARTED |
| UI-015 — Visual Consistency Quality Gate | TODO |
| UI-016 — REDHUB UI V1 Final Lock | TODO |

---

## 5. Known RedHub checkpoint commits

- UI-003: `5747689949039acee6d76995db6faeb57654e19b`
- UI-004: `48abf1f880f08d26d543c1caa8bc17d10e87105b`
- UI-005: `95fc0638c55093c582a4910a789b360fd7934c36`
- UI-006: `b9637227099181fc05f43c245b48aa33498fa7a1`
- UI-007: `d3b30faf07657fe870961c1aeace97d4048d2b08`
- UI-008: `7978f938fbf88cc61cd53216b9b999f8017751b2`
- UI-009: `e3984f1d8361d8cfd3b58e36b7340b73205ec478`
- UI-010: `efc24f3e85323ebb214c6ef0261eb0199db1f1aa`
- UI-011: `e67f6de4483772449d89e1cadf47ec6a8ddcad63`
- UI-012A: `d687e9ced18d28776a7d9484a62e90256efffd90`
- UI-012 final verified HEAD: `2b897ddfa544f5a4beae09f461c2c3f9d56f5ab4`
- UI-013: `b241a156e46f36726a4c7e927d7882903ae152f6`

---

## 6. Locked Design System implementation paths

- Design tokens: `lib/design_system/tokens/`
- Token barrel: `lib/design_system/tokens/app_tokens.dart`
- Breakpoints: `lib/design_system/tokens/app_breakpoints.dart`
- Global theme: `lib/design_system/theme/app_theme.dart`
- Shared components: `lib/design_system/components/`
- Component barrel: `lib/design_system/components/app_components.dart`
- App Shell: `lib/design_system/shell/redhub_app_shell.dart`

Official reference images are guidance only. Runtime code must not use `assets/branding/reference/`.

---

## 7. UI-013 verified responsive result

Status: **PASS / LOCKED**

Breakpoint source:
`lib/design_system/tokens/app_breakpoints.dart`

Locked ranges:
- Mobile: `<600`
- Tablet: `600–1023`
- Desktop: `>=1024`

Viewport matrix:
- 1440px
- 1280px
- 1024px
- 768px
- 390px

Additional checks:
- App Shell boundary: **1023px**
- compact stress: **320px**

Feature results:
- App Shell: PASS
- Dashboard: PASS
- Login/Auth: PASS
- Struktur Organisasi: PASS
- Rapat: PASS
- Absensi: PASS
- Laporan Kehadiran: PASS
- Direktori WhatsApp: PASS
- Undangan & Broadcast: PASS
- Pengaturan WhatsApp: PASS
- PWA/Web resize behavior: PASS
- Long-content stress: PASS
- Text scale: PASS
- Responsive accessibility scope: PASS
- Business logic preservation: PASS

Global defect found and fixed:
- `RedHubStatusBadge` could overflow by about 224px with a long status label on a mobile stress case.
- Fix applied globally in:
  `lib/design_system/components/redhub_feedback.dart`
- Strategy: loose `Flexible` + wrapping.
- No page-specific workaround was introduced.

Quality gate:
- `dart format`: PASS, 0 changes
- `flutter analyze`: No issues found
- `flutter test`: **140 tests PASS**
- `flutter build web --release`: PASS
- `flutter build apk --debug`: PASS
- Android APK generated successfully.

Documentation created in actual RedHub repo:
`docs/ui/REDHUB_RESPONSIVE_QA.md`

Known non-failing diagnostics remain:
- remote test environment may fail to fetch Poppins weights from `fonts.gstatic.com`;
- test exit code remains 0;
- web build may show existing Wasm/tree-shaking advisory;
- Android may show existing Gradle/JVM / future Built-in Kotlin migration advisories.

---

## 8. Core feature facts that must not be reinvented

### App Shell
- Desktop starts at 1024px.
- Persistent desktop sidebar: 280px.
- Tablet/mobile use AppBar + Drawer.
- Menu/routing/permission/auth behavior remains domain-owned.

### Dashboard
Actual primary metrics:
- Rapat Tercatat
- Rata-rata Kehadiran
- Pengurus Aktif
- Agenda Mendatang

### Struktur Organisasi
Actual domain relation:
`OrganizationUnit.id -> OrganizationMember.unitId`

Unit types:
- DPC
- PAC
- BADAN
- SAYAP

No invented `parentUnitId` hierarchy.

### Rapat
Actual feature is create meeting + participant preview, not a meeting history manager.

Known status behavior:
- create -> `PUBLISHED`
- close -> `CLOSED`
- `ARCHIVED` recognized as final
- `DRAFT` fallback when stored status absent

### Absensi
Actual modes:
- `QR`
- `ADMIN_MANUAL`

Actual statuses:
- `HADIR`
- `TERLAMBAT`
- `IZIN`
- `SAKIT`
- `ALFA`
- `PENDING` transient

### Laporan Kehadiran
Existing formulas are locked:
- Member attendance rate = `(hadir + terlambat) / requiredMeetings * 100`
- Punctuality = `hadir / (hadir + terlambat) * 100`
- Meeting attendance rate = `(hadir + terlambat) / participantCount * 100`

### Direktori WhatsApp
Root:
`lib/features/organization/member_phone_screen.dart`

Presentation:
`lib/features/organization/member_phone_view.dart`

Phone source:
`organizations/{organizationId}/members/{memberId}.phone`

Existing normalization:
`phone.trim()`

No direct WhatsApp deep-link or direct Fonnte relation existed in UI-012A.

UI-012B and UI-012C are PASS / LOCKED in the actual RedHub repo. Do not infer their source paths from this mirror if a new task requires repository-specific detail.

---

## 9. Global business-logic freeze

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

Non-UI/domain issues must be recorded separately unless the user explicitly authorizes a change.

---

## 10. Remaining roadmap

### UI-014 — Android Branding
NEXT STEP.

Purpose:
- verify and lock Android launcher branding
- adaptive icon foreground/background
- splash branding
- notification icon if applicable
- use only official RedHub assets
- do not create a new bull/logo variant
- verify Android build
- after PASS: UI-015

### UI-015 — Visual Consistency Quality Gate

Purpose:
- final visual audit of all migrated pages
- logo/color/font/spacing/radius/shadow/icon/gradient/legacy-style consistency
- no major redesign
- after PASS: UI-016

### UI-016 — REDHUB UI V1 Final Lock

Purpose:
- verify UI-000 through UI-015 PASS / LOCKED
- final documentation/handoff
- final quality/build gates
- lock REDHUB UI V1 until explicitly revised

---

## 11. New-chat continuation rule

When a new chat on this account continues RedHub:

1. Read this file first.
2. Explicitly acknowledge that `redvote-wa-gateway` is only an external mirror, not the real RedHub repository.
3. Do not search unrelated repositories for RedHub.
4. Treat the state above as last-known verified state unless the user provides a newer result from the real RedHub repository.
5. Current NEXT STEP is **UI-014 — Android Branding**.
6. Never repeat UI-013 unless the real RedHub repository later proves this mirror stale.
7. Work one checkpoint at a time and STOP after every checkpoint.
8. When the user reports UI-014 PASS / LOCKED, continue to UI-015.
9. When the user reports UI-015 PASS / LOCKED, continue to UI-016.
10. Update this mirror after each newly verified checkpoint when continuity across chats is needed.

---

## 12. Suggested startup prompt

> Lanjutkan REDHUB UI DESIGN SYSTEM V1.  
> Repository RedHub asli berada di akun GPT lain.  
> Baca external handoff mirror:  
> `bambangirawanlawyer/redvote-wa-gateway/docs/REDHUB_UI_EXTERNAL_HANDOFF.md`  
> Jangan menganggap redvote-wa-gateway sebagai repository RedHub.  
> Gunakan file tersebut sebagai last known verified state, lalu konfirmasi LAST CHECKPOINT dan NEXT STEP sebelum melanjutkan.

---

## 13. Current stop point

- UI-013 = **PASS / LOCKED**
- Real RedHub HEAD last verified = `b241a156e46f36726a4c7e927d7882903ae152f6`
- UI-014 = **TODO / NOT STARTED**
- UI-015 = TODO
- UI-016 = TODO
- NEXT STEP = **UI-014 — Android Branding**

STOP at this state until UI-014 is explicitly started.
