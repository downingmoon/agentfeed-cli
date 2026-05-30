---
title: Commercial Readiness Hardening - CLI Private Review Privacy Policy 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/privacy
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - CLI Private Review Privacy Policy 2026-05-31

## 목적

CLI `agentfeed share` / `agentfeed publish`가 **public publish**가 아니라 **private review draft upload**라는 점을 터미널과 JSON output에서 명확히 표시해, high-severity privacy finding이 있을 때 사용자와 자동화가 정책 상태를 오해하지 않도록 보강했습니다.

## 변경 사항

> [!success]
> Backend는 이미 public/unlisted publish boundary에서 unresolved high-severity privacy finding을 차단합니다. 이번 변경은 CLI가 그 계약을 사용자에게 명확히 보여주는 UX/automation hardening입니다.

- `src/cli/share.ts`
  - `privacyPolicySummary()` 추가: `private_review_upload`, `public_publish_blocked`, `review_required`를 기계가 읽을 수 있게 요약합니다.
  - `formatPrivacyPolicyLines()` 추가: high-severity finding이 있으면 public/unlisted publishing 차단과 private review upload 허용 사유를 출력합니다.
  - `formatSharePreview()`가 danger/warning privacy 상태에서 review 필요성을 표시합니다.
- `src/cli/index.ts`
  - `share --json` dry-run/upload output에 `privacy_policy`를 포함합니다.
  - `publish --json` output에 `privacy_policy`를 포함합니다.
  - 일반 `publish` 출력 문구를 `Private review draft uploaded`로 변경해 public publish와 혼동하지 않게 했습니다.
- `README.md`
  - JSON output shape에 `privacy_policy`를 명시했습니다.
  - private review upload와 public/unlisted publish 차단 정책을 설명했습니다.

## 검증 증거

- `npm run typecheck -- --pretty false` → passed
- `npm test -- --run tests/share.test.ts tests/cli-share.test.ts` → 19 passed
- `npm test -- --run` → 19 files / 232 tests passed
- `npm run build` → passed
- `agentfeed-dev make test` → passed (CLI 232 tests/prepack/audit, Frontend contract/build/audit, Backend ruff/177 tests/Alembic offline chain)

## 남은 리스크

> [!warning]
> 실제 public/unlisted publish 차단은 Backend와 Frontend review flow에서 수행합니다. CLI는 private review draft만 업로드하므로, live browser review에서 high-severity finding resolve → publish happy path는 staging/live credential 환경에서 별도 smoke가 필요합니다.

## 관련 링크

- [[Privacy Safety#2026-05-31 CLI private review privacy policy]]
- [[Integration - CLI Backend Frontend#2026-05-31 CLI private review privacy policy]]
- [[Active Tasks#P1 후보]]
