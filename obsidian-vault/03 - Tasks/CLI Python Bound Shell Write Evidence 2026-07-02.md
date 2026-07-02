---
title: CLI Python Bound Shell Write Evidence 2026-07-02
aliases:
  - Python bound shell write evidence
status: done
tags:
  - agentfeed/cli
  - agentfeed/collection
  - agentfeed/metrics
---

# CLI Python Bound Shell Write Evidence 2026-07-02

## 작업 항목

- Python heredoc shell script에서 `target = Path('...')` 뒤 `target.write_text(...)`로 쓰는 파일 evidence를 수집하도록 보강했다.
- Python `with open('...', 'w', encoding='utf-8') as handle:` 뒤 `handle.write(...)`로 쓰는 파일 evidence를 수집하도록 보강했다.
- 기존 직접 호출형 `Path('...').write_text(...)`, `open('...').write(...)`, Node `writeFileSync(...)` 수집은 유지했다.
- 여러 bound write가 같은 path에 잡히면 bound-script evidence 안에서 added line count를 합산한다.
- 신규 기능 추가가 아니라 CLI 수집 정확도 보정이다.

## 검증 증거

- Red regression: `npm test -- --run tests/session-collector-shell-script-files.test.ts`가 신규 두 케이스에서 `[]` evidence로 실패함을 확인했다.
- Targeted: `npm test -- --run tests/session-collector-shell-script-files.test.ts` ✅ — 4 tests passed.
- Typecheck: `npm run typecheck` ✅.

## 후행 TODO

- [x] Full CLI gate: `npm run build && npm run typecheck && npm test -- --run` ✅ — 227 test files / 864 tests passed. Initial test-before-build ordering hit `ensureCliBuilt` 10s hook timeout; build-first verification passed.
- [x] Manual CLI JSON smoke: synthetic Claude Bash session with both Python bound `Path` and `open` writes collected `files_changed=2`, `lines_added=4`, `session_id=claude-python-bound-smoke`. Evidence: `/tmp/agentfeed-python-bound-collect-SvDhlC.json`.
- [ ] `src/collectors/agent-session-shell-files.ts` is now 222 pure LOC warning band; next collector edit should split shell script evidence into a dedicated module before adding more patterns.
