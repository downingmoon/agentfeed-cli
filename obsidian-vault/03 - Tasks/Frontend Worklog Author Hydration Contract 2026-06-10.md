---
type: task
status: done
created: 2026-06-10
tags:
  - agentfeed/contract
  - agentfeed/frontend
repos:
  - agentfeed-frontend
  - AgentFeed-CLI
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Frontend Worklog Card Adapter Fail Closed 2026-06-08]]"
  - "[[Frontend Profile Prompt Avatar Coverage 2026-06-08]]"
---

# Frontend Worklog Author Hydration Contract 2026-06-10

## 배경

Backend `WorklogCard` contract는 `author: PublicUser`를 필수 payload로 제공한다. Frontend API normalizer와 adapter도 이 값을 검증한 뒤 `WorklogWithAuthor._author` view model로 변환한다.

하지만 카드 UI helper `getWorklogAuthor()`는 이후 단계에서 `_author`가 없거나 부분 객체인 경우에도 `Unknown author` fallback user를 합성할 수 있었다. 이 fallback은 과거 legacy payload 보호에는 유용했지만, 현재 strict API boundary 이후에는 다음 문제를 만든다.

- Backend/Frontend author contract 불일치가 카드 UI에서 조용히 숨겨질 수 있다.
- GitHub avatar/profile identity가 누락된 malformed view model이 “unknown” 사용자로 렌더링될 수 있다.
- `WorklogCard` surface가 `Worklog`만 받는 타입이라 hydrated author가 필수라는 사실을 컴파일러가 강제하지 못한다.

## 변경

- `agentfeed-frontend/src/components/worklog/worklogAuthor.ts`
  - `fallbackAuthor`, partial author normalization, generic `unknown` handle 합성을 제거.
  - `getWorklogAuthor()` 입력을 `WorklogWithAuthor`로 좁힘.
  - `_author.name`, `_author.username`, avatar color가 없으면 `Frontend worklog author contract mismatch`로 fail-closed.
- `agentfeed-frontend/src/components/worklog/WorklogCard*.tsx`
  - shared card surface `w` prop을 `WorklogWithAuthor`로 좁힘.
- `agentfeed-frontend/src/hooks/useFeed.ts`, `useWorklog.ts`, Landing/Profile/Project/Dashboard pages
  - adapter 결과를 `WorklogWithAuthor` 상태로 보존해 hydrated author requirement가 downstream까지 유지되도록 수정.
- `agentfeed-frontend/src/lib/worklog-author-avatar.contract.test.ts`
  - hydrated author avatar/name/username 보존을 확인.
  - missing/null/partial `_author`가 fallback 대신 visible contract error를 내는 regression 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - worklog author fallback 재도입 방지 source contract 갱신.

## Contract

Worklog card/detail UI는 API adapter를 통과한 `WorklogWithAuthor`만 렌더링해야 한다.

- `ApiWorklogCard.author`는 API boundary에서 검증한다.
- `adaptWorklogCard()`는 `author`를 `WorklogWithAuthor._author`로 변환한다.
- `WorklogCard`와 `getWorklogAuthor()`는 `_author` 결손을 자체 fallback으로 합성하지 않는다.
- fallback avatar URL은 `adaptUser()`의 GitHub URL fallback까지만 허용한다.

## 검증

- Red 확인:
  - `npm run test:contracts` → 기존 구현에서 `getWorklogAuthor must fail closed when the hydrated author view model is missing or malformed`로 실패.
- Green 확인:
  - `npm run test:contracts` → passed.
  - `npm run lint` → `tsc --noEmit` passed.
  - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build` → Next production build passed, `/feed`, `/worklogs/[id]`, `/profile/[username]`, `/projects/[...projectPath]` 포함 18 static pages generated.
- LOC 확인:
  - `src/components/worklog/worklogAuthor.ts` → 23 pure LOC.
  - `src/lib/worklog-author-avatar.contract.test.ts` → 39 pure LOC.
  - `src/hooks/useFeed.ts` → 107 pure LOC.
  - `src/hooks/useWorklog.ts` → 41 pure LOC.
  - `src/components/worklog/WorklogCard.tsx` → 22 pure LOC.
- LSP diagnostics:
  - `typescript-language-server` 미설치로 실행 불가. `npm run lint`의 `tsc --noEmit`로 대체 검증했다.

## 후행 과제

> [!todo]
> `Worklog` base type이 여전히 legacy string `author` 필드를 포함한다. 신규 기능 없이 현재 scope에서는 card/detail surface만 `WorklogWithAuthor`로 좁혔다. 이후 다른 surface가 worklog author를 직접 렌더링한다면 `WorklogWithAuthor`를 요구하도록 확장한다.
