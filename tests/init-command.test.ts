import { describe, expect, it } from 'vitest';
import { runInitCliCommand } from '../src/cli/init-command.js';
import { defaultProjectConfig } from '../src/config/defaults.js';

const config = defaultProjectConfig({ name: 'init-wrapper', slug: 'init-wrapper' });

describe('init command wrapper', () => {
  it('prints JSON init payload from project initialization result', async () => {
    const printed: string[] = [];

    await runInitCliCommand(['--json', '--project-name', 'init-wrapper'], {
      cwd: '/tmp/agentfeed-init-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        initProject: async (_options) => ({
          alreadyInitialized: false,
          config,
          root: '/tmp/agentfeed-init-command',
          backupPaths: []
        })
      }
    });

    expect(printed).toHaveLength(1);
    expect(JSON.parse(printed[0])).toMatchObject({
      already_initialized: false,
      project: { name: 'init-wrapper', visibility: 'private' },
      config_path: '.agentfeed/config.json'
    });
  });

  it('prints human init output when JSON is not requested', async () => {
    const printed: string[] = [];

    await runInitCliCommand([], {
      cwd: '/tmp/agentfeed-init-command',
      print: (text = '') => { printed.push(text); },
      printLines: (lines) => { printed.push(...lines); },
      dependencies: {
        initProject: async () => ({
          alreadyInitialized: true,
          config,
          root: '/tmp/agentfeed-init-command',
          backupPaths: ['/tmp/agentfeed-init-command/.agentfeed/config.json.bak']
        })
      }
    });

    const output = printed.join('\n');
    expect(output).toContain('AgentFeed already initialized');
    expect(output).toContain('Project: init-wrapper');
    expect(output).toContain('agentfeed status');
  });
});
