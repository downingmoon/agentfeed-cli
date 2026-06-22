import { describe, expect, it } from 'vitest';
import { runLogoutCliCommand } from '../src/cli/logout-command.js';

const result = {
  credentials_file_path: '/tmp/agentfeed-home/credentials.json',
  credentials_file_deleted: true,
  keychain_deleted: null,
  warnings: []
};

describe('logout command wrapper', () => {
  it('prints JSON logout payload with environment token state', async () => {
    const printed: string[] = [];

    await runLogoutCliCommand(['--json'], {
      env: { AGENTFEED_TOKEN: 'af_env_active' },
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: { deleteSavedCredentials: async () => result }
    });

    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      credentials_file_deleted: true,
      environment_token_active: true,
      warnings: ['AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.']
    });
  });

  it('prints human logout summary without JSON flag', async () => {
    const printed: string[] = [];

    await runLogoutCliCommand([], {
      env: {},
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: { deleteSavedCredentials: async () => result }
    });

    const output = printed.join('\n');
    expect(output).toContain('AgentFeed logout complete');
    expect(output).toContain('Credentials file: removed');
    expect(output).toContain('agentfeed status');
  });
});
