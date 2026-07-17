import { describe, expect, it } from 'vitest';
import { COMMAND_ARG_SPECS, SUPPORTED_COMPLETION_SHELLS } from '../src/cli/command-arg-specs.js';

function validatePositionals(command: string, positionals: readonly string[]): string | null {
  const validator = COMMAND_ARG_SPECS[command]?.validatePositionals;
  if (!validator) throw new Error(`Missing positional validator for ${command}`);
  return validator(positionals);
}

describe('command argument specs', () => {
  it('keeps option metadata stable for command parsing and completion surfaces', () => {
    // Given / When: parser and completion helpers share command arg specs.
    const shareSpec = COMMAND_ARG_SPECS.share;
    const publishSpec = COMMAND_ARG_SPECS.publish;

    // Then: important flags, value options, and conflicts stay stable.
    expect(shareSpec?.flags).toContain('--open-review');
    expect(shareSpec?.flags).toContain('--no-clip');
    expect(shareSpec?.valueOptions).toContain('--note');
    expect(shareSpec?.flags).toContain('--ai-worklog');
    expect(shareSpec?.valueOptions).toContain('--ai-worklog-tool');
    expect(shareSpec?.conflicts).toContainEqual(['--clipboard', '--no-clip']);
    expect(shareSpec?.conflicts).toContainEqual(['--ai-worklog', '--no-ai-worklog']);
    expect(publishSpec?.conflicts).toContainEqual(['--open-review', '--no-open-review']);
  });

  it('keeps positional recovery stable for compatibility and nested commands', () => {
    // Given / When: compatibility and nested commands receive invalid positionals.
    const tokenError = validatePositionals('token', ['rotate', 'browser']);
    const helpError = validatePositionals('help', ['statsu']);

    // Then: recovery remains command-aware and suggestion-rich.
    expect(tokenError).toContain('Unexpected argument for token rotate: browser');
    expect(tokenError).toContain('Did you mean: agentfeed token rotate --browser');
    expect(helpError).toContain('Did you mean: agentfeed help status');
  });

  it('keeps completion shell validation colocated with completion command specs', () => {
    // Given / When: completion command validates shell positionals.
    const supportedShells = [...SUPPORTED_COMPLETION_SHELLS];
    const supportedResult = validatePositionals('completion', ['zsh']);
    const unsupportedResult = validatePositionals('completion', ['zs']);

    // Then: supported shells and invalid-shell recovery remain stable.
    expect(supportedShells).toEqual(['zsh', 'bash', 'fish']);
    expect(supportedResult).toBeNull();
    expect(unsupportedResult).toContain('Unsupported completion shell: zs');
    expect(unsupportedResult).toContain('Did you mean: agentfeed completion zsh');
  });
});
