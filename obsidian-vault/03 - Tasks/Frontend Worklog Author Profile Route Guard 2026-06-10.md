---
title: Frontend Worklog Author Profile Route Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/identity
  - agentfeed/enterprise-readiness
status: done
aliases:
  - Worklog author profile route fallback guard
---

# Frontend Worklog Author Profile Route Guard 2026-06-10

> [!success]
> Worklog 작성자 표시에서 backend가 공개 username/profileUsername을 주지 않은 partial hydrated author에 대해 `/profile/unknown` 같은 합성 프로필 경로를 만들지 않도록 막았다.

## 배경

[[Active Tasks]]의 enterprise-readiness pass 중 worklog card 작성자 fallback을 재점검했다. 기존 로직은 `_author`가 일부만 hydrate된 경우에도 `profileUsername`을 fallback `username`에서 만들 수 있었다.

문제 예시:

```ts
{
  author: 'backend-user-id-only',
  _author: { name: 'Visible GitHub Name' }
}
```

이 경우 display name은 backend가 준 값을 유지해도 되지만, 공개 프로필 route는 backend가 명시적으로 준 `profileUsername` 또는 public `username`이 있을 때만 열려야 한다. synthetic handle이나 legacy backend id를 public route로 노출하면 identity contract가 흔들린다.

## 변경

- Frontend commit `f977e69 Avoid synthesized worklog author profile routes`
- `src/components/worklog/worklogAuthor.ts`
  - `providedUsername`을 fallback username과 분리.
  - `profileUsername`은 다음 source만 허용:
    - explicit `author.profileUsername`
    - backend-provided `author.username`
    - explicit `null`은 no-profile route로 보존
  - generic fallback `unknown`은 표시용 username으로만 쓰고 profile link source로 사용하지 않음.
- `src/lib/worklog-author-avatar.contract.test.ts`
  - partial hydrated author가 display name은 보존하되 profile route를 합성하지 않는 회귀 테스트 추가.
- `src/lib/page-source-contract.test.ts`
  - profile route가 generic fallback username에서 합성되지 않도록 source contract 추가.

## Contract rule

```text
Worklog author profile links may be derived only from explicit backend public identity fields: profileUsername or username.
Generic fallback usernames are display-only and must not create public profile routes.
```

> [!warning] 유지 규칙
> `worklog.author` 문자열은 legacy/backend id일 수 있다. UI가 표시 목적으로 generic fallback을 사용할 수는 있지만, public handle이나 profile link로 승격하면 안 된다.

## Verification evidence

- Red 확인:
  - `npm run test:contracts` → `partial hydrated worklog authors without backend usernames must not synthesize a public profile route`
- Frontend green:
  - `npm run test:contracts` → pass
  - `npm run lint` → pass
  - `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` → pass
- Not tested:
  - LSP diagnostics: local `typescript-language-server` is not installed.

## Related

- [[Frontend Worklog Author Generic Fallback Guard 2026-06-09]]
- [[User Avatar Owner Review Coverage 2026-06-08]]
- [[Frontend API JSON Boundary Guard 2026-06-10]]
- [[Backend CLI Auth Router Split 2026-06-10]]
