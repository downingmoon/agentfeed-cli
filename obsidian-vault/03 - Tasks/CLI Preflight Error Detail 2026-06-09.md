---
title: CLI Preflight Error Detail 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/cli
  - quality/error-handling
  - contract/api
status: done
related:
  - "[[AgentFeed Enterprise Completion Goal]]"
  - "[[CLI Command Audit 2026-06-07]]"
---

# CLI Preflight Error Detail 2026-06-09

> [!success] 완료
> `agentfeed share` / `agentfeed publish` 업로드 전 API 호환성·토큰 프리플라이트 오류가 `HTTP 200`, `HTTP 401`처럼 상태 코드만 보이던 문제를 수정했다.

## 문제

- API 호환성 검사 실패 메시지가 `status`가 있으면 `error` 상세를 숨겼다.
- `/ingest/status` 비정상 응답에서 백엔드 표준 오류 envelope를 파싱해도 `checkIngestionToken()` 반환값이 해당 오류를 버렸다.
- 결과적으로 사용자는 토큰 만료/무효, metadata contract mismatch 같은 원인을 명확히 볼 수 없었다.

## 수정

- `src/api/client.ts`
  - API 오류 envelope `{ error: { code, message } }`를 `CODE: message` 형식으로 요약하는 헬퍼를 추가했다.
  - `/ingest/status` non-OK JSON 응답의 오류 상세를 보존한다.
  - `checkIngestionToken()`이 non-OK 응답에서도 파싱된 오류를 반환하도록 수정했다.
- `src/cli/index.ts`
  - API 호환성·토큰 검사 실패 메시지를 `HTTP <status>: <detail>` 형식으로 출력하도록 수정했다.
- `tests/api-hook.test.ts`, `tests/cli-share.test.ts`
  - 무효 토큰 응답의 `INGESTION_TOKEN_INVALID: Invalid ingestion token` 상세가 CLI 출력까지 전달되는 회귀 테스트를 추가/갱신했다.

## 검증

```bash
npm run build
npx vitest run tests/api-hook.test.ts tests/cli-share.test.ts --reporter=verbose
npm run release:preflight
cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs
```

결과:

- `npm run build`: 통과
- `tests/api-hook.test.ts`, `tests/cli-share.test.ts`: 2 files / 171 tests 통과
- `npm run release:preflight`: 28 files / 576 tests 통과, package smoke 통과
- OpenAPI contract gate: 75 operations / 70 client contracts 통과

## 배포 메모

> [!info]
> 이번 수정은 CLI 전용 프리플라이트 오류 표시 개선이다. 서버 API contract는 변경하지 않았다.

## 후속 작업

- [ ] 실제 hosted API에서 의도적으로 무효 토큰을 주입하는 live fault-injection은 별도 E2E 패스에서 수행한다.
- [ ] 예기치 않은 non-JSON 오류 body는 민감정보 노출 가능성이 있어 본문을 그대로 출력하지 않는 정책을 유지한다.
