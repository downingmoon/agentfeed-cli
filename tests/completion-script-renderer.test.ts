import { describe, expect, it } from 'vitest';
import { createCompletionScriptRenderer } from '../src/cli/completion-script-renderer.js';

describe('createCompletionScriptRenderer', () => {
  it('renders zsh, bash, and fish completion scripts from shared vocabulary and metadata', () => {
    // Given: a minimal command catalog with value choices and file-valued options.
    const renderer = createCompletionScriptRenderer({
      commands: [
        { name: 'help', description: 'Show help' },
        { name: 'collect', description: 'Collect work' },
        { name: 'completion', description: 'Print completion' }
      ],
      sourceValues: ['codex', 'claude-code'],
      vocabulary: {
        optionsFor: (command) => {
          if (command === 'collect') return ['--help', '--path', '--source'];
          return ['--help'];
        },
        helpTopicWords: () => ['help', 'collect', 'completion', 'token'],
        wordsFor: (command) => {
          if (command === 'help') return ['help', 'collect', 'completion', 'token', '--help'];
          if (command === 'completion') return ['zsh', 'bash', 'fish', '--help'];
          return ['--help', '--path', '--source'];
        }
      },
      optionMetadata: {
        descriptionFor: (_command, optionName) => {
          if (optionName === '--source') return 'Select source';
          if (optionName === '--path') return 'Scan path';
          return 'Show command help';
        },
        requiresValue: (_command, optionName) => optionName === '--source' || optionName === '--path',
        valuePlaceholderFor: (optionName) => optionName === '--source' ? 'source' : 'path',
        valueChoicesFor: (optionName) => optionName === '--source' ? ['codex', 'claude-code'] : [],
        isFileValueOption: (optionName) => optionName === '--path'
      }
    });

    // When / Then: shell-specific scripts preserve command words, choice values, and file hints.
    expect(renderer.scriptFor('zsh')).toContain("'--source[Select source]:source:(codex claude-code)'");
    expect(renderer.scriptFor('bash')).toContain('--source) COMPREPLY=( $(compgen -W "codex claude-code" -- "$cur") ); return 0 ;;');
    expect(renderer.scriptFor('fish')).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from collect" -l path -r -F -d "Scan path"');
    expect(renderer.scriptFor('powershell')).toBeUndefined();
  });
});
