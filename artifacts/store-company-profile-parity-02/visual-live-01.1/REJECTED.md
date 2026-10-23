# REJECTED — superseded by VISUAL-ACCEPT-03

**Status:** rejected / do not use for acceptance.

Reasons (independent review):

1. `manifest.json` used `implCodeSha=4db16dc154d6b3d1257c4ec23121ef9273618291` — suffix does not match verified base `4db16dc16166cc9c5d25899b87b109fb288b592b`.
2. Files named `.png` were WEBP 1280×800 with desktop/browser chrome — not Playwright content viewport captures; no innerWidth/DPR/zoom recorded.
3. Impl frame at `:3022` showed prototype demo footer («Демо. Черновик…»), empty org title / single-branch demo data — inconsistent with F `profile/dev-fixture` (PageHeading «Dev-fixture…», STORE «Магазин Юг», 3 branches, Краснодар).

Replacement attempt: `visual-accept-03/` (partial — see its manifest status).
