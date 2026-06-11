---
title: CLI Validation Primitive Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - cli
  - refactor
  - validation
  - enterprise-hardening
status: done
related:
  - "[[Ingestion Evidence Contract Guard 2026-06-11]]"
---

# CLI Validation Primitive Split 2026-06-11

> [!summary]
> Split CLI draft validation helpers by responsibility so future contract guards can be added without pushing `validation-primitives.ts` past the 250 pure-LOC ceiling.

## Why

The previous ingestion evidence guard left `src/draft/validation-primitives.ts` at 245 pure LOC. That was still below the hard ceiling, but too close for safe enterprise maintenance. The next validation primitive would have forced an urgent split.

## Change

- Kept low-level shape/string/number/array helpers in `src/draft/validation-primitives.ts`.
- Moved domain/literal validators into `src/draft/validation-enums.ts`:
  - agent type
  - worklog category
  - privacy status/severity/finding/resolution
  - timeline status
  - collection quality/source/window reason
- Updated `src/draft/validation.ts` imports only; behavior remains unchanged.

## Verification

```bash
npm test -- tests/draft-validation.test.ts
# result: 1 test file passed, 6 tests passed

npm run typecheck && npm run build && npm test
# result: tsc --noEmit passed, build passed, 37 test files / 613 tests passed
```

## File-size review

| File | Pure LOC | Status |
| --- | ---: | --- |
| `src/draft/validation-primitives.ts` | 125 | Healthy |
| `src/draft/validation-enums.ts` | 121 | Healthy |
| `src/draft/validation.ts` | 225 | Warning band; acceptable because no new logic was added |
| `tests/draft-validation.test.ts` | 130 | Healthy |

> [!info]
> TypeScript LSP diagnostics were unavailable in this environment because `typescript-language-server` is not installed. `tsc --noEmit` was used as the authoritative substitute.

## Follow-up

- [ ] Continue contract-hardening slices across CLI/API/Frontend.
- [ ] If `src/draft/validation.ts` grows again, split metrics/source/privacy validation into focused modules.
