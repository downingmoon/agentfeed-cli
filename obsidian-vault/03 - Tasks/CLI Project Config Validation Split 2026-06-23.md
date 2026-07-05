---
title: CLI Project Config Validation Split 2026-06-23
aliases:
  - CLI project config validation split
  - Project config validation split
tags:
  - agentfeed/cli
  - project/tasks
  - refactor
  - config
status: done
created: 2026-06-23
updated: 2026-06-23
code_commit: e7b2bb533d68548e650a6c7cc8c7aff39b12da07
---

# CLI Project Config Validation Split 2026-06-23

> [!success]
> CLI project config validation ownership split completed. No new product feature, server, infra, CI/CD, push, or deploy change was made.

## Scope

- Split validation-only responsibility out of `src/config/project-config.ts`.
- Preserve the existing public import path for `initProject`, `loadProjectConfig`, `resolveProjectRoot`, `findGitRoot`, `findUp`, and `slugify`.
- Keep config error wording and shape parsing behavior unchanged.

## Code changes

- `src/config/project-config.ts`
  - Removed local config shape validation helpers and `validateProjectConfig` implementation.
  - Imports `validateProjectConfig` from `./project-config-validation.js`.
  - Keeps project root discovery, config loading, backup, and initialization flow.
- `src/config/project-config-validation.ts`
  - New internal module for config shape parsing and field-specific diagnostics.
  - Owns `PROJECT_VISIBILITIES`, `CLAUDE_HOOK_SCOPES`, validation helpers, and `validateProjectConfig`.

## Size result

| File | Before pure LOC | After pure LOC |
| --- | ---: | ---: |
| `src/config/project-config.ts` | 222 | 122 |
| `src/config/project-config-validation.ts` | 0 | 102 |

Both files are under the 250 pure LOC ceiling.

## Verification

- LSP diagnostics attempted on changed TS files.
  - Result: failed with `Transport closed`.
  - Fallback evidence: typecheck, build, targeted tests, full suite, and built CLI smoke.
- `npm test -- --run tests/config.test.ts tests/cli-init-setup-ux.test.ts`
  - First attempt: init CLI UX `beforeAll` build hook exceeded 10s before a fresh build.
  - After `npm run build`: passed, 3 files / 17 tests.
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `git diff --check`: passed.
- `npm test -- --run`: passed, 226 files / 848 tests.
- Built CLI smoke:
  - `dist/cli/index.js init --no-git-check --project-name enterprise-config-smoke --json`
  - `dist/cli/index.js status --json`
  - Asserted project name persisted and Project readiness was `ready` / `initialized`.

## Commit

- Code: `e7b2bb533d68548e650a6c7cc8c7aff39b12da07` — `Split project config validation`

## Constraints honored

- No new dependencies.
- No new app feature.
- No server, infra, or CI/CD changes.
- No push or deploy.
- Public config API surface preserved.

## Related

- [[Active Tasks]]
