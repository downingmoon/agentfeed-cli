---
title: Commercial Readiness Hardening - CLI Draft Artifact Permissions 2026-05-31
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/privacy
  - project/tasks
status: done
created: 2026-05-31
---

# Commercial Readiness Hardening - CLI Draft Artifact Permissions 2026-05-31

## 목적

CLI draft JSON/Markdown은 publish 전 private review context, collection evidence, local summary를 포함할 수 있습니다. 기존 credential file은 private mode로 고정했지만 draft artifact는 generic write path를 사용해 OS 기본 umask에 의존했습니다.

> [!important]
> 상용화 로컬 privacy boundary에서는 credential뿐 아니라 공유 전 draft artifact도 최소 권한으로 저장되어야 합니다.

## 변경 사항

- `AgentFeed-CLI/src/draft/write.ts`
  - `.agentfeed/drafts` directory를 `0o700`으로 생성/재조정합니다.
  - draft `.json` / `.md` 파일을 `0o600`으로 쓰고, 기존 파일도 rewrite 시 `chmod(0o600)`으로 다시 조입니다.
  - non-POSIX filesystem에서는 best-effort로 동작하도록 chmod 실패를 무시합니다.
- `AgentFeed-CLI/tests/git-draft.test.ts`
  - draft 생성 시 directory/file mode를 검증합니다.
  - 기존 draft 파일이 `0o644`로 느슨해져도 `writeDraft()`가 다시 `0o600`으로 조이는 회귀 테스트를 추가했습니다.

## 검증 증거

- `npm test -- --run tests/git-draft.test.ts` → passed (15 tests)
- `npm run typecheck && npm test -- --run` → passed (233 tests)
- `npm pack --dry-run` → passed (prepack clean/build/typecheck/test + package manifest)

## 남은 리스크

> [!warning]
> Windows filesystem은 POSIX permission bit 의미가 다르므로 테스트를 skip합니다. 구현은 best-effort이며, Windows의 완전한 secret storage는 OS credential store 쪽 계약에 의존합니다.

## 관련 링크

- [[Privacy Safety#2026-05-31 CLI draft artifact private permissions]]
- [[Collection System#2026-05-31 Draft artifact permissions]]
- [[Active Tasks#P1 후보]]
