---
title: Commercial Readiness Hardening - Explicit Upload Intent Everywhere 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - privacy
  - upload-safety
status: done
aliases:
  - Explicit Upload Intent Everywhere
---

# Commercial Readiness Hardening - Explicit Upload Intent Everywhere 2026-06-03

관련: [[Active Tasks]], [[Commercial Readiness Hardening - Upload Confirmation Startup Preflight and Explicit Root Smoke 2026-06-02]], [[Commercial Readiness Hardening - API Diagnostics CORS and Upload Intent Copy 2026-06-03]]

## 배경

`agentfeed share`/`publish`의 human-readable fresh upload 경로가 interactive terminal에서는 `--yes`를 요구했지만, CI/non-interactive 환경에서는 `--yes` 없이도 private review draft upload가 진행될 수 있었다.

> [!warning] 상용화 기준
> private review draft도 외부 서비스 전송이므로, machine/human 여부와 관계없이 명시적 upload intent가 있어야 한다. Human-readable upload는 `--yes`, machine-readable automation은 `--json`을 사용한다.

## 변경

- `shouldRequireUploadConfirmation()`을 단순화해 `--yes` 또는 `--json`이 없으면 항상 fresh upload 직전에 중단.
- CI/non-interactive 환경도 human-readable fresh upload gate의 예외가 아니도록 변경.
- 서버 전송이 없는 reusable cached upload는 기존처럼 확인 없이 review URL을 재사용.
- 업로드 후 browser/clipboard handoff를 검증하는 테스트들은 명시적 `--yes`를 사용하도록 정렬.
- README의 one-command sharing 설명을 explicit upload intent 기준으로 갱신.

## 검증

- Targeted: `npm test -- --run tests/cli-share.test.ts`
  - 37 tests passed
- Full CLI: `npm run build && npm run typecheck && npm test -- --run`
  - 23 files / 377 tests passed
- Release: `npm run release:preflight`
  - passed

## 영향

- `agentfeed publish --id <draft>` / `agentfeed share`는 CI 포함 모든 환경에서 fresh upload 전 preview + `--yes` 안내만 출력한다.
- 자동화가 실제 업로드를 원하면 `agentfeed publish --id <draft> --yes` 또는 `agentfeed share --json`처럼 명시해야 한다.
