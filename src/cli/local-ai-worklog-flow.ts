import { createInterface } from 'node:readline/promises';
import { stdin as processStdin, stdout as processStdout } from 'node:process';
import { writeDraft } from '../draft/write.js';
import { applyAiWorklogPatch, buildAiWorklogPrompt, parseAiWorklogPatch } from '../llm/local-worklog-draft.js';
import { detectLocalAiWorklogTools, runLocalAiWorklogTool, type LocalAiWorklogTool, type LocalAiWorklogToolDependencies, type LocalAiWorklogToolId } from '../llm/local-worklog-tools.js';
import type { LocalDraft } from '../types.js';
import { flag, option } from './args.js';

export type LocalAiWorklogPrompt = (question: string) => Promise<string>;
export type LocalAiWorklogFlow = (input: LocalAiWorklogFlowInput) => Promise<LocalAiWorklogFlowResult>;

export type LocalAiWorklogFlowInput = {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly draft: LocalDraft;
  readonly uploadRequested: boolean;
  readonly json: boolean;
  readonly interactive: boolean;
  readonly printLines: (lines: readonly string[]) => void;
  readonly prompt?: LocalAiWorklogPrompt;
  readonly dependencies?: LocalAiWorklogToolDependencies;
};

export type LocalAiWorklogFlowResult = {
  readonly draft: LocalDraft;
  readonly warnings: readonly string[];
};

const VALID_TOOL_IDS: readonly LocalAiWorklogToolId[] = ['claude', 'codex', 'gemini', 'antigravity'] as const;

function parseToolId(value: string): LocalAiWorklogToolId {
  for (const id of VALID_TOOL_IDS) {
    if (value === id) return id;
  }
  throw new Error(`Unsupported --ai-worklog-tool value: ${value}. Use claude, codex, gemini, or antigravity.`);
}

function defaultPrompt(question: string): Promise<string> {
  const rl = createInterface({ input: processStdin, output: processStdout });
  return rl.question(question).finally(() => rl.close());
}

function toolById(tools: readonly LocalAiWorklogTool[], id: LocalAiWorklogToolId): LocalAiWorklogTool | null {
  return tools.find((tool) => tool.id === id) ?? null;
}

async function chooseTool(input: {
  readonly tools: readonly LocalAiWorklogTool[];
  readonly prompt: LocalAiWorklogPrompt;
  readonly interactive: boolean;
}): Promise<LocalAiWorklogTool | null> {
  if (input.tools.length === 0) return null;
  if (input.tools.length === 1) return input.tools[0] ?? null;
  if (!input.interactive) return null;
  const lines = input.tools.map((tool, index) => `${index + 1}) ${tool.label}`).join('\n');
  const answer = (await input.prompt(`Choose local AI CLI for worklog:\n${lines}\nSelect [1-${input.tools.length}]: `)).trim();
  const selected = Number.parseInt(answer, 10);
  if (!Number.isInteger(selected) || selected < 1 || selected > input.tools.length) return null;
  return input.tools[selected - 1] ?? null;
}

async function shouldRunAiWorklog(input: LocalAiWorklogFlowInput, prompt: LocalAiWorklogPrompt): Promise<boolean> {
  if (flag(input.args, '--no-ai-worklog')) return false;
  if (input.json) return false;
  if (flag(input.args, '--ai-worklog') || option([...input.args], '--ai-worklog-tool')) return true;
  if (!input.uploadRequested || !input.interactive) return false;
  const answer = (await prompt('Use a local AI CLI to improve this worklog before upload? [y/N] ')).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}

export async function runLocalAiWorklogFlow(input: LocalAiWorklogFlowInput): Promise<LocalAiWorklogFlowResult> {
  const warnings: string[] = [];
  const prompt = input.prompt ?? defaultPrompt;
  const requestedToolValue = option([...input.args], '--ai-worklog-tool');
  const requestedTool = requestedToolValue ? parseToolId(requestedToolValue) : null;
  if (!await shouldRunAiWorklog(input, prompt)) return { draft: input.draft, warnings };

  const tools = await detectLocalAiWorklogTools(input.dependencies);
  const selectedTool = requestedTool
    ? toolById(tools, requestedTool)
    : await chooseTool({ tools, prompt, interactive: input.interactive });
  if (!selectedTool) {
    const warning = requestedTool ? `Local AI CLI not found: ${requestedTool}.` : 'No local AI CLI selected or detected; worklog was not changed.';
    if (input.uploadRequested) throw new Error(warning);
    warnings.push(warning);
    return { draft: input.draft, warnings };
  }

  input.printLines([`Improving worklog with ${selectedTool.label}...`]);
  try {
    const response = await runLocalAiWorklogTool({
      tool: selectedTool,
      cwd: input.cwd,
      prompt: buildAiWorklogPrompt(input.draft),
      dependencies: input.dependencies
    });
    const nextDraft = applyAiWorklogPatch(input.draft, parseAiWorklogPatch(response));
    await writeDraft(input.cwd, nextDraft);
    input.printLines([`Worklog improved with ${selectedTool.label}.`]);
    return { draft: nextDraft, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown local AI worklog error.';
    const warning = `Local AI worklog failed (${selectedTool.label}): ${message}`;
    if (input.uploadRequested) throw new Error(warning);
    warnings.push(warning);
    return { draft: input.draft, warnings };
  }
}
