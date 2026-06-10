---
title: CLI Authorize Storage Boundary Guard 2026-06-10
aliases:
  - CLI Authorize Storage Boundary Guard
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/security
  - agentfeed/verification
updated: 2026-06-10
---

# CLI Authorize Storage Boundary Guard 2026-06-10

> [!success] 결론
> Frontend CLI 로그인 복구 경로의 `sessionStorage` JSON을 `as unknown` / `Partial<StoredCliSession>` 캐스팅으로 통과시키지 않고, `Record<string, unknown>` 경계에서 필드별로 구조 검증하도록 바꿨다. malformed/expired CLI authorize session은 fail-closed로 제거된다.

## 변경 범위

- Frontend `src/lib/cli-authorize-session.ts`
  - `JSON.parse` 결과를 `unknown`으로 받은 뒤 `isRecord`로 object 경계를 검증.
  - `session_id`, `status_token`, `stored_at`을 각각 타입/공백/finite number 기준으로 검증.
  - TTL 초과와 malformed 값은 기존처럼 저장값을 제거하고 `null`로 처리.
- Frontend `src/lib/cli-authorize-session.contract.test.ts`
  - 캐스팅 재도입 방지 source contract 추가.
  - fake `window.sessionStorage`로 valid/malformed/corrupt/incoming CLI session 동작 회귀 테스트 추가.
- Frontend `src/lib/page-source-contract.test.ts`
  - TTL guard source contract를 새 구조 검증 변수명에 맞게 갱신.
- Frontend `scripts/run-contract-tests.mjs`
  - CLI authorize storage contract를 전체 contract suite에 포함.

## Contract rule

```text
sessionStorage["agentfeed:cli-authorize-session-id"] must be JSON object {
  session_id: non-empty string,
  status_token: non-empty string,
  stored_at: finite number within 15 minutes
}
```

> [!warning] 유지 규칙
> CLI authorize storage는 OAuth redirect 중 URL 노출을 줄이기 위한 임시 복구 수단이다. 브라우저 storage에서 읽는 값은 항상 untrusted input으로 취급하고, typed cast로 앱 내부 타입에 바로 연결하지 않는다.

## Verification evidence

- Frontend:
  - `npm run test:contracts` → pass
  - `npm run lint` → pass
  - `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` → pass
- Static scan:
  - `rg "JSON\\.parse\\(value\\) as unknown|as Partial<StoredCliSession>|as unknown|as any|\\bany\\b|@ts-ignore|@ts-expect-error" src/lib/cli-authorize-session.ts` → no matches
- LOC check:
  - `src/lib/cli-authorize-session.ts` → 100 logical lines
  - `src/lib/cli-authorize-session.contract.test.ts` → 65 logical lines
- Not tested:
  - LSP diagnostics: local `typescript-language-server` is not installed.

## Related

- [[Public Guest Auth Probe Cleanup 2026-06-10]]
- [[Personal Server Deploy Refresh 2026-06-10]]
