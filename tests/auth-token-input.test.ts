import { describe, expect, it } from 'vitest';
import {
  SAFE_TOKEN_STDIN_COMMAND,
  emptyTokenStdinMessage,
  jsonTokenRequiredMessage,
  missingTokenMessage,
  resolveLoginTokenInput,
  unsafeArgvTokenMessage
} from '../src/cli/auth-token-input.js';

describe('auth token input recovery', () => {
  it('resolves stdin token input after trimming surrounding whitespace', async () => {
    await expect(resolveLoginTokenInput({
      tokenOption: undefined,
      tokenStdinFlag: true,
      json: false,
      allowUnsafeArgvToken: false,
      readStdinText: async () => '  af_live_stdin_token\n'
    })).resolves.toBe('af_live_stdin_token');
  });

  it('rejects ambiguous token input methods before reading stdin', async () => {
    let stdinRead = false;

    await expect(resolveLoginTokenInput({
      tokenOption: 'af_live_argv_token',
      tokenStdinFlag: true,
      json: false,
      allowUnsafeArgvToken: false,
      readStdinText: async () => {
        stdinRead = true;
        return 'af_live_stdin_token';
      }
    })).rejects.toThrow('Use only one token input method: --token -, or --token-stdin.');

    expect(stdinRead).toBe(false);
  });

  it('rejects literal argv tokens by default with safe stdin guidance', async () => {
    await expect(resolveLoginTokenInput({
      tokenOption: 'af_live_argv_token',
      tokenStdinFlag: false,
      json: false,
      allowUnsafeArgvToken: false,
      readStdinText: async () => ''
    })).rejects.toThrow(unsafeArgvTokenMessage());
  });

  it('allows literal argv tokens only when the unsafe escape hatch is explicit', async () => {
    await expect(resolveLoginTokenInput({
      tokenOption: 'af_live_argv_token',
      tokenStdinFlag: false,
      json: false,
      allowUnsafeArgvToken: true,
      readStdinText: async () => ''
    })).resolves.toBe('af_live_argv_token');
  });

  it('rejects empty stdin with copyable token-stdin commands', async () => {
    await expect(resolveLoginTokenInput({
      tokenOption: '-',
      tokenStdinFlag: false,
      json: false,
      allowUnsafeArgvToken: false,
      readStdinText: async () => '  \n'
    })).rejects.toThrow(emptyTokenStdinMessage());
  });

  it('rejects json login without token input so stdout remains parseable', async () => {
    await expect(resolveLoginTokenInput({
      tokenOption: undefined,
      tokenStdinFlag: false,
      json: true,
      allowUnsafeArgvToken: false,
      readStdinText: async () => ''
    })).rejects.toThrow(jsonTokenRequiredMessage());
  });

  it('keeps shared token remediation commands consistent', () => {
    expect(SAFE_TOKEN_STDIN_COMMAND).toBe('printf %s "$TOKEN" | agentfeed login --token-stdin');
    expect(missingTokenMessage()).toContain(`Run: ${SAFE_TOKEN_STDIN_COMMAND}`);
    expect(jsonTokenRequiredMessage()).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin --json');
  });
});
