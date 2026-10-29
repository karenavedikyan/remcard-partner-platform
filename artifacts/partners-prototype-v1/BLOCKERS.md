# Blockers / gaps — Партнёры prototype-v1 continuation

## Closed vs prior agent
- Exact reference read (worktree `4ba2f9e`) — closed.
- Backend access — closed; task branch pushed.
- P0 cooperationRequest for non-agent — closed via `requestPartnerTerms`.
- Published terms false-empty — closed via certificate-program + search publishedTerms.
- Vitrine details — closed (`PartnerVitrineDetails` + callbacks).
- Facets — closed on backend search.
- Parallel kind classifier — closed (wrap `resolvePartnerKindUi`).
- Share path to `/partners?hub=find&inviteTarget=` — closed (previewPath /invite).

## Remaining / limited
1. **Exact Idempotency-Key persistence** without schema: durable unique pair replay for INVITED+same initiator. True key-body store still needs migration → not done.
2. **Full PROF auth browser matrix 4 types × 375/1440 × themes** against live session — не запускался (запрет production writes; нет локальных partner fixtures с auth в этом окружении). Evidence: unit/component + reference static server.
3. **Type-unify branch** `feat/partner-primary-kind-unify` still not merged; adapter uses current shared `resolvePartnerKindUi`.
4. **Link invite «с условиями»** (PartnerLinkInvitePanel numeric terms) остаётся рядом со wizard обсуждения — не staff.
