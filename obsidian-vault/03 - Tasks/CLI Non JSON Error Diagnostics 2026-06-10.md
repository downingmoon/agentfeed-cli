---
title: CLI Non JSON Error Diagnostics 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - cli
  - api-contract
  - error-handling
  - fail-closed
status: done
related:
  - "[[CLI ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[CLI Success Response Envelope Guard 2026-06-08]]"
  - "[[AgentFeed Current Product Brief]]"
---

# CLI Non JSON Error Diagnostics 2026-06-10

## 결론

CLI가 non-OK API 응답을 받았는데 응답이 JSON이 아닌 경우, 더 이상 단순히 `invalid error response`로만 표시하지 않는다.

> [!success]
> 이제 CLI auth/upload 경로는 `HTTP status`, `content-type`, 짧은 body preview를 보여주되, 토큰/URL credential/query 같은 고위험 문자열은 먼저 redaction 한다. Upload 경로는 여전히 local draft를 pending으로 유지한다.

## 문제

`postJson()`/`postIngest()`는 non-OK 응답도 먼저 `response.json()`으로 파싱했다. HTML/text gateway 오류가 오면 `{}`로 흡수된 뒤 사용자는 아래와 같은 일반 메시지만 보게 됐다.

- `AgentFeed API returned an invalid error response.`
- `AgentFeed API returned an invalid error response. Local draft was kept.`

이 메시지는 실제 운영 장애에서 reverse proxy, CDN, upstream API 중 어디에서 어떤 상태가 났는지 파악하기 어렵다.

## 변경 사항

- `src/api/response-diagnostics.ts` 추가.
  - JSON content-type 판정 helper.
  - non-JSON error response diagnostic message 생성.
  - body preview는 160자 이하로 제한.
  - `Bearer ...`, `af_live_*`, GitHub token prefix, `token=/secret=/password=/api_key=` 형태, URL userinfo/query/hash를 redaction.
- `src/api/client.ts`의 `readResponseJson()`에서 non-OK + non-JSON 응답을 즉시 `API_RESPONSE_INVALID`로 fail-closed 처리.
- `tests/api-non-json-error-diagnostics.test.ts` 추가.
  - CLI auth non-JSON error가 HTTP/content-type/body clue를 보여주는지 확인.
  - Ingest upload non-JSON error가 local draft pending을 유지하고 secret을 노출하지 않는지 확인.

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npx vitest run tests/api-non-json-error-diagnostics.test.ts tests/api-hook.test.ts --reporter=verbose
```

- Result: `2 passed`, `132 passed`.

```bash
npm run typecheck
npm run build
npm test -- --run --testTimeout=60000
```

- Result: typecheck/build passed.
- Result: `34 passed`, `602 passed`.

> [!note]
> LSP diagnostics는 로컬에 `typescript-language-server`가 설치되어 있지 않아 실행되지 않았다. 동일 범위는 `tsc --noEmit`로 검증했다.

## 배포 여부

> [!warning]
> 현재 enterprise-readiness goal에서는 서버/인프라/CICD/배포가 보류 상태다. 이번 작업도 배포하지 않았다.

## Follow-up

- [ ] Dev OpenAPI gate에 CLI error parser field-set drift를 직접 감지하는 검사를 추가할지 검토.
- [ ] Frontend non-JSON gateway/proxy error도 같은 수준의 사용자 친화 diagnostics가 필요한지 별도 slice에서 점검.
