---
title: CLI Python Triple Quote Shell Write Evidence 2026-07-02
status: done
date: 2026-07-02
tags:
  - agentfeed/cli
  - agentfeed/collector
  - agentfeed/evidence
---

# CLI Python Triple Quote Shell Write Evidence 2026-07-02

## 배경

Claude/Codex류 agent가 shell heredoc 안에서 Python `Path(...).write_text("""...""")` 또는 bound target `target.write_text("""...""")` 패턴으로 파일을 생성하면, 기존 single/double quote parser는 파일 path는 잡더라도 triple-quoted content line count를 놓쳐 `lines_added=0`이 될 수 있었다.

## 변경

- `agentfeed-cli/src/collectors/agent-session-shell-script-writes.ts`
  - direct Python triple-quoted write parser 추가.
  - bound Python triple-quoted write parser 추가.
  - 기존 direct/bound single-quoted, double-quoted, backtick, Node `writeFileSync`, heredoc, git output evidence 동작 유지.
- `agentfeed-cli/tests/session-collector-shell-script-files.test.ts`
  - direct `Path('src/generated-triple.ts').write_text("""...""")` regression 추가.
  - bound `target = Path(...); target.write_text("""...""")` regression 추가.

## 검증

- Red evidence: 신규 tests 추가 직후 `lines_added: 0`으로 실패 확인.
- Targeted green: `npm test -- --run tests/session-collector-shell-script-files.test.ts` → 6 passed.
- Build/typecheck/full suite: `npm run build && npm run typecheck && npm test -- --run` → 227 files / 866 tests passed.
- Static gate: `git diff --check` 통과.
- Pure LOC:
  - `src/collectors/agent-session-shell-script-writes.ts` → 138.
  - `tests/session-collector-shell-script-files.test.ts` → 124.
- No-excuse scan on changed shell collector/test files → no matches.
- LSP diagnostics attempted for changed TS files, but local LSP transport returned `Transport closed`; `tsc --noEmit`/build/full tests used as substitute.
- Manual CLI collect smoke:
  - Synthetic Claude JSONL with direct and bound Python triple-quoted writes.
  - Command: `node dist/cli/index.js collect --source claude-code --session-file "$SESSION" --force --no-save-cursor --no-upload --json`.
  - Evidence: `/tmp/agentfeed-triple-collect.json`.
  - Result: `.source.session_id == "claude-triple-smoke"`, `.worklog.metrics.files_changed == 2`, `.worklog.metrics.lines_added == 4`.

## 결과

Triple-quoted Python shell write evidence now contributes correct file and line metrics to AgentFeed CLI collection.
