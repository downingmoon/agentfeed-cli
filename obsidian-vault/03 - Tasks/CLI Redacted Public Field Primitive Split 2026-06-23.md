---
title: CLI Redacted Public Field Primitive Split 2026-06-23
aliases:
  - CLI redacted public field primitive split
  - Redacted public field parser split
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - privacy
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: 489660cc592c04850953094eaf868da1c0d0a410
---

# CLI Redacted Public Field Primitive Split 2026-06-23

> [!success]
> CLI privacy boundary parser `src/privacy/redacted-public-fields.ts`에서 redacted public field primitive validators/types/enums를 `src/privacy/redacted-public-field-primitives.ts`로 분리했다. Public import path는 유지했다.

## 변경 내용

- `src/privacy/redacted-public-fields.ts`
  - 기존 public `parseRedactedPatch`, `PublicScanFields`, `RedactedPublicPatch` import path 유지.
  - metrics/timeline/project patch parsing responsibility만 보존.
  - 236 pure LOC oversized source 후보에서 131 pure LOC로 축소.
- `src/privacy/redacted-public-field-primitives.ts`
  - `PublicScanFields`, `RedactedPublicPatch`, metric numeric field list, record/string/array/number validators, agent/collection/timeline enum parsers, repository URL normalization을 담당.
  - 128 pure LOC.

## 검증

- Targeted privacy/parser surface: `npm test -- --run tests/privacy.test.ts tests/draft-redacted-fields.test.ts tests/scan-command.test.ts tests/cli-scan.test.ts tests/cli-scan-json.test.ts tests/cli-scan-path.test.ts tests/draft-output-sanitizer.test.ts tests/cli-publish-redaction-rescan-contract.test.ts tests/cli-share-json-upload-redaction.test.ts` → 9 files / 63 tests passed.
- `npm run typecheck` → passed.
- `npm run build` → passed.
- `git diff --check` / staged `git diff --staged --check` → passed.
- Full CLI suite: `npm test -- --run` → 226 files / 848 tests passed.
- Manual CLI smoke: built `dist/cli/index.js scan --path <temp git repo> --json` → JSON inspect-only scan completed with exit 0.
- Built parser smoke: `dist/privacy/redacted-public-fields.js` `parseRedactedPatch()` preserved metric/timeline/project parsing and stripped repository URL userinfo.
- Changed-file no-excuse grep → no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, TODO/FIXME, eslint-disable, empty catch, or non-null assertion additions.
- LSP diagnostics attempted for changed TypeScript files but failed with `Transport closed`; `typecheck`, `build`, targeted/full tests, and built smoke checks were used as fallback evidence.

## 후행 과제

- 남은 CLI source 190+ pure LOC 후보:
  - `src/collectors/agent-session.ts` — 1157 pure LOC.
  - `src/draft/create.ts` — 607 pure LOC.
  - `src/config/credentials.ts` — 603 pure LOC.
  - `src/collectors/test-command.ts` — 308 pure LOC.
  - `src/types.ts` — 233 pure LOC.
  - `src/cli/index.ts` — 230 pure LOC.
  - `src/draft/validation.ts` — 225 pure LOC.
  - `src/config/project-config.ts` — 222 pure LOC.
  - `src/api/draft-upload-lock.ts` — 215 pure LOC.
- 서버/인프라/CI/CD 변경 없음.
- 신규 앱 기능 없음.
- 서버 배포 금지 조건 때문에 push/deploy 없음.

## 관련

- [[CLI Publish Cache Reuse Test Split 2026-06-23]]
- [[Active Tasks]]
