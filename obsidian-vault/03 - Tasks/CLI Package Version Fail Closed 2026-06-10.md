---
type: task
status: done
created: 2026-06-10
tags:
  - agentfeed/contract
  - agentfeed/cli
repos:
  - AgentFeed-CLI
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[CLI Metadata Parse Error Clarity 2026-06-08]]"
  - "[[CLI ErrorResponse Envelope Strict Guard 2026-06-09]]"
---

# CLI Package Version Fail Closed 2026-06-10

## 배경

CLI가 업로드 payload와 진단 화면에 표시하는 버전은 `package.json`이 단일 source of truth다.

기존 `src/version.ts`는 package metadata에서 `version`을 읽지 못하면 `0.0.0`으로 조용히 fallback했다. 이 fallback은 실행을 계속하게 해주지만 다음 문제를 만든다.

- `agentfeed-cli/0.0.0` 같은 가짜 tool version이 draft/source metadata로 전송될 수 있다.
- Backend metadata compatibility check가 실제 CLI 버전 대신 fallback 버전으로 판단될 수 있다.
- 배포 패키징 오류가 사용자-facing 오류 없이 데이터 품질 문제로 누적될 수 있다.

## 변경

- `AgentFeed-CLI/src/version.ts`
  - `packageVersionFromMetadata(metadata: unknown)` boundary parser 추가.
  - `version`이 semver 형태가 아니면 즉시 `AgentFeed package metadata is missing a valid semver version.` 오류로 fail-closed.
  - `packageJson.version ?? '0.0.0'` fallback 제거.
  - `require('../package.json')` 결과를 `unknown`으로 받고 parser에서 좁히도록 변경.
- `AgentFeed-CLI/tests/version.test.ts`
  - 정상 package version parsing contract 추가.
  - `{}`, `''`, `0.2`, `latest`, `null` metadata가 모두 오류로 드러나는 regression 추가.

## Contract

CLI version metadata는 실제 package semver만 허용한다.

- 정상: `0.2.0`, prerelease/build metadata 포함 semver.
- 비정상: missing, blank, partial version, label-only version.
- 비정상 metadata는 `0.0.0`으로 대체하지 않는다.

## 검증

- Red 확인:
  - `npm test -- --run tests/version.test.ts`
  - 기존 구현에서 `packageVersionFromMetadata is not a function`으로 실패.
- Green 확인:
  - `npm test -- --run tests/version.test.ts` → 5 passed.
  - `npm run typecheck` → `tsc --noEmit` passed.
  - `npm run build` → `tsc` + `ensure-bin-executable` passed.
  - `npm test -- --run` → 32 files, 599 tests passed.
- LOC 확인:
  - `src/version.ts` → 15 pure LOC.
  - `tests/version.test.ts` → 99 pure LOC.
- LSP diagnostics:
  - `typescript-language-server` 미설치로 실행 불가. `npm run typecheck`로 대체 검증했다.

## 후행 과제

> [!todo]
> release preflight에서 `dist/version.js` smoke 결과는 이미 package version과 비교한다. 이후 package metadata schema가 늘어나면 `packageVersionFromMetadata`와 release preflight가 같은 규칙을 유지하도록 contract test를 함께 갱신한다.
