---
title: CLI Draft List Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Draft List Output Split 2026-06-12

> [!success] 완료
> `agentfeed drafts`의 summary, JSON payload, human-readable list rendering을 `src/cli/draft-list-output.ts`로 분리했다. `cmdDrafts`는 project config 확인, draft 파일 조회, row 생성, stdout dispatch만 유지한다.

## 범위

- `src/cli/index.ts`에서 draft list summary/rendering helper를 제거해 oversized CLI entrypoint를 1874 → 1777 pure LOC로 축소.
- `src/cli/draft-list-output.ts` 추가.
- `tests/draft-list-output.test.ts` 추가로 summary, JSON payload, empty/populated human rendering 계약 고정.
- 서버, 배포, infra, CI/CD 변경 없음.

## 검증

- Red: `npx vitest run tests/draft-list-output.test.ts --reporter=verbose`가 새 모듈 부재로 실패.
- Green/focused: `npm run build && npx vitest run tests/draft-list-output.test.ts tests/cli-drafts.test.ts tests/cli-draft-navigation-actions.test.ts tests/cli-help.test.ts --reporter=verbose` — 4 files / 61 tests 통과.
- Full: `npm test -- --run` — 83 files / 730 tests 통과.
- CLI smoke: temp project cwd에서 `agentfeed drafts` human/JSON 출력 검증 통과.
- Static: `git diff --check`, pure LOC, strict grep, no-excuse checker 통과.
- LSP: `typescript-language-server` 미설치로 diagnostics 실행 불가.

## 후속

- `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect이므로 다음 슬라이스에서도 command orchestration과 output/payload 경계를 계속 분리한다.
- Draft row 생성(`draftListRow`)은 아직 파일 IO와 LocalDraft read에 묶여 있으므로, 다음 후보는 draft row mapping 또는 publish/open message 경계다.
