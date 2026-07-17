import { describe, expect, it } from 'vitest';
import { applyAiWorklogPatch, parseAiWorklogPatch } from '../src/llm/local-worklog-draft.js';
import { detectLocalAiWorklogTools, runLocalAiWorklogTool } from '../src/llm/local-worklog-tools.js';
import { createEmptyDraft } from '../src/draft/create.js';

describe('local AI worklog helpers', () => {
  it('detects supported local AI CLI tools in priority order', async () => {
    // Given: only codex and antigravity resolve on PATH.
    const seen: string[] = [];

    // When: local AI worklog tools are detected.
    const tools = await detectLocalAiWorklogTools({
      resolveCommand: async (command) => {
        seen.push(command);
        return command === 'codex' || command === 'agy' ? `/bin/${command}` : null;
      }
    });

    // Then: supported tools are returned in stable UI order.
    expect(seen).toEqual(['claude', 'codex', 'gemini', 'agy']);
    expect(tools.map((tool) => tool.id)).toEqual(['codex', 'antigravity']);
    expect(tools.map((tool) => tool.command)).toEqual(['/bin/codex', '/bin/agy']);
  });

  it('runs Codex in non-interactive read-only exec mode with scrubbed secrets', async () => {
    // Given: Codex is selected and sensitive env values exist.
    const calls: Array<{ readonly args: readonly string[]; readonly stdin: string; readonly token?: string }> = [];

    // When: the tool runner invokes Codex.
    const output = await runLocalAiWorklogTool({
      tool: { id: 'codex', label: 'Codex CLI', command: '/bin/codex' },
      cwd: '/tmp/agentfeed-local-ai',
      prompt: 'write worklog',
      dependencies: {
        env: { PATH: '/bin', AGENTFEED_TOKEN: 'secret' },
        spawnCommand: async (input) => {
          calls.push({ args: input.args, stdin: input.stdin, token: input.env.AGENTFEED_TOKEN });
          return { stdout: '{"title":"AI title"}', stderr: '' };
        }
      }
    });

    // Then: codex receives stdin prompt, read-only sandbox flags, and no AgentFeed token.
    expect(output).toBe('{"title":"AI title"}');
    expect(calls).toEqual([{ args: ['exec', '--sandbox', 'read-only', '--ephemeral', '-'], stdin: 'write worklog', token: undefined }]);
  });

  it('passes Claude non-interactive prompts as the print argument', async () => {
    // Given: Claude is selected for local AI worklog generation.
    const calls: Array<{ readonly args: readonly string[]; readonly stdin: string }> = [];

    // When: the tool runner invokes Claude.
    await runLocalAiWorklogTool({
      tool: { id: 'claude', label: 'Claude Code', command: '/bin/claude' },
      cwd: '/tmp/agentfeed-local-ai',
      prompt: 'write worklog',
      dependencies: {
        spawnCommand: async (input) => {
          calls.push({ args: input.args, stdin: input.stdin });
          return { stdout: '{\"title\":\"AI title\"}', stderr: '' };
        }
      }
    });

    // Then: Claude receives -p/--print style prompt input without stdin dependency.
    expect(calls).toEqual([{ args: ['--print', 'write worklog'], stdin: '' }]);
  });


  it('accepts draft-shaped local AI JSON with nested worklog fields', () => {
    // Given: a local AI CLI returns a draft-like JSON object instead of the flat patch shape.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-local-ai', source: 'codex' });

    // When: the parser reads the nested worklog payload and applies it.
    const patch = parseAiWorklogPatch('{"worklog":{"title":"Nested AI title","summary":"Nested AI summary","changed_areas":["CLI share"],"public_prompt":"agentfeed share --ai-worklog"}}');
    const next = applyAiWorklogPatch(draft, patch);

    // Then: a model response that looks like an AgentFeed draft still replaces the default rule-based worklog.
    expect(next.worklog.title).toBe('Nested AI title');
    expect(next.worklog.summary).toBe('Nested AI summary');
    expect(next.worklog.changed_areas).toEqual(['CLI share']);
    expect(next.worklog.public_prompt).toBe('agentfeed share --ai-worklog');
  });

  it('applies parsed AI worklog JSON through privacy redaction', () => {
    // Given: a local AI response includes richer text and sensitive content.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-local-ai', source: 'codex' });

    // When: the patch is parsed and applied.
    const patch = parseAiWorklogPatch(`Here is JSON:\n{"title":"Implemented auth review","summary":"Changed TOKEN=abcdefghi and improved upload feedback","changed_areas":["Auth UI"],"outcome":["Fixed login loop"],"timeline":[{"order":1,"title":"Fixed auth","status":"success"}],"tags":["auth"]}`);
    const next = applyAiWorklogPatch(draft, patch);

    // Then: worklog fields improve while sensitive values are redacted.
    expect(next.worklog.title).toBe('Implemented auth review');
    expect(next.worklog.summary).toContain('[REDACTED_SECRET]');
    expect(next.worklog.changed_areas).toEqual(['Auth UI']);
    expect(next.worklog.outcome).toEqual(['Fixed login loop']);
    expect(next.worklog.timeline).toEqual([{ order: 1, title: 'Fixed auth', status: 'success' }]);
    expect(next.privacy_scan.status).toBe('danger');
  });
});
