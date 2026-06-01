---
title: Commercial Readiness Hardening - CLI Review URL Handoff Failure Surface 2026-06-01
aliases:
  - CLI review URL handoff failure surface
  - 2026-06-01 CLI clipboard browser handoff status
tags:
  - agentfeed/cli
  - agentfeed/automation
  - agentfeed/collection
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
---

# Commercial Readiness Hardening - CLI Review URL Handoff Failure Surface 2026-06-01

> [!abstract] 목적
> Review URL 업로드는 성공했지만 clipboard/browser handoff가 실패하는 경우를 사용자가 놓치지 않도록, human output과 JSON automation output 모두에 deterministic한 실패 신호를 추가했습니다.

## 계약

- [[Integration - CLI Backend Frontend#2026-06-01 CLI review URL handoff failure surface|Integration 계약]]
  - `share --json --clipboard/--open-review`와 `publish --json --clipboard/--open-review`는 stdout을 JSON으로 유지하면서 top-level `handoff`에 `{ requested, ok, warning? }`를 기록합니다.
  - `share --json` 기본값은 계속 clipboard/browser side effect가 없습니다.
  - Upload 실패 시 handoff side effect를 실행하지 않는 기존 no-side-effect 계약을 유지합니다.
- [[Collection System#2026-06-01 CLI review URL handoff failure surface|Collection 계약]]
  - `collect --json --upload --open-review`는 draft-root shape를 유지하고 `draft.upload.handoff.browser`로 browser open 결과를 기록합니다.
  - Human `share` / `publish`는 clipboard 또는 browser open이 실패하면 `Warning:`을 출력하고 review URL을 manual fallback으로 남깁니다.

## 구현 요약

- `ReviewUrlHandoff` / `ReviewUrlHandoffChannel` 타입을 추가했습니다.
- `handoffReviewUrl()`이 clipboard copy와 browser open을 requested 여부에 따라 수행하고 실패를 boolean + warning으로 정규화합니다.
- JSON share/publish는 side effect 결과를 포함한 뒤 JSON을 출력해 stdout parseability를 유지합니다.
- Human share/publish는 `printReviewUrlHandoff()`으로 copy 성공/실패, browser 실패 fallback을 한 곳에서 처리합니다.

## TDD 기록

> [!failure] RED
> - `npx vitest run tests/cli-share.test.ts --testNamePattern 'handoff fails|handoff failures'`가 실패했습니다.
> - JSON share failure test는 `output.handoff.clipboard`가 `undefined`였습니다.
> - Human publish failure test는 clipboard/browser failure warning 없이 review URL만 중복 출력했습니다.

> [!success] GREEN
> - JSON share requested handoff 실패가 `handoff.clipboard.ok=false`, `handoff.browser.ok=false`로 출력됩니다.
> - Human publish handoff 실패가 `Warning: Review URL was not copied to clipboard.`와 `Warning: Review URL could not be opened automatically.`를 출력합니다.
> - `collect --json --upload --open-review`도 `draft.upload.handoff.browser.ok=false`로 실패를 machine-readable하게 남깁니다.

## 검증 증거

- Targeted RED:
  - `npx vitest run tests/cli-share.test.ts --testNamePattern 'handoff fails|handoff failures'` → 2 failed
- Targeted GREEN:
  - `npx vitest run tests/cli-share.test.ts tests/cli-collect.test.ts --testNamePattern 'handoff|copies and opens review URLs for share JSON|prints machine-readable publish JSON|uploads before printing JSON'` → 2 files passed, 6 passed / 15 skipped
  - `npm test -- --run tests/cli-share.test.ts tests/cli-collect.test.ts tests/clipboard.test.ts` → 3 files passed, 24 tests passed
- CLI full gate:
  - `npm run typecheck`
  - `npm test -- --run` → 20 files passed, 272 tests passed
  - `npm run release:preflight`
  - `npm audit --omit=dev --audit-level=moderate` → `found 0 vulnerabilities`
  - `git diff --check`
- Cross-repo gate:
  - `make test` in `agentfeed-dev` → OpenAPI gate passed, CLI 272 tests/typecheck/release preflight/audit passed, Frontend CI/audit passed, Backend ruff/pytest 246 passed/Alembic offline chain passed

## 남은 리스크

> [!warning]
> 실제 OS clipboard/browser integration은 fake opener/failing command 기반 regression으로 검증했습니다. Native macOS/Windows/Linux 데스크톱에서의 manual handoff QA는 별도 release smoke 후보입니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 CLI review URL handoff failure surface]]
- [[Collection System#2026-06-01 CLI review URL handoff failure surface]]
- [[Active Tasks#P1 후보]]
