---
title: CLI Privacy Scan Output Split 2026-06-12
date: 2026-06-12
status: done
tags:
  - agentfeed/cli
  - enterprise-hardening
  - refactor
  - no-deploy
---

# CLI Privacy Scan Output Split 2026-06-12

> [!success] 완료
> `agentfeed scan`의 JSON payload와 human-readable privacy scan report 조립 책임을 `src/cli/privacy-scan-output.ts`로 분리했다. `cmdScan`은 입력 해석, draft mutation, file/path scan orchestration만 유지한다.

## 범위

- `src/cli/index.ts`에서 privacy scan output helper를 제거해 oversized CLI entrypoint를 1970 → 1874 pure LOC로 축소.
- `src/cli/privacy-scan-output.ts` 추가.
- `tests/privacy-scan-output.test.ts` 추가로 path scan JSON/human output 계약 고정.
- 서버, 배포, infra, CI/CD 변경 없음.

## 검증

- Red: `npx vitest run tests/privacy-scan-output.test.ts --reporter=verbose`가 새 모듈 부재로 실패.
- Green/focused: `npm run build && npx vitest run tests/privacy-scan-output.test.ts tests/cli-scan.test.ts tests/cli-guidance-actions.test.ts tests/cli-help.test.ts --reporter=verbose` — 4 files / 51 tests 통과.
- Full: `npm test -- --run` — 82 files / 727 tests 통과.
- CLI smoke: temp git project에서 `scan --path` human/JSON 출력 검증 통과.
- Static: `git diff --check`, pure LOC, strict grep, no-excuse checker 통과.
- LSP: `typescript-language-server` 미설치로 diagnostics 실행 불가.

## 후속

- `src/cli/index.ts`는 여전히 250 pure LOC 초과 inherited defect이므로 다음 슬라이스에서도 observable behavior를 테스트로 잠그며 command/output 경계를 계속 분리한다.
