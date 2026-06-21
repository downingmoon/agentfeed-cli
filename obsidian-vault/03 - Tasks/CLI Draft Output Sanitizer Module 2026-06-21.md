---
title: CLI Draft Output Sanitizer Module 2026-06-21
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/privacy
  - agentfeed/contract
  - evidence
status: done
aliases:
  - 2026-06-21 CLI draft output sanitizer module
  - CLI draft output sanitizer module
---

# CLI Draft Output Sanitizer Module 2026-06-21

> [!success]
> CLI draft output redaction/write 계약을 `src/cli/draft-output-sanitizer.ts` 단일 모듈로 고정했다. `collect`, `share`, `preview`가 같은 sanitizer를 재사용하므로 public draft fields redaction drift 위험이 줄었다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 계약 초점: CLI public draft output privacy sanitizer

## Root Cause

`scanAndRedactDraftPublicFields(draft)` 후 `writeDraft(cwd, draft)`를 호출하는 같은 구현이 여러 CLI 실행 경로에 중복되어 있었다.

- `src/cli/index.ts` collect output
- `src/cli/share-collection-execution.ts` share collection output
- `src/cli/share-upload-execution.ts` share JSON uploaded draft output
- `src/cli/collect-upload-execution.ts` collect JSON uploaded draft output
- `src/cli/preview-execution.ts` preview output

각 경로가 같은 privacy/write 계약을 복제하면 향후 한 경로만 수정되어 CLI-Backend/Frontend에 노출되는 draft public fields가 달라질 수 있다.

## Actions

1. `src/cli/draft-output-sanitizer.ts`를 추가하고 `sanitizeDraftForCliOutput(cwd, draft)`를 public draft output sanitizer의 단일 진입점으로 만들었다.
2. `index`, `share-collection`, `share-upload`, `collect-upload`, `preview` 실행 경로의 중복 redaction/write 구현을 제거하고 공용 sanitizer를 사용하게 했다.
3. `tests/draft-output-sanitizer.test.ts`를 추가해 secret-like public field가 in-memory draft와 persisted JSON draft 모두에서 redaction되는지 고정했다.

## Verification Evidence

```text
npm test -- --run tests/draft-output-sanitizer.test.ts
npm test -- --run tests/draft-output-sanitizer.test.ts tests/share-upload-execution.test.ts tests/collect-upload-execution.test.ts tests/share-collection-execution.test.ts tests/preview-execution.test.ts tests/cli-share.test.ts tests/cli-collect.test.ts tests/cli-preview.test.ts
npm run typecheck
npm run build
node --input-type=module - <<'NODE' # dist CLI share --json --dry --note secret manual QA
```

Result:

```text
Red: draft-output-sanitizer module import failed before implementation.
Focused sanitizer test: 1 passed.
Expanded CLI tests: 8 files passed, 103 tests passed.
tsc --noEmit passed.
tsc build passed.
Manual QA: outputContainsSecret=false, savedContainsSecret=false, note="Manual QA [REDACTED_SECRET]".
```

> [!note]
> LSP diagnostics tool returned `Transport closed`; `tsc --noEmit`, build, focused tests, integration tests, and actual `dist` CLI QA were used as fallback evidence.

## Follow-up

> [!todo]
> `src/cli/scan-command.ts` intentionally remains separate because it computes a scan result and writes it as command behavior, not just output sanitization. If scan command behavior is refactored later, keep this distinction explicit.

> [!todo]
> `src/cli/index.ts` is still oversized as a command multiplexer. Continue extracting command execution modules without changing CLI behavior.
