---
title: CLI Auto Command Inference Warning
date: 2026-06-09
tags:
  - agentfeed/cli
  - quality/error-handling
  - collection
  - tests
status: done
related:
  - [[CLI Agent Detection Failure Warning 2026-06-09]]
  - [[CLI Malformed Draft Duplicate Detection Warning 2026-06-09]]
---

# CLI Auto Command Inference Warning 2026-06-09

> [!success] 완료
> `run_tests_on_collect=true`에서 test/build command를 `auto`로 추론할 때 `package.json` 또는 `Makefile`을 읽지 못하면 더 이상 조용히 명령 추론을 건너뛰지 않고, `collect/share` warning으로 사용자에게 표시하도록 수정했다.

## 문제

`src/collectors/test-command.ts`의 자동 test/build command 추론은 다음 실패를 조용히 fallback 처리했다.

- malformed `package.json`
- unreadable `Makefile`

영향:

- 사용자는 `run_tests_on_collect=true`를 설정했는데도 테스트/빌드가 왜 실행되지 않았는지 알 수 없음.
- draft metrics의 `tests_run`, `commands_run`이 `null`이어도 원인 진단이 어려움.
- 수집 evidence 신뢰도가 낮아짐.

## 변경 사항

- `src/collectors/test-command.ts`
  - `collectConfiguredCommandMetricsWithStatus()` 추가.
  - 기존 `collectConfiguredCommandMetrics()` 반환형은 유지해 기존 호출/테스트 호환성 보존.
  - auto inference 중 `package.json`/`Makefile` read failure를 warning으로 수집.
- `src/draft/create.ts`
  - configured command status의 `warnings`를 collect/share warning 경로에 병합.
- `tests/git-draft.test.ts`
  - malformed `package.json`에서 auto test/build command inference가 skip될 때 warning이 표시되는 회귀 테스트 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run build
npx vitest run tests/test-command.test.ts tests/git-draft.test.ts --reporter=verbose
npm run release:preflight

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- CLI build/typecheck: 통과
- Targeted tests: `2 test files`, `28 tests passed`
- CLI release preflight: `28 test files`, `576 tests passed`
- Dev OpenAPI contract gate: 통과

## 서버/배포

> [!warning]
> active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후행 과제

- command inference warning이 많아질 경우 `agentfeed doctor`의 command inference 섹션과 연결하는 문서/UX 개선을 검토할 수 있다.
- 별도 repair command는 신규 기능이므로 이번 변경에는 포함하지 않았다.
