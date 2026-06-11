import { describe, expect, it } from 'vitest';
import { completionCommandResult } from '../src/cli/completion-command.js';

describe('completion command', () => {
  it('requests command help when no shell is provided', () => {
    // Given / When: completion is invoked without a shell.
    const result = completionCommandResult({
      args: [],
      scriptFor: () => undefined,
      supportedShells: ['zsh', 'bash', 'fish']
    });

    // Then: the caller can print completion-specific help without resolving a script.
    expect(result).toEqual({ kind: 'help', command: 'completion' });
  });

  it('returns the completion script for a supported shell', () => {
    // Given / When: a shell resolves to a generated script.
    const result = completionCommandResult({
      args: ['zsh'],
      scriptFor: (shell) => shell === 'zsh' ? '#compdef agentfeed\n' : undefined,
      supportedShells: ['zsh', 'bash', 'fish']
    });

    // Then: the script is returned for stdout printing.
    expect(result).toEqual({ kind: 'script', script: '#compdef agentfeed\n' });
  });

  it('throws supported-shell recovery for unsupported shells', () => {
    // Given / When / Then: unsupported shells keep the existing recovery wording.
    expect(() => completionCommandResult({
      args: ['powershell'],
      scriptFor: () => undefined,
      supportedShells: ['zsh', 'bash', 'fish']
    })).toThrow('Unsupported completion shell: powershell\nSupported shells: zsh, bash, fish\nRun: agentfeed completion --help');
  });
});
