---
title: Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31
aliases:
  - Frontend Settings privacy controls
created: 2026-05-31
updated: 2026-05-31
status: implemented
tags:
  - agentfeed/frontend
  - agentfeed/privacy
  - agentfeed/commercial-readiness
  - project/task
---

# Commercial Readiness Hardening - Settings Privacy Controls 2026-05-31

> [!success]
> Frontend Settings가 Backend privacy settings 계약의 default visibility와 public metric toggles를 모두 직접 조작할 수 있게 되었습니다.

## 목적

사용자는 새 worklog/project 기본 공개 범위와 public metric 노출 정책을 UI에서 직접 제어할 수 있어야 합니다. API에 필드가 있어도 Settings UI에 없으면 commercial privacy control이 누락됩니다.

## 변경 계약

- Settings privacy section에 default visibility select를 추가합니다.
  - `default_worklog_visibility`
  - `default_project_visibility`
- Settings privacy section에 public metric toggles를 추가합니다.
  - `show_estimated_cost_publicly`
  - `show_file_count_publicly`
  - `show_line_count_publicly`
  - `show_test_count_publicly`
- 기존 save flow는 partial privacy state를 Backend `me.settings` update payload로 그대로 전달합니다.
- Source contract가 각 field가 SettingsPage에서 렌더/저장 경로에 존재하는지 고정합니다.

## 변경 파일

- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
- `agentfeed-frontend/src/lib/integration-contract.ts`

## 검증 증거

- `npm run lint`
- `npm run test:contracts`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build`
- `git diff --check`

## 관련 영역

- [[Integration - CLI Backend Frontend#2026-05-31 Settings privacy controls]]
- [[Privacy Safety#2026-05-31 Settings privacy controls]]
- [[Active Tasks#P1 후보]]
