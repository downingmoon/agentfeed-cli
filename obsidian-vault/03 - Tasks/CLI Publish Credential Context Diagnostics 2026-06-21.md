---
title: CLI Publish Credential Context Diagnostics 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/auth
  - agentfeed/contracts
  - project/tasks
---

# CLI Publish Credential Context Diagnostics 2026-06-21

## 배경

사용자 재현:

```text
unset -> agentfeed login -> agentfeed publish
HTTP 401: INGESTION_TOKEN_INVALID

echo "$AGENTFEED_TOKEN" -> empty
```

판단:

- `AGENTFEED_TOKEN`이 비어있는 것 자체는 browser login 저장 방식에서는 정상일 수 있다.
- `publish`의 401 `INGESTION_TOKEN_INVALID`는 정상 상태가 아니며, CLI가 저장된 토큰을 읽어 서버 preflight에 보냈지만 서버가 invalid/revoked로 거절한 상태다.
- 기존 `publish` preflight 실패 메시지는 저장 토큰 출처가 OS keychain인지 파일인지, API base가 어디서 왔는지 보여주지 않아 macOS keychain/login 문제를 사용자가 구분하기 어려웠다.

## 범위

- CLI only.
- 신규 기능 추가 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 금지 유지.
- 기존 command-surface 미커밋 리팩터는 보존하고 별도 작업으로 취급.

## 변경

- `src/cli/upload-guidance.ts`
  - upload recovery message에 optional credential context 섹션을 추가했다.
  - browser login은 `AGENTFEED_TOKEN`을 현재 shell에 export하지 않으므로 빈 env 출력이 정상일 수 있음을 오류 문맥에 명시했다.
- `src/cli/upload-preflight.ts`
  - API compatibility / ingestion token preflight 실패 메시지가 credential context를 포함할 수 있게 했다.
- `src/cli/publish-execution.ts`
  - 기본 publish 경로가 `loadCredentialsWithMetadata({ cwd })`를 사용하도록 변경했다.
  - preflight에 token source, credential store, API base URL/source, credentials file path를 전달한다.
  - 기존 테스트용 `loadCredentials` dependency는 호환 유지한다.
- `tests/upload-preflight.test.ts`
  - saved-token 401 preflight 실패 메시지가 credential context를 포함하는 회귀 테스트 추가.
- `tests/publish-execution.test.ts`
  - keychain 저장 토큰 provenance가 publish preflight로 전달되는 회귀 테스트 추가.

## 검증

- `npx tsc --noEmit --pretty false` 통과.
- `npm run build` 통과.
- `npm test -- --run tests/upload-preflight.test.ts tests/publish-execution.test.ts` 통과.
  - 2 files / 13 tests passed.
- `npm test -- --run` 통과.
  - 110 files / 833 tests passed.
- `git diff --check` 통과.
- changed-file no-excuse grep 통과.
- Manual QA 통과.
  - 임시 HOME/project와 fake API를 만들고 `dist/cli/index.js publish --id draft_context_smoke --yes --no-open-review --no-clipboard`를 실행했다.
  - fake API `/v1/metadata`는 호환 metadata, `/v1/ingest/status`는 401 `INGESTION_TOKEN_INVALID`를 반환했다.
  - CLI exit code 1, stderr에 `HTTP 401: INGESTION_TOKEN_INVALID`, `Credential context:`, `User/token source: saved credentials file`, 빈 `AGENTFEED_TOKEN` 설명이 출력됨을 확인했다.
- LSP diagnostics는 로컬 LSP transport가 `Transport closed`로 실패해 `tsc --noEmit`을 대체 증거로 사용했다.

## 후행 과제

- 실제 개발서버에서 새 CLI 빌드/설치 후 `agentfeed publish` 401 메시지가 credential context를 출력하는지 수동 확인 필요.
- browser login 직후 `/v1/ingest/status`는 이미 저장 전 검증하므로, 여전히 `login succeeded -> publish 401`이면 다음 후보는 다음과 같다.
  - 사용 중인 CLI binary/link가 다른 빌드임.
  - login과 publish의 API base URL이 다름.
  - 서버가 발급 직후 token을 revoke/invalid 상태로 만들거나 ingestion status와 publish preflight 사이에 다른 token record를 참조함.
