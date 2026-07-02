---
title: CLI Shell Evidence Collector Split 2026-07-02
aliases:
  - Shell evidence collector split
status: done
tags:
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/refactor
---

# CLI Shell Evidence Collector Split 2026-07-02

## 작업 항목

- `agent-session-shell-files.ts`가 222 pure LOC warning band에 들어가 다음 shell pattern 추가 전 split 필요 상태였다.
- Public entrypoint `applyShellFileEvidence`는 유지했다.
- 내부 책임을 다음 모듈로 분리했다.
  - `agent-session-shell-file-evidence.ts`: shared `FileEvidence` type.
  - `agent-session-shell-paths.ts`: shell token/path normalization.
  - `agent-session-shell-git-output.ts`: `git status --short`, `git diff --numstat` output parsing.
  - `agent-session-shell-script-writes.ts`: heredoc, redirect, Python/Node script write evidence parsing.
- 신규 기능 없이 behavior-preserving maintainability hardening만 수행했다.

## 검증 증거

- Targeted shell collector: `npm test -- --run tests/session-collector-shell-script-files.test.ts` ✅ — 4 tests passed.
- Build/typecheck: `npm run build && npm run typecheck` ✅.
- Full CLI suite: `npm test -- --run` ✅ — 227 test files / 864 tests passed. First full pass hit known `ensureCliBuilt` 10s hook timeout in `cli-help-public-surfaces`; immediate warm rerun of that suite passed, then full suite passed.
- Manual CLI collect smoke: synthetic Claude Bash session with bound Python writes collected `files_changed=2`, `lines_added=4`, `session_id=refactor-claude-python-bound-smoke`. Evidence: `/tmp/agentfeed-refactor-collect-mQkWE6.json`.
- Manual CLI help/bad input: `agentfeed collect --help` rendered usage; `agentfeed collect --source bogus --no-upload` failed with supported-source guidance.
- LOC after split: public entrypoint 48, shared type 7, git parser 39, path parser 12, script write parser 126 pure LOC.

## 후행 TODO

- [x] `src/collectors/agent-session-shell-files.ts` warning-band split 처리.
- [ ] Keep future shell evidence patterns in `agent-session-shell-script-writes.ts` until it approaches 200 pure LOC, then split by language/parser family.
