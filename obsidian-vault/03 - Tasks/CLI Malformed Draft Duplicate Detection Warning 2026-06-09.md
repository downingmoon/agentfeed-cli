---
title: CLI Malformed Draft Duplicate Detection Warning
date: 2026-06-09
tags:
  - agentfeed/cli
  - quality/error-handling
  - collection
status: done
related:
  - [[CLI Explicit Session File Warning 2026-06-09]]
  - [[CLI Agent Evidence Guidance 2026-06-09]]
---

# CLI Malformed Draft Duplicate Detection Warning 2026-06-09

> [!success] 완료
> `agentfeed collect/share`의 duplicate draft 검사 중 기존 local draft JSON이 깨져 있으면 조용히 건너뛰지 않고, 수집 결과의 `warnings`에 사용자 조치가 가능한 메시지를 표시하도록 수정했다.

## 문제

수집 fingerprint가 계산된 뒤 기존 draft 재사용 여부를 확인하는 과정에서 `readDraft()` 실패가 `catch(() => null)`로 처리되고 있었다.

영향:

- `.agentfeed/drafts/*.json` 중 하나가 손상되어도 사용자가 알 수 없음.
- duplicate detection의 입력 일부가 빠졌는데도 정상처럼 보일 수 있음.
- Enterprise 품질 기준의 “조용히 catch하고 넘어가는 예외처리 제거” 목표에 맞지 않음.

## 변경 사항

- `src/draft/create.ts`
  - `findDraftByFingerprint()`가 `draft + warnings`를 함께 반환하도록 변경.
  - malformed/unreadable saved draft를 skip할 때 다음 안내를 표시:
    - 어떤 draft id가 읽히지 않았는지
    - 파싱/검증 실패 원인 요약
    - `agentfeed drafts`로 확인
    - `agentfeed collect --explain`으로 fresh draft 생성
- `tests/cli-collect.test.ts`
  - malformed saved draft가 duplicate detection 중 skip될 때 `collect --json` 결과에 warning이 포함되는 회귀 테스트 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/AgentFeed-CLI
npm run build
npx vitest run tests/cli-collect.test.ts --reporter=verbose
npm run release:preflight

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- CLI build/typecheck: 통과
- Targeted collect tests: `23 passed`
- CLI release preflight: `27 test files`, `574 tests passed`
- Dev OpenAPI contract gate: 통과

## 서버/배포

> [!warning]
> 현재 active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후행 과제

- agent signal auto-detection 실패가 현재 수집 품질에 어떤 영향을 주는지 추가 점검할 수 있다.
- saved draft repair/delete UX를 별도 명령으로 만들지는 않았다. 필요하면 신규 기능 후보로만 문서화해야 한다.
