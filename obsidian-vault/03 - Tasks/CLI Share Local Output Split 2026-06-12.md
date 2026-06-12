---
title: CLI Share Local Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Share Local Output Split 2026-06-12

> [!success] 완료
> `agentfeed share`의 dry-run/token-missing JSON payload 및 human next-action rendering을 `src/cli/share-output.ts`로 분리했다. `cmdShare`는 collection, credential, preflight, upload, cursor, review URL handoff orchestration만 유지한다.

## 변경 범위

- `src/cli/share-output.ts`
  - `shareLocalJsonPayload`로 dry-run/token-missing machine-readable payload 계약을 고정.
  - `shareUploadedJsonPayload`로 successful share upload JSON payload 계약을 고정.
  - `renderShareLocalNextLines`로 local-only human next section을 분리.
- `src/cli/index.ts`
  - share dry-run/token-missing JSON 조립 제거.
  - share upload JSON 조립 제거.
  - share local next-action human rendering 제거.
- `tests/share-output.test.ts`
  - privacy policy, upload skipped reason, next actions, collection explain, handoff/upload JSON shape를 순수 helper 단위로 고정.

## 검증

- Red: `npm test -- --run tests/share-output.test.ts`가 구현 전 `Cannot find module '../src/cli/share-output.js'`로 실패.
- Build: `npm run build` 통과.
- Typecheck: `npm run typecheck` 통과.
- Focused tests: `npm test -- --run tests/share-output.test.ts tests/cli-share.test.ts tests/upload-output.test.ts tests/cli-guidance-actions.test.ts` → 4 files / 64 tests 통과.
- Full regression: `npm test -- --run` → 92 files / 763 tests 통과.
- CLI smoke: temp git project + isolated HOME에서 `share --dry --all`, `share --dry --json --all`, `share --yes --json --all` 실행. Human dry-run output, parseable dry-run JSON, token-missing JSON `upload_skipped`와 `next_actions` 확인.
- Static: `git diff --check`, strict grep, OMO TypeScript no-excuse checker 통과.
- LOC: `src/cli/index.ts` 1247 → 1236 pure LOC, `src/cli/share-output.ts` 94 pure LOC.
- LSP: `typescript-language-server` 미설치/이전 declined 상태라 MCP LSP diagnostics 실행 불가.

## 효과

- CLI share local output 계약이 command orchestration에서 분리되어 CLI-Frontend-Backend contract drift 위험을 낮췄다.
- Share command의 API upload side effect와 JSON/human output 조립 책임이 분리되었다.
- 신규 기능, 서버, infra, CI/CD, 배포 작업은 수행하지 않았다.

## 후속

> [!todo]
> `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect다. 다음 safe slice는 `cmdPublish` JSON payload 또는 credential/config 진단 helper처럼 observable CLI 계약을 red test로 고정할 수 있는 부분만 분리한다.
