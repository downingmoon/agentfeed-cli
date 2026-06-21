---
title: CLI Command Surface Split 2026-06-21
status: done
date: 2026-06-21
tags:
  - agentfeed/cli
  - agentfeed/refactor
  - agentfeed/contracts
  - project/tasks
aliases:
  - 2026-06-21 CLI command surface split
  - CLI command surface split
---

# CLI Command Surface Split 2026-06-21

> [!success]
> CLI help/completion/commands command surface orchestration을 `src/cli/index.ts`에서 `src/cli/command-surface-command.ts`로 분리했다. Root help, command help topic, completion script rendering, commands catalog JSON/human behavior는 유지했다.

## Scope

- 변경 대상: `agentfeed-cli`
- 신규 기능: 없음
- 서버/인프라/CI/CD: 변경 없음
- 배포: 수행하지 않음
- 성격: behavior-preserving refactor / command multiplexer 축소

## Cleanup Plan

1. 기존 help/completion/commands behavior를 focused tests와 `tsc --noEmit`으로 baseline 고정한다.
2. completion vocabulary/metadata/script renderer, command catalog, root/command help rendering을 전용 command surface module로 이동한다.
3. `src/cli/index.ts`는 `completion`, `commands`, root help, help topic dispatch만 위임하도록 축소한다.
4. focused tests, typecheck/build, full suite, dist CLI smoke, diff/no-excuse audit로 회귀를 확인한다.

## Actions

1. `src/cli/command-surface-command.ts`를 추가했다.
2. completion vocabulary, completion option metadata, completion script renderer, command catalog construction을 새 module로 이동했다.
3. `runCompletionCommand`, `runCommandsCommand`, `printHelp`, `printCommandHelp`, `printHelpTopic`를 새 module에 추가했다.
4. `src/cli/index.ts`에서 help/completion/catalog renderer imports와 로컬 구현을 제거했다.
5. `cmdCompletion`, `cmdCommands`, root help, command help topic 경로는 새 module 호출만 남겼다.

## Verification Evidence

Baseline before extraction:

```text
npm test -- --run tests/cli-help.test.ts tests/completion-command.test.ts tests/completion-script-renderer.test.ts tests/completion-vocabulary.test.ts tests/completion-option-metadata.test.ts tests/command-catalog.test.ts tests/commands-output-renderer.test.ts tests/root-help-renderer.test.ts tests/command-arg-specs.test.ts tests/command-definitions.test.ts
npx tsc --noEmit --pretty false
```

Result:

```text
focused command-surface tests: 10 files / 54 tests passed
typecheck: passed
```

Post-extraction gates:

```text
npx tsc --noEmit --pretty false
npm run build
npm test -- --run tests/cli-help.test.ts tests/completion-command.test.ts tests/completion-script-renderer.test.ts tests/completion-vocabulary.test.ts tests/completion-option-metadata.test.ts tests/command-catalog.test.ts tests/commands-output-renderer.test.ts tests/root-help-renderer.test.ts tests/command-arg-specs.test.ts tests/command-definitions.test.ts
npm test -- --run
git diff --check
rg no-excuse audit on src/cli/index.ts and src/cli/command-surface-command.ts
```

Result:

```text
typecheck: passed
build: passed
focused command-surface tests: 10 files / 54 tests passed
full suite: 110 files / 833 tests passed
diff/no-excuse audit: passed
src/cli/index.ts pure LOC: 496
src/cli/command-surface-command.ts pure LOC: 116
```

Manual dist CLI smoke:

```text
agentfeed --help
agentfeed completion --help
agentfeed completion zsh
agentfeed completion bash
agentfeed completion fish
agentfeed commands --json
```

Smoke assertions:

- Root help contains `completion`.
- Completion help contains `Usage: agentfeed completion`, supported shells, and `Install:` section.
- zsh/bash/fish completion scripts contain AgentFeed completion words.
- `commands --json` parses and contains `completion` command metadata.

## Follow-up

> [!todo]
> `src/cli/index.ts` remains above the 250 pure LOC target. 후속 publish command split은 [[CLI Publish Command Split 2026-06-21]]에서 처리했다. Remaining structural candidates are collect/share orchestration and local draft/open/scan/discard dispatch.

> [!todo]
> LSP diagnostics currently fail locally with `Transport closed`. This slice used `tsc --noEmit`, focused Vitest, build, full suite, and dist CLI smoke as replacement evidence.
