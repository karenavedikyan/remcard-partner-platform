# R04 parity matrix (checkpoint)

Reference: `/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard/` (`roles.js` SHA256 `0c9a8be699670e94345e4d0e1a3a331f4402966ca26c4b74c1ab98e0daf7e5bc`).

| ID | Surface | Viewport | Theme | Impl | Ref | Status |
|----|---------|----------|-------|------|-----|--------|
| P1 | Partners shell + segments | 1440 | light | `screenshots/impl-partners-1440-light.png` | pending capture | PARTIAL |
| P2 | Active list/cards | 1440 | light | same | pending | PARTIAL |
| P3 | Search + taxonomy headers | 1440 | light | pending | pending | TODO |
| P4 | Invitations segment | 1440 | light | pending | pending | TODO |
| P5 | Mobile shell | 375 | light | pending | pending | TODO |
| P6 | Mobile search | 375 | light | pending | pending | TODO |
| P7 | Dark theme list | 1440 | dark | pending | pending | TODO |
| P8 | 320 smoke | 320 | light | pending | pending | TODO |

Functional parity: test BFF `partnership/list` + `link-invite` no longer return «Не авторизован» under prof test delegation (see `TEST-RESULTS.json`).
