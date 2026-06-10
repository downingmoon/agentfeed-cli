---
title: Frontend Worklog Prompt Copy Error Detail 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/ui-ux
  - agentfeed/error-boundary
  - agentfeed/enterprise-readiness
status: done
aliases:
  - Worklog prompt copy failure detail
---

# Frontend Worklog Prompt Copy Error Detail 2026-06-10

> [!success]
> Worklog detail의 public prompt 복사 실패가 단순 `Copy failed`로 뭉개지지 않고, Clipboard API 미지원/권한 차단/브라우저 오류 원인을 live region에 표시하도록 보강했다.

## 배경

[[Active Tasks]]의 enterprise-readiness pass에서 조용한 catch와 단순 fallback을 다시 점검했다. `src/components/pages/WorklogDetailPage.tsx`의 `copyPrompt()`는 clipboard 실패 시 `setPromptCopyStatus('failed')`만 호출하고 실제 오류 원인을 버리고 있었다.

이 상태에서는 사용자가 다음 상황을 구분할 수 없다.

- 브라우저가 Clipboard API를 제공하지 않음
- 권한/보안 컨텍스트 때문에 clipboard 접근이 차단됨
- 브라우저/확장/환경 오류로 write가 실패함

## 변경

- Frontend commit `cdbc735 Expose worklog prompt copy failures`
- `src/components/pages/WorklogDetailPage.tsx`
  - `promptCopyFailureMessage(error: unknown)` 추가.
  - 실패 시 `setPromptCopyMessage(promptCopyFailureMessage(err))`로 원인을 사용자에게 표시.
  - 성공/실패 메시지를 기존 dedicated polite status live region에서 계속 표시.
  - 기존 public prompt copy flow, 버튼, 접근성 live region 구조는 유지.
- `src/lib/page-source-contract.test.ts`
  - copy 실패 이유를 버리는 bare catch 재도입 방지 contract 추가.
  - 실패 원인을 live region 메시지로 연결하는 contract 추가.

## Contract rule

```text
Worklog prompt clipboard failures must be visible to users through the dedicated polite status region and must not collapse all failures into a silent generic state.
```

> [!warning] 유지 규칙
> Clipboard failure는 UI 작업 실패이므로 사용자가 직접 해결할 수 있는 힌트를 남겨야 한다. 단순 `Copy failed`만 표시하거나 catch에서 오류 원인을 버리면 안 된다.

## Verification evidence

- Red 확인:
  - `npm run test:contracts` → `worklog detail copy prompt must preserve clipboard failure detail instead of silently collapsing all errors`
- Frontend green:
  - `npm run test:contracts` → pass
  - `npm run lint` → pass
  - `NEXT_PUBLIC_API_URL=https://api.example.com npm run build` → pass
- Not tested:
  - LSP diagnostics: local `typescript-language-server` is not installed.
  - Browser manual clipboard-denial QA: 이번 goal rule에 따라 서버/배포를 건드리지 않았고, 로컬 API-backed worklog page를 새로 띄우지 않았다.

## Related

- [[Frontend Worklog Author Profile Route Guard 2026-06-10]]
- [[Frontend API JSON Boundary Guard 2026-06-10]]
- [[Frontend Worklog Source Viewer Guard 2026-06-08]]
