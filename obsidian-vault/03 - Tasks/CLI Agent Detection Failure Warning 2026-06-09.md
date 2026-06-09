---
title: CLI Agent Detection Failure Warning
date: 2026-06-09
tags:
  - agentfeed/cli
  - quality/error-handling
  - collection
status: done
related:
  - [[CLI Malformed Draft Duplicate Detection Warning 2026-06-09]]
  - [[CLI Agent Evidence Guidance 2026-06-09]]
---

# CLI Agent Detection Failure Warning 2026-06-09

> [!success] 완료
> `agentfeed collect/share`의 자동 agent signal detection이 실패할 때 더 이상 조용히 generic attribution으로 떨어지지 않고, 수집 결과의 `warnings`에 실패 원인과 복구 명령을 표시하도록 수정했다.

## 문제

`collectDraftWithStatus()` 내부의 자동 source 선택 과정에서 `detectAgentSignals()` 실패가 `catch(() => null)`로 무시되고 있었다.

영향:

- Claude/Codex/Gemini/OMC/OMX/Superpowers 신호 탐지 실패가 사용자에게 보이지 않음.
- 실제 agent evidence가 있는데도 `other` 또는 낮은 attribution으로 수집될 수 있음.
- Enterprise 품질 기준의 “조용히 catch하고 넘어가는 예외처리 제거”와 맞지 않음.

## 변경 사항

- `src/draft/create.ts`
  - `autoAgentSources()`가 `warnings`를 함께 반환하도록 변경.
  - signal detection 실패 시 enabled project agents는 유지하되, attribution fallback 이유를 warning으로 노출.
  - warning에는 다음 내용을 포함:
    - 자동 agent signal detection 실패 사실
    - 실패 원인 요약
    - `agentfeed doctor`
    - `agentfeed collect --source <source> --explain`
- `tests/draft-agent-detection-warning.test.ts`
  - `detectAgentSignals()` 실패를 mock으로 재현하고 warning이 반환되는지 검증.

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run build
npx vitest run tests/draft-agent-detection-warning.test.ts tests/cli-collect.test.ts --reporter=verbose
npm run release:preflight

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- CLI build/typecheck: 통과
- Targeted tests: `2 test files`, `24 tests passed`
- CLI release preflight: `28 test files`, `575 tests passed`
- Dev OpenAPI contract gate: 통과

## 서버/배포

> [!warning]
> active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후행 과제

- 실제 사용자 환경에서 agent signal detection 실패가 어떤 filesystem/permission 조건에서 발생하는지 추가 관찰할 수 있다.
- saved draft repair/delete UX는 별도 신규 기능으로 간주되므로 이번 변경에는 포함하지 않았다.
