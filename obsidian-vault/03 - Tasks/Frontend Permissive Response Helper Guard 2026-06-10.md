---
type: task
status: done
area: frontend
created: 2026-06-10
related:
  - "[[Enterprise Completion Audit]]"
  - "[[Frontend Enum Parser Assertion Guard 2026-06-10]]"
---

# Frontend Permissive Response Helper Guard 2026-06-10

## Context

`src/lib/api.ts` still had two assertion-based reads in the permissive response wrappers:

- `value as Partial<Pagination>` in `normalizePagination`
- `value as Partial<ListResponse<T>>` in `normalizeListResponse`

The frontend already prevents production read paths from calling `normalizeListResponse` directly, but the helper remains exported and contract-tested. Removing these assertions keeps even legacy/permissive parsing aligned with the stricter unknown-boundary style.

## Changed

- `normalizePagination` now uses shared `isRecord` narrowing before reading `next_cursor` and `has_more`.
- `normalizeListResponse` now returns an explicit empty envelope for non-record values and reads `data`/`pagination` only after record narrowing.
- Added source contract guards to prevent the `Partial<Pagination>` and `Partial<ListResponse<T>>` assertions from returning.

## Verification

- Red/green: `npm run test:contracts` first failed on the new source guard, then passed after implementation.
- `npm run lint` passed (`tsc --noEmit`).
- Local CI passed with DNS-less/local API flags: typecheck, production dependency audit, contract tests, mock API compatibility, production build.
- Dev OpenAPI contract gate passed from `agentfeed-dev`: 75 operations, 70 client contracts, 40 response field contracts.
- Helper surface was rechecked through `npm run test:contracts`, including existing `normalizeListResponse<ApiWorklogCard>` cases for missing and partial list envelopes.
- LSP diagnostics could not run because local `typescript-language-server` is not installed; `npm run lint` is the replacement evidence for this pass.

## Not changed

- No backend/API schema changes.
- No deployment/server changes.
- `apiFetch<T>` still contains generic return casts (`emptyBodyValue as T`, `parsed as T`) because it is the broader fetch boundary and needs a separate parser-oriented design pass.
- `src/lib/api.ts` remains oversized. Splitting response wrappers and contract parser families should be handled as a dedicated refactor pass with regression coverage.

## Follow-up

- Design a safer `apiFetch` boundary that returns `unknown` or accepts parser callbacks before removing its generic `as T` casts.
- Consider extracting response wrapper helpers from `src/lib/api.ts` once a behavior-preserving split plan exists.
