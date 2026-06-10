---
title: Frontend Non JSON API Error Diagnostics 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - frontend
  - api-contract
  - error-handling
  - fail-closed
status: done
related:
  - "[[CLI Non JSON Error Diagnostics 2026-06-10]]"
  - "[[Frontend ErrorResponse Envelope Strict Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend Non JSON API Error Diagnostics 2026-06-10

## 결론

Frontend `apiFetch`가 non-OK API 응답을 받았는데 응답이 JSON이 아닌 경우에도, 사용자가 운영 장애 단서를 볼 수 있도록 안전한 diagnostic을 남기게 했다.

> [!success]
> HTML/text gateway/proxy 오류는 `HTTP status`, `content-type`, 짧은 body preview를 포함한 `ApiError.diagnosticBody`로 fail-closed 된다. 토큰, Bearer 값, GitHub token prefix, URL userinfo/query/hash 등은 preview 생성 전에 redaction 한다.

## 문제

기존 `apiFetch`는 non-OK 응답에서 항상 Backend `ErrorResponse` JSON envelope를 파싱했다. reverse proxy나 gateway가 HTML/text body를 반환하면 실제 단서가 아래 contract mismatch로만 보일 수 있었다.

- `AgentFeed API error response contract mismatch: error response must be valid JSON`

이 메시지는 계약 위반을 감지한다는 점은 좋지만, operator/user가 장애 원인에 접근하기 어렵다.

## 변경 사항

- `src/lib/api-error-diagnostics.ts` 추가.
  - Backend `ErrorResponse` parser를 `src/lib/api.ts`에서 분리.
  - non-JSON error diagnostic 생성 helper 추가.
  - body preview는 160자 이하로 제한.
  - secret/token/credential-like 문자열 redaction.
- `src/lib/api.ts` 변경.
  - non-OK + non-JSON response를 JSON envelope parser 전에 `ApiError(502, diagnosticBody)`로 변환.
  - malformed JSON error envelope는 기존처럼 502 contract mismatch로 유지.
  - auth error event는 정상 Backend error envelope가 검증된 뒤에만 dispatch한다.
- `src/lib/api-error-diagnostics.contract.test.ts` 추가.
  - auth API non-JSON error diagnostic이 HTTP/body clue를 보존하는지 확인.
  - mutation API non-JSON error diagnostic이 token-like 문자열을 redaction 하는지 확인.
- `scripts/run-contract-tests.mjs`에 새 contract test 등록.

## Red / Green evidence

Red:

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test
```

- Result: failed with `non-JSON auth API errors must expose safe HTTP/body diagnostics`.

Green:

```bash
npm test
npm run lint
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  AGENTFEED_ALLOW_LOCAL_API_BUILD=1 \
  AGENTFEED_LOCAL_DNSLESS_CI=1 \
  AGENTFEED_SKIP_PROD_API_COMPAT=1 \
  npm run build
```

- Result: contract suite passed.
- Result: `tsc --noEmit` passed.
- Result: Next.js production build passed, 18 static pages generated.

> [!note]
> LSP diagnostics는 로컬 `typescript-language-server` 미설치로 실행되지 않았다. 동일 범위는 `tsc --noEmit`와 Next build typecheck로 검증했다.

## 배포 여부

> [!warning]
> 현재 enterprise-readiness goal 규칙에 따라 서버/인프라/CICD/배포는 진행하지 않았다.

## Follow-up

- [ ] Frontend UI error banner에서 `ApiError.diagnosticBody`의 operator-facing 상세를 어디까지 노출할지 UX 정책을 별도 점검한다.
- [ ] Backend gateway/reverse proxy 레벨이 AgentFeed `ErrorResponse` envelope를 반환하도록 통일할 수 있는지는 서버/인프라 단계에서 검토한다.
