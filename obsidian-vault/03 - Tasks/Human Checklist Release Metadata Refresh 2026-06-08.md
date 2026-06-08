---
title: Human Checklist Release Metadata Refresh 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - docs
  - release
status: done
---

# Human Checklist Release Metadata Refresh 2026-06-08

## 목적

[[Human Action Checklist]]가 이미 완료된 CLI homepage 정리 작업을 아직 미결정 상태로 안내하지 않도록 최신 소스 기준으로 갱신한다.

## 변경

- `agentfeed.dev` production domain이 준비되지 않았으므로 CLI package homepage는 현재 `https://github.com/downingmoon/agentfeed-cli#readme`를 canonical docs URL로 사용한다고 명시했다.
- `package.json.homepage` 결정 항목을 완료 처리하고 [[CLI Release Metadata Homepage Guard 2026-06-08]]로 연결했다.
- public release 전 재확정 항목은 production domain 준비 후 homepage/docs URL 전환 여부로 좁혔다.

## 검증

```bash
grep -R "homepage가 아직 .*agentfeed.dev\|package.json.homepage.*변경할지 정한다" \
  'obsidian-vault/03 - Tasks/Human Action Checklist.md' \
  'obsidian-vault/03 - Tasks/Active Tasks.md'
```

- stale homepage 결정 문구가 남지 않는 것을 확인했다.

## 후행 과제

- production domain이 준비되면 `package.json`, release preflight, dev smoke fixture, [[Human Action Checklist]]를 같은 커밋 단위로 다시 동기화한다.
