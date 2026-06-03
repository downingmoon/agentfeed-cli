---
title: Commercial Readiness Hardening - Frontend Fail Closed Logout and CLI Live Upload Lock 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/cli
  - hardening
status: implemented
aliases:
  - Frontend fail-closed logout and CLI live upload lock
---

# Commercial Readiness Hardening - Frontend Fail Closed Logout and CLI Live Upload Lock 2026-06-03

## Outcome

- [[Integration - CLI Backend Frontend]]: advanced two P1 hardening items across frontend and CLI.
- Frontend sign-out now clears local auth/social state even when `/auth/logout` fails, while preserving a visible warning that backend session sync did not complete.
- CLI draft upload lock cleanup now refuses to remove stale-looking lock files when their recorded owner PID is still alive.
- Added a CLI regression assertion that `collect --json --upload` persists uploaded metadata to the saved draft file; the candidate was already implemented by `publishDraft()`, so this locks the contract rather than changing runtime behavior.

> [!success] Verification
> - Frontend RED: `npm run test:contracts -- --run src/lib/page-source-contract.test.ts` failed on the new fail-closed logout contract before implementation.
> - Frontend GREEN: `npm run test:contracts -- --run src/lib/page-source-contract.test.ts && npm run lint`.
> - Frontend full code gate: `node scripts/ci-workflow.contract.test.mjs && npm run test:contracts && npm audit --omit=dev --audit-level=moderate && NEXT_PUBLIC_API_URL=http://localhost:8000 npm run check:api-compatibility:mock && NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`.
> - CLI RED: `npm test -- tests/api-hook.test.ts -t "keeps stale-looking upload locks"` showed a live-owner lock was removed and upload proceeded.
> - CLI GREEN: `npm test -- tests/api-hook.test.ts -t "upload lock|keeps stale-looking upload locks"`.
> - CLI full gate: `npm run prepack` → 23 test files, 384 tests passed.

## Changed Files

### Frontend

- `src/contexts/AppContext.tsx`
  - `signOut()` now uses `finally` to clear auth-bound social state, `currentUser`, `signedIn`, session-expired state, and auth bootstrap error after any logout attempt.
  - Catch copy explains local fail-closed cleanup when backend logout sync fails.
- `src/lib/page-source-contract.test.ts`
  - Replaced the previous “do not clear local state on logout failure” contract with a fail-closed contract.

### CLI

- `src/api/client.ts`
  - Added `draftUploadLockOwnerAppearsAlive()` and guarded stale lock deletion with `process.kill(pid, 0)`.
  - Unknown PID-check errors are treated conservatively as alive, except `ESRCH` which is dead.
- `tests/api-hook.test.ts`
  - Added a live-PID stale-mtime lock regression test.
- `tests/cli-collect.test.ts`
  - Added persisted upload metadata assertion for `collect --json --upload`.

## Remaining Blocker

> [!warning]
> Hosted production readiness is still externally blocked until DNS/deployment is fixed:
> - `api.agentfeed.dev` does not resolve in strict frontend hosted checks.
> - `https://agentfeed.dev/` currently redirects root to `/login` instead of serving the expected public root readiness response.

## Next Candidates

- Backend: single-consume OAuth state or stronger browser session token identity binding.
- Frontend: clear stored CLI authorize session IDs on terminal/non-retryable errors.
- CLI: retry browser auth exchange only for explicit transient failures while preserving fail-fast terminal auth errors.

