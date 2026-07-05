---
title: CLI Hook Deprecation Surface Removal 2026-07-05
tags:
  - agentfeed
  - cli
  - deprecation
---

# CLI Hook Deprecation Surface Removal 2026-07-05

## Summary

Legacy `agentfeed hook` is deprecated and remains out of public help/catalog/completion surfaces. A direct legacy invocation now fails closed with explicit `share`, `collect`, and `publish` replacements.

## Changes

- Added a CLI deprecation error for `agentfeed hook` before normal help dispatch.
- Locked public command definitions so `hook` stays absent from public and known command catalogs.
- Added a built-CLI regression for `agentfeed hook --help` to prove no hook help surface is restored.
- Removed old automatic draft collection roadmap wording in favor of explicit `share` / `collect` workflows.

## Verification

- `npm run build` ✅
- `npm run typecheck` ✅
- `npm test -- --run tests/cli-command-recovery.test.ts tests/command-definitions.test.ts tests/cli-deprecated-hook-command.test.ts` ✅ — 3 files / 9 tests passed
- `npm test -- --run --maxWorkers=1` ✅ — 249 files / 972 tests passed
- `git diff --check` ✅
- Hook surface grep leaves only intentional deprecation implementation/tests; no `hook_scope`, `agent hook`, legacy hook docs, or post-commit automation traces in current source/docs grep scope.
