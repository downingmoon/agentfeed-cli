---
title: CLI Upload Preflight Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Upload Preflight Split 2026-06-12

> [!success] 완료
> `agentfeed collect/share/publish/login` 앞단의 API compatibility 및 ingestion token preflight recovery를 `src/cli/upload-preflight.ts`로 분리했다. 업로드/credential-save 전 실패 메시지와 next action 계약은 기존 CLI-Backend 경계를 유지하며 테스트로 고정했다.

## 변경 범위

- `src/cli/upload-preflight.ts`
  - `requireApiCompatibilityBeforeUpload`로 upload 전 metadata contract check와 recovery command 조립을 전담.
  - `requireIngestionTokenBeforeUpload`로 upload 전 ingestion token check와 login/rotate/status recovery를 전담.
  - `requireUploadPreflight`로 compatibility → token 순서를 고정.
  - `requireApiCompatibilityBeforeCredentialSave`로 token credential 저장 전 API compatibility failure guidance를 전담.
- `src/cli/index.ts`
  - inline upload/credential preflight 함수와 recovery formatter import 제거.
  - command orchestration은 유지하고 preflight boundary만 helper import로 대체.
- `tests/upload-preflight.test.ts`
  - compatible metadata return, incompatible metadata recovery, network/no-status recovery, token failure recovery, check ordering, credential-save failure wording을 단위 테스트로 고정.

## 검증

- Red: `npm test -- --run tests/upload-preflight.test.ts`가 구현 전 `Cannot find module '../src/cli/upload-preflight.js'`로 실패.
- Unit: `npm test -- --run tests/upload-preflight.test.ts` → 1 file / 6 tests 통과.
- Build: `npm run build` 통과.
- Typecheck: `npm run typecheck` 통과.
- Focused regression: `npm test -- --run tests/upload-preflight.test.ts tests/cli-share.test.ts tests/cli-collect.test.ts tests/cli-status-doctor.test.ts tests/cli-preview.test.ts tests/api-hook.test.ts` → 6 files / 265 tests 통과.
- Full regression: `npm test -- --run` → 95 files / 774 tests 통과.
- CLI smoke: temp git project + isolated HOME + local fake AgentFeed API에서 `publish --id <draft> --yes --json` 실행.
  - incompatible `/v1/metadata` 응답 시 metadata 1회, token status 0회, ingest 0회로 차단 확인.
  - compatible metadata + 401 `/v1/ingest/status` 응답 시 metadata 1회, token status 1회, ingest 0회로 차단 확인.
- Static: `git diff --check`, OMO TypeScript no-excuse checker 통과.
- LOC: `src/cli/index.ts` 1175 → 1144 pure LOC, `src/cli/upload-preflight.ts` 55 pure LOC.
- LSP: `typescript-language-server` 미설치 상태라 MCP LSP diagnostics는 실행 불가.

## 효과

- CLI upload/credential preflight recovery가 command entrypoint에서 분리되어 CLI-Backend contract drift 위험을 줄였다.
- upload 전 safety order가 compatibility → token → ingest로 테스트에 명시되어 잘못된 API/토큰 상태에서 remote write가 발생하지 않는다.
- 신규 기능, 서버, infra, CI/CD, 개인서버 배포 작업은 수행하지 않았다.

## 후속

> [!todo]
> `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect다. 다음 safe slice는 credential/config diagnostic formatting 또는 status/doctor remaining orchestration처럼 observable CLI 계약을 red test로 고정할 수 있는 부분만 분리한다.
