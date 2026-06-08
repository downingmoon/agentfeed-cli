---
title: Dev Smoke Homepage Fixture Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/release
status: completed
---

# Dev Smoke Homepage Fixture Guard 2026-06-08

## 목적

[[CLI Release Metadata Homepage Guard 2026-06-08]] 이후 CLI package metadata는 production domain이 준비되기 전까지 GitHub README를 homepage로 사용한다.

이번 작업은 cross-repo smoke fixture와 최신 제품 브리프에도 같은 기준을 반영해, 아직 준비되지 않은 `agentfeed.dev`가 project homepage fixture나 문서의 현재 상태로 다시 보이지 않도록 정리한 것이다.

## 변경 내용

### Dev orchestration

- `agentfeed-dev/scripts/smoke-e2e.sh`
  - project PATCH omitted-vs-null smoke fixture의 `homepage_url`을 `https://github.com/downingmoon/agentfeed-cli#readme`로 변경.
  - omit PATCH 이후 `homepage_url` 보존 assertion도 같은 값으로 갱신.
  - hydrated project detail DOM guard가 repository URL과 homepage fragment를 모두 노출하지 않는지 확인.
- `agentfeed-dev/scripts/test-all.sh`
  - `homepage_url":"https://agentfeed.dev"` fixture가 다시 들어오지 않도록 static guard 추가.

### Obsidian product brief

- `AgentFeed Current Product Brief`
  - `package.json.homepage` 현재값을 GitHub README 기준으로 최신화.
  - `agentfeed.dev`는 실제 도메인 준비와 owner 승인 후에만 release metadata로 복귀한다고 명시.

## 검증 evidence

> [!success]
> - `bash -n scripts/smoke-e2e.sh scripts/test-all.sh`
> - `grep -q "homepage_url\":\"https://github.com/downingmoon/agentfeed-cli#readme\"" scripts/smoke-e2e.sh`
> - `! grep -q "homepage_url\":\"https://agentfeed.dev\"" scripts/smoke-e2e.sh`
> - product brief/package/release guard grep으로 stale `package.json.homepage = https://agentfeed.dev` 문구 없음 확인.

## 후행 과제

- [ ] 실제 production domain이 준비되면 smoke fixture, package metadata, release preflight, product brief를 한 루프에서 production URL 기준으로 전환한다.
- [ ] Dev `make test` 전체는 다음 cross-repo gate 변경 또는 정기 readiness loop에서 재실행한다.
