---
title: Frontend Safe API Diagnostic Display 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - frontend
  - api-contract
  - error-handling
  - ui-feedback
status: done
related:
  - "[[Frontend Non JSON API Error Diagnostics 2026-06-10]]"
  - "[[CLI Non JSON Error Diagnostics 2026-06-10]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend Safe API Diagnostic Display 2026-06-10

## 결론

Frontend가 non-JSON API 오류에 대해 안전한 diagnostic을 생성해도, 대부분의 UI는 `ApiError.message`만 렌더링하므로 실제 화면에서는 generic server error로 보일 수 있었다. 이번 pass에서 Frontend가 직접 생성한 안전 diagnostic만 `ApiError.message`로 승격했다.

> [!success]
> Raw backend body는 계속 generic message로 보호한다. 단, allowlist된 client-generated diagnostic은 `ApiError.message`에도 표시되어 feed/profile/settings 등 기존 `error.message` UI 경로에서 사용자가 HTTP/body clue를 볼 수 있다.

## 문제

이전 pass에서 `ApiError.diagnosticBody`는 다음 정보를 안전하게 보존했다.

- HTTP status
- content-type
- redacted body preview

하지만 실제 UI 대부분은 아래 형태를 사용한다.

```tsx
{error.message}
```

따라서 safe diagnostic이 만들어져도 사용자에게는 `AgentFeed is temporarily unavailable. Please try again later.` 같은 generic copy만 보일 수 있었다.

## 변경 사항

- `src/lib/api-error-diagnostics.ts`
  - `safeUserFacingApiDiagnostic()` 추가.
  - user-facing 승격은 allowlist prefix만 허용.
  - 최대 240자 제한.
- `src/lib/api.ts`
  - `ApiError` 생성자가 raw body를 바로 message로 쓰지 않고 `safeUserFacingApiDiagnostic(body) ?? apiErrorDisplayMessage(status)`를 사용.
  - raw backend error body는 기존처럼 generic message 유지.
- `src/lib/api-error-diagnostics.contract.test.ts`
  - non-JSON auth/mutation API error가 `diagnosticBody`뿐 아니라 `message`에도 안전한 clue를 노출하는지 검증.
  - secret-like 문자열이 `message`에도 노출되지 않는지 검증.

## Red / Green evidence

Red:

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test
```

- Result: failed with `non-JSON auth API errors must surface safe diagnostics through user-facing ApiError.message`.

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

Additional source check:

```bash
rg -n "as any|as unknown|@ts-ignore|@ts-expect-error|catch \\{\\}|catch \\([^)]*\\) \\{\\s*\\}" src/lib/api-error-diagnostics.ts src/lib/api-error-diagnostics.contract.test.ts src/lib/api.ts
```

- Result: no matches.

> [!note]
> LSP diagnostics는 로컬 `typescript-language-server` 미설치로 실행되지 않았다. 동일 범위는 `tsc --noEmit`와 Next build typecheck로 검증했다.

## 배포 여부

> [!warning]
> 현재 enterprise-readiness goal 규칙에 따라 서버/인프라/CICD/배포는 진행하지 않았다.

## Follow-up

- [ ] API compatibility banner와 page-level error states가 safe diagnostic을 너무 길게 렌더링하지 않는지 visual smoke에서 확인한다.
- [ ] 서버/인프라 단계에서 gateway/proxy가 AgentFeed `ErrorResponse` envelope를 직접 반환할 수 있는지 검토한다.
