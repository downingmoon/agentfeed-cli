---
title: Frontend Integration Setup Guide Surface 2026-06-08
aliases:
  - Settings Integration Setup Guides
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/contracts
status: done
updated: 2026-06-08
---

# Frontend Integration Setup Guide Surface 2026-06-08

## 결론

Backend가 제공하는 `/v1/integrations/{integration_type}/setup-guide` API가 Frontend Settings에서 실제로 소비되지 않는 gap을 닫았다.

이전 상태는 다음과 같았다.

- Backend는 GitHub/Claude Code/Codex/Cursor/Gemini CLI/TokScale setup guide endpoint를 제공했다.
- Frontend Settings는 `/me/integrations` status만 보여주고 setup guide API를 호출하지 않았다.
- 따라서 CLI command drift는 Backend contract test로 막았지만, 사용자는 Settings에서 실제 연결 명령을 볼 수 없었다.

## 수정 내용

- Frontend API client
  - `ApiIntegrationGuide`, `ApiIntegrationGuideStep` 타입 추가.
  - `integrations.setupGuide(type)` 반환 타입을 `unknown`에서 `ApiIntegrationGuide`로 고정.
- Frontend Settings
  - `/me/integrations` 성공 후 각 integration의 setup guide를 `integrationApi.setupGuide(integration.type)`로 가져온다.
  - guide fetch 실패는 `setupGuideError`로 section-level alert에 표시하고, settings/privacy/token 로딩은 유지한다.
  - 각 integration card가 Backend-provided step title/body/code를 렌더링한다.
  - CLI command snippet은 `.settings-integration-code`로 줄바꿈 가능한 code well에 표시한다.
- Source contract
  - Settings가 setup guide API client를 import하고, guide state/error/code rendering을 유지하도록 `page-source-contract` guard 추가.

## RED / GREEN Evidence

- RED: `npm run test:contracts`가 `settings page must import the setup guide API client...`로 실패.
- GREEN:
  - `npm run test:contracts` → 통과.
  - `npm run lint` → 통과.
  - `npm run check:api-compatibility:mock` → `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`.
  - `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8001 npm run build` → 통과.

## 후행 과제

- 실제 인증 브라우저 QA를 다시 수행하는 루프에서 `/settings` integration card가 Backend guide snippets를 시각적으로 잘 표시하는지 확인한다.
- Backend setup guide step이 늘어날 때는 [[Backend Integration Guide CLI Contract 2026-06-08]]의 stale command guard와 Frontend Settings rendering contract를 함께 유지한다.

관련: [[Integration - CLI Backend Frontend]], [[Active Tasks]]
