# RedHub UI Latest External Handoff

This repository is not the RedHub source repository. This file only mirrors the latest verified checkpoint reported from the real RedHub repository.

## Final verified state

- Branch: `feat/fonnte-invitation`
- Final RedHub commit: `a13f043847143ba5fafb1413405661316fcad9b7`
- Remote HEAD: `a13f043847143ba5fafb1413405661316fcad9b7`
- Working tree after final push: **CLEAN**
- UI-016 — REDHUB UI V1 Final Lock: **PASS / LOCKED**
- REDHUB UI DESIGN SYSTEM V1: **COMPLETE / PASS / LOCKED**
- LAST CHECKPOINT: **UI-016 — REDHUB UI V1 Final Lock — PASS / LOCKED**
- CURRENT PHASE: **REDHUB UI V1 COMPLETE**
- NEXT STEP: **NONE — WAIT FOR EXPLICIT USER INSTRUCTION**

## Final checkpoint matrix

UI-000, UI-001, UI-002, UI-003, UI-004, UI-005, UI-006, UI-007, UI-008, UI-009, UI-010, UI-011, UI-012, UI-012A, UI-012B, UI-012C, UI-013, UI-014, UI-015, and UI-016 are all **PASS / LOCKED**.

## Locked brand

- Brand: **RedHub**
- Tagline: **TERHUBUNG & TERUKUR**
- Typography: **Poppins**
- Primary Red: `#D90429`
- Deep Red: `#A60D1A`
- Black: `#111111`
- White: `#FFFFFF`
- Gray: `#6B7280`
- Character: premium, modern, professional, technology, clean, bold, data-driven, tegas, terstruktur

## Locked implementation

- Design tokens: `lib/design_system/tokens/`
- Token barrel: `lib/design_system/tokens/app_tokens.dart`
- Breakpoints: `lib/design_system/tokens/app_breakpoints.dart`
- Theme: `lib/design_system/theme/app_theme.dart`
- Shared components: `lib/design_system/components/`
- Component barrel: `lib/design_system/components/app_components.dart`
- App Shell: `lib/design_system/shell/redhub_app_shell.dart`
- `professional_ui.dart`: intentional compatibility facade only, not a second design system

Locked breakpoints:
- Mobile: `<600`
- Tablet: `600–1023`
- Desktop: `>=1024`

## Locked asset rules

- `REDHUB_BRAND_MASTER.png` = brand reference
- `REDHUB_UI_TARGET.png` = look & feel direction
- `REDHUB_CURRENT_UI.png` = historical baseline
- Production runtime must use official mapped production assets only
- Runtime usage of `assets/branding/reference/` = **ZERO**
- No reconstructed/manual/new bull/logo variant is allowed without explicit revision approval

## Locked quality checkpoints

- UI-013 Responsive Quality Gate: **PASS / LOCKED**
  - 1440 / 1280 / 1024 / 768 / 390 px
  - 1023px boundary
  - 320px compact stress
- UI-014 Android Branding: **PASS / LOCKED**
- UI-015 Visual Consistency Quality Gate: **PASS / LOCKED**

## Final quality gate

- `dart format`: PASS for UI V1 scope
- `flutter analyze`: No issues found
- `flutter test`: **140/140 PASS**
- `flutter build web --release`: PASS
- `flutter build apk --debug`: PASS
- No business/domain logic diff in UI-016
- Role/permission preservation: PASS
- Routing preservation: PASS
- API/database/repository/service preservation: PASS
- Secret leakage audit: PASS

Known non-failing diagnostics remain:
- remote `google_fonts` Poppins fetch diagnostic while tests still exit 0
- web Wasm dry-run / icon tree-shaking advisory
- Android JVM native-access warning
- future Built-in Kotlin/KGP migration warning

Known visual QA limitation:
Chrome headless release screenshots at 1440 / 768 / 390 previously produced blank-white bootstrap output and were not used as visual PASS evidence. Locked widget/rendering regression evidence remains authoritative.

## Final RedHub documentation in the real repository

- `docs/ui/REDHUB_UI_V1_FINAL_LOCK.md` exists
- `docs/ui/MASTER_UI_HANDOFF.md` states REDHUB UI DESIGN SYSTEM V1 = COMPLETE / PASS / LOCKED
- `docs/ui/UI_CHECKPOINTS.md` records UI-000 through UI-016 = PASS / LOCKED
- `docs/ui/UI_IMPLEMENTATION_RULES.md` contains permanent V1 governance
- `docs/ui/CHAT_HANDOFF_PROMPT.md` states LAST CHECKPOINT = UI-016 and NEXT STEP = NONE

## Permanent continuation rule

A new chat on this account must:

1. Read this file first.
2. Remember that `bambangirawanlawyer/redvote-wa-gateway` is only an external handoff mirror, not the RedHub source repository.
3. Treat REDHUB UI DESIGN SYSTEM V1 as **COMPLETE / PASS / LOCKED**.
4. Never restart UI-000 through UI-016.
5. Never invent UI-017.
6. Never silently revise PASS / LOCKED checkpoints.
7. Wait for an explicit new instruction from the user.
8. Any future major redesign must be treated as an explicit revision / UI V2, not a silent change to locked UI V1.

For older history, also read `docs/REDHUB_UI_EXTERNAL_HANDOFF.md`.
This file supersedes older mirror state.
