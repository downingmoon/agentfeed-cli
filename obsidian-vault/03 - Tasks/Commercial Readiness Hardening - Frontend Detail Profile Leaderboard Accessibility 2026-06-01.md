---
title: Frontend Detail Profile Leaderboard Accessibility
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/accessibility
  - agentfeed/commercial-readiness
status: done
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Active Tasks]]"
---

# Frontend Detail Profile Leaderboard Accessibility

> [!success]
> Feed/card 이후 남아 있던 public detail, profile, project detail, leaderboard, header control의 keyboard/screen-reader contract를 보강했습니다.

## 배경

이전 slice에서 `/feed`와 `WorklogCardA/B/C`의 keyboard 접근성을 보강했습니다. 이어서 parallel explorer와 Gemini advisor가 다음 남은 상용화 리스크를 확인했습니다.

- `WorklogDetailPage` author row가 clickable `div`였고 keyboard activation이 없었습니다.
- `ProfilePage` project card가 clickable `div`였고 keyboard activation이 없었습니다.
- Profile/Project tab과 Leaderboard filter는 시각적 `active`만 있고 selected state semantics가 없었습니다.
- Header theme icon button은 `title`만 있고 accessible name/pressed state가 없었습니다.
- Worklog detail like/bookmark/comment/copy prompt feedback과 Profile activity chart는 screen-reader state/name이 부족했습니다.

## 변경 사항

### Worklog detail

- Author row에 `role="link"`, `tabIndex={0}`, profile open `aria-label`, `Enter`/`Space` keyboard activation을 추가했습니다.
- Like/bookmark action에 stateful `aria-label`과 `aria-pressed`를 추가했습니다.
- Comment input에 placeholder와 별개인 `aria-label="Write a comment"`를 추가했습니다.
- Copy prompt feedback button에 `aria-live="polite"`를 추가했습니다.
- Comments load-more pending state를 `aria-busy` contract로 고정했습니다.

### Profile and project detail

- Profile tabs와 Project detail tabs에 `role="tablist"`, `role="tab"`, `aria-selected`, `aria-pressed`, labeled navigation을 추가했습니다.
- Profile follow button에 `aria-pressed`와 `aria-busy`를 추가했습니다.
- Profile project cards에 keyboard-focusable link role + named activation + `Enter`/`Space` handler를 추가했습니다.
- Profile activity bars에 date/session/public-worklog `aria-label`을 추가해 `title` tooltip에만 의존하지 않게 했습니다.
- Profile/Project load-more buttons에 `aria-busy`를 추가했습니다.

### Leaderboard and header

- Leaderboard category/period filters에 `aria-pressed`를 추가했습니다.
- Leaderboard profile links에 `View profile for ...` accessible name을 추가했습니다.
- Header theme icon button에 mode switch `aria-label`과 dark-mode `aria-pressed` state를 추가했습니다.

## Regression contract

`src/lib/page-source-contract.test.ts`가 다음 재발을 차단합니다.

- clickable profile/project/author navigation without keyboard path
- visual-only tab/filter selected state
- icon-only theme button without accessible name
- detail action state without labels/pressed state
- activity chart values hidden behind `title` only

## 검증 증거

> [!example] Frontend
> - `npm run test:contracts` → failed first on the new source contract before implementation
> - `npm run test:contracts` → passed after implementation
> - `npm run lint` → passed
> - `git diff --check` → passed
> - `npm run ci` → passed

> [!example] Cross-repo
> - `make test` in `agentfeed-dev` → passed
> - OpenAPI operations checked: 69
> - Client contracts checked: 66 (`cli`: 6, `frontend`: 60)
> - AgentFeed CLI tests: 262 passed
> - Backend pytest: 226 passed, 1 warning
> - Alembic offline migration chain generated successfully

## 협업 증거

- Codex subagent `explore`가 read-only scan으로 Profile project card, Worklog detail author row, Profile/Project tabs, Leaderboard filters, Header theme button gap을 확인했습니다.
- Gemini CLI advisor artifact: `.omx/artifacts/gemini-frontend-accessibility-20260601-115108.md`.

## 남은 리스크

> [!warning]
> 실제 VoiceOver/NVDA 또는 browser-based tab-order walkthrough는 아직 수동으로 확인하지 않았습니다. 다음 QA slice에서는 `/feed`, `/worklogs/{id}`, `/profile/{username}`, `/leaderboard`, `/projects/{owner}/{slug}`를 실제 브라우저에서 순회해야 합니다.

## 관련 링크

- [[Commercial Readiness Hardening - Frontend Accessibility and CLI Login Timeout Polling 2026-06-01]]
- [[Integration - CLI Backend Frontend]]
- [[Active Tasks]]
