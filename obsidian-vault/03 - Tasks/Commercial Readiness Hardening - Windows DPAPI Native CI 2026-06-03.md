---
title: Commercial Readiness Hardening - Windows DPAPI Native CI
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - ci/windows
  - credentials/dpapi
status: verified
aliases:
  - Windows DPAPI Native CI 2026-06-03
---

# Commercial Readiness Hardening - Windows DPAPI Native CI

Related: [[Commercial Readiness Hardening - Ingestion Quota Retention 2026-06-03]] · [[Home]]

## Outcome

AgentFeed CLI now has native Windows DPAPI credential smoke coverage in GitHub Actions.

- Added a `windows-latest` CI job named `Windows native credential smoke`.
- The Windows job installs pinned Node/npm, runs `npm run build`, then runs the native DPAPI smoke with `AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS=1`.
- Added a gated native Windows DPAPI round-trip test in `tests/config.test.ts`.
- Added release-preflight guardrails requiring the Windows CI job, native smoke flag, native smoke command, and README credential-storage documentation.
- README credential policy now documents macOS, Linux, and Windows DPAPI storage.

> [!success] Commercial-readiness impact
> Windows users are no longer covered only by mocked DPAPI behavior; CI now proves the real GitHub-hosted Windows runner can build the package and round-trip credentials through native DPAPI without plaintext token leakage in `credentials.json` or the `.dpapi` blob.

## TDD Evidence

### RED - CI contract missing Windows native smoke

```bash
npm test -- --run tests/release-preflight.test.ts -t "requires native Windows DPAPI"
```

Result: failed because `.github/workflows/ci.yml` had no `runs-on: windows-latest` job.

### GREEN - initial Windows native smoke contract

```bash
npm test -- --run tests/release-preflight.test.ts -t "requires native Windows DPAPI"
```

Result: passed after adding the `windows-latest` job and native smoke command.

### RED - build and documentation gaps

```bash
npm test -- --run tests/release-preflight.test.ts -t "requires native Windows DPAPI|documents Windows DPAPI"
```

Result: failed because the Windows job did not build before native smoke and the README credential policy did not mention Windows DPAPI.

### GREEN - final targeted contract

```bash
npm test -- --run tests/release-preflight.test.ts -t "requires native Windows DPAPI|documents Windows DPAPI"
```

Result: `2 passed, 10 skipped`.

## Full Local Gate

```bash
npm run release:preflight
```

Result: release preflight passed, including `23 passed`, `389 passed`, build/typecheck/package smoke, tarball validation, and installed CLI help/version smoke.

```bash
npm audit --audit-level=high
```

Result: `found 0 vulnerabilities`.

## Sidecar Test Review

A parallel read-only `test-engineer` review confirmed the prior risk:

- Windows DPAPI implementation existed in `src/config/credentials.ts`.
- Mocked Windows DPAPI coverage existed in `tests/keychain-env.test.ts`.
- Native smoke existed only for macOS.
- CI was Ubuntu-only, so real Windows DPAPI behavior was unproven.
- README listed only macOS/Linux keychains.

## Remaining External Blocker

> [!warning] Hosted strict readiness
> Production hosted readiness still depends on external infra: `api.agentfeed.dev` DNS resolution and the production frontend root behavior must be fixed outside this local CLI hardening branch.

## Remote CI Follow-up

First remote Windows smoke run caught a real runner compatibility issue:

```text
Unable to save AgentFeed credentials to the OS keychain. powershell.exe exited with 1:
ConvertTo-SecureString ... Microsoft.PowerShell.Security ... module could not be loaded
```

Fix applied:

- Replaced `ConvertTo-SecureString` / `ConvertFrom-SecureString` cmdlet usage with direct `.NET` `System.Security.Cryptography.ProtectedData` DPAPI calls.
- Strengthened `tests/keychain-env.test.ts` so Windows helper command arguments must not depend on `ConvertTo-SecureString` or `ConvertFrom-SecureString`.

### RED - cmdlet dependency caught locally after remote failure

```bash
npm test -- --run tests/keychain-env.test.ts -t "Windows DPAPI-backed"
```

Result: failed because helper arguments still contained `ConvertTo-SecureString`.

### GREEN - ProtectedData helper path

```bash
npm test -- --run tests/keychain-env.test.ts -t "Windows DPAPI-backed"
```

Result: `1 passed, 2 skipped`.

### Full local gate after ProtectedData fix

```bash
npm run release:preflight
npm audit --audit-level=high
```

Result: release preflight passed with `389 passed`; audit found `0 vulnerabilities`.

### Remote CI Follow-up 2 - ProtectedData assembly load

Second remote Windows run proved `System.Security.Cryptography.ProtectedData` is also not auto-loaded on `windows-2025`:

```text
Unable to find type [System.Security.Cryptography.ProtectedData]
```

Fix applied:

- Added explicit `Add-Type -AssemblyName System.Security` before DPAPI `Protect` and `Unprotect` calls.
- Strengthened `tests/keychain-env.test.ts` so Windows helper argv must include the explicit assembly load.

Verification after the assembly-load fix:

```bash
npm test -- --run tests/keychain-env.test.ts -t "Windows DPAPI-backed"
npm run release:preflight
npm audit --audit-level=high
```

Result: targeted Windows helper test passed, release preflight passed with `389 passed`, and audit found `0 vulnerabilities`.
