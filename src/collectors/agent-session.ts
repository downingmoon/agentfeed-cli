import { homedir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import type { AgentType, ChangedFileSummary, WorklogMetrics } from '../types.js';

export interface AgentSessionMetrics extends WorklogMetrics {
  session_id?: string | null;
  model?: string | null;
  changed_files: ChangedFileSummary[];
}

interface CollectAgentSessionOptions {
  cwd: string;
  source: AgentType;
  sessionFile?: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}

function numeric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function integer(value: unknown): number | null {
  const n = numeric(value);
  return n ? Math.trunc(n) : null;
}

function safeJsonParse(text: string): unknown | null {
  try { return JSON.parse(text); } catch { return null; }
}

function findStructuredCwd(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  const cwd = asString(record.cwd);
  if (cwd) return cwd;
  const payload = asRecord(record.payload);
  if (payload) {
    const payloadCwd = asString(payload.cwd);
    if (payloadCwd) return payloadCwd;
  }
  return null;
}

export async function sessionFileBelongsToProject(sessionFile: string, cwd: string): Promise<boolean> {
  const projectRoot = resolve(cwd);
  for (const line of (await readFile(sessionFile, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const structuredCwd = findStructuredCwd(safeJsonParse(line));
    if (!structuredCwd) continue;
    const absoluteCwd = resolve(structuredCwd);
    if (absoluteCwd === projectRoot || absoluteCwd.startsWith(`${projectRoot}/`)) return true;
  }
  return false;
}

function languageFor(path: string): string | null {
  const ext = extname(path).toLowerCase();
  return ({ '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.md': 'Markdown', '.json': 'JSON' } as Record<string, string>)[ext] ?? null;
}

function relativeProjectPath(cwd: string, filePath: string): string | null {
  const absolute = isAbsolute(filePath) ? resolve(filePath) : resolve(cwd, filePath);
  const rel = relative(resolve(cwd), absolute);
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split('\\').join('/');
}

function countTextLines(text: string): number {
  if (!text) return 0;
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  if (!normalized) return 0;
  return normalized.split(/\r?\n/).length;
}

function countUnifiedDiff(diff: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) added += 1;
    else if (line.startsWith('-')) removed += 1;
  }
  return { added, removed };
}

function upsertFile(
  files: Map<string, ChangedFileSummary>,
  path: string,
  input: { status?: ChangedFileSummary['status']; added?: number | null; removed?: number | null }
) {
  const current = files.get(path) ?? {
    path,
    extension: extname(path) || null,
    language: languageFor(path),
    status: input.status ?? 'modified',
    publish_path: false,
    lines_added: 0,
    lines_removed: 0
  };
  current.status = input.status ?? current.status;
  current.lines_added = (current.lines_added ?? 0) + (input.added ?? 0);
  current.lines_removed = (current.lines_removed ?? 0) + (input.removed ?? 0);
  files.set(path, current);
}

function isTestCommand(command: string): boolean {
  const normalized = command.trim();
  return /(^|&&|\|\||;)\s*(npm|pnpm|yarn|bun)\s+(run\s+)?(test|test:[\w:-]+)\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*(npx\s+)?(vitest|jest|pytest|mocha|playwright|cypress)\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*go\s+test\b/i.test(normalized)
    || /(^|&&|\|\||;)\s*cargo\s+test\b/i.test(normalized);
}

function commandFailed(output: string): boolean {
  return /Process exited with code [1-9]\d*|exit code [1-9]\d*|\bFAIL\b|failed/i.test(output);
}

function parseIsoMillis(value: unknown): number | null {
  const text = asString(value);
  if (!text) return null;
  const millis = Date.parse(text);
  return Number.isFinite(millis) ? millis : null;
}

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  return asRecord(safeJsonParse(await readFile(path, 'utf8').catch(() => '')));
}

function finalize(input: {
  sessionId?: string | null;
  model?: string | null;
  files: Map<string, ChangedFileSummary>;
  tokensUsed: number;
  durationSeconds?: number | null;
  testsRun: number;
  failedCommands: number;
  failedTestCommands?: number;
  commandsRun?: number;
  toolCalls?: number;
  skills?: Set<string>;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentTurns?: number;
  agentModes?: Set<string>;
}): AgentSessionMetrics | null {
  const changedFiles = [...input.files.values()];
  const linesAdded = changedFiles.reduce((sum, file) => sum + (file.lines_added ?? 0), 0);
  const linesRemoved = changedFiles.reduce((sum, file) => sum + (file.lines_removed ?? 0), 0);
  const skillsUsed = input.skills?.size ?? 0;
  const agentModes = [...(input.agentModes ?? new Set<string>())].sort();
  if (!input.sessionId && !input.model && !changedFiles.length && !input.tokensUsed && !input.testsRun && !input.failedCommands && !input.toolCalls && !input.commandsRun && !skillsUsed && !input.subagentsSpawned && !input.agentTurns) return null;
  return {
    session_id: input.sessionId ?? null,
    model: input.model ?? null,
    changed_files: changedFiles,
    tokens_used: input.tokensUsed || null,
    duration_seconds: input.durationSeconds ? Math.round(input.durationSeconds) : null,
    files_changed: changedFiles.length || null,
    lines_added: linesAdded || null,
    lines_removed: linesRemoved || null,
    tests_run: input.testsRun || null,
    tests_passed: input.testsRun ? Math.max(input.testsRun - (input.failedTestCommands ?? 0), 0) : null,
    failed_commands: input.failedCommands || null,
    commands_run: input.commandsRun || null,
    tool_calls: input.toolCalls || null,
    skills_used: skillsUsed || null,
    subagents_spawned: input.subagentsSpawned || null,
    subagents_completed: input.subagentsCompleted || null,
    agent_turns: input.agentTurns || null,
    agent_modes: agentModes.length ? agentModes : null
  };
}

async function readOmcMetadata(cwd: string, sessionId: string | null): Promise<{
  toolCalls?: number;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentModes?: string[];
}> {
  if (!sessionId) return {};
  const result: { toolCalls?: number; subagentsSpawned?: number; subagentsCompleted?: number; agentModes?: string[] } = {};
  const session = await readJsonFile(join(cwd, '.omc', 'sessions', `${sessionId}.json`));
  if (session) {
    result.subagentsSpawned = integer(session.agents_spawned) ?? undefined;
    result.subagentsCompleted = integer(session.agents_completed) ?? undefined;
    result.agentModes = Array.isArray(session.modes_used) ? session.modes_used.filter((mode): mode is string => typeof mode === 'string') : undefined;
  }
  const stats = await readJsonFile(join(homedir(), '.claude', '.session-stats.json'));
  const statsSession = asRecord(asRecord(stats?.sessions)?.[sessionId]);
  const totalCalls = integer(statsSession?.total_calls);
  if (totalCalls) result.toolCalls = totalCalls;
  return result;
}

async function readOmxMetadata(cwd: string, sessionId: string | null): Promise<{
  tokensUsed?: number;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentTurns?: number;
  agentModes?: string[];
}> {
  const result: { tokensUsed?: number; subagentsSpawned?: number; subagentsCompleted?: number; agentTurns?: number; agentModes?: string[] } = {};
  const metrics = await readJsonFile(join(cwd, '.omx', 'metrics.json'));
  result.tokensUsed = integer(metrics?.session_total_tokens) ?? undefined;
  const tracking = await readJsonFile(join(cwd, '.omx', 'state', 'subagent-tracking.json'));
  const sessions = asRecord(tracking?.sessions);
  const session = (sessionId && asRecord(sessions?.[sessionId])) || (sessions ? asRecord(Object.values(sessions)[0]) : null);
  const threads = asRecord(session?.threads);
  if (threads) {
    let spawned = 0;
    let turns = 0;
    const modes = new Set<string>();
    for (const threadRaw of Object.values(threads)) {
      const thread = asRecord(threadRaw);
      if (!thread) continue;
      if (thread.kind === 'subagent') spawned += 1;
      turns += integer(thread.turn_count) ?? 0;
      const mode = asString(thread.mode);
      if (mode) modes.add(mode);
    }
    result.subagentsSpawned = spawned || undefined;
    result.subagentsCompleted = spawned || undefined;
    result.agentTurns = turns || undefined;
    result.agentModes = [...modes];
  }
  return result;
}

async function parseClaudeSessionFile(cwd: string, sessionFile: string): Promise<AgentSessionMetrics | null> {
  const files = new Map<string, ChangedFileSummary>();
  let tokensUsed = 0;
  let durationSeconds: number | null = null;
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  let subagentsSpawned = 0;
  let subagentsCompleted = 0;
  let sessionId: string | null = null;
  let model: string | null = null;

  for (const line of (await readFile(sessionFile, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const row = asRecord(safeJsonParse(line));
    if (!row) continue;
    const message = asRecord(row.message);
    if (!message) continue;
    sessionId ??= asString(row.sessionId);
    model ??= asString(message.model);
    const usage = asRecord(message.usage);
    if (usage) tokensUsed += numeric(usage.input_tokens) + numeric(usage.cache_creation_input_tokens) + numeric(usage.cache_read_input_tokens) + numeric(usage.output_tokens);
    const content = Array.isArray(message.content) ? message.content : [];
    for (const itemRaw of content) {
      const item = asRecord(itemRaw);
      if (!item || item.type !== 'tool_use') continue;
      toolCalls += 1;
      const name = asString(item.name);
      const input = asRecord(item.input) ?? {};
      const filePath = asString(input.file_path);
      if (filePath && ['Write', 'Edit', 'MultiEdit'].includes(name ?? '')) {
        const rel = relativeProjectPath(cwd, filePath);
        if (!rel) continue;
        let added = 0;
        let removed = 0;
        if (name === 'Write') added = countTextLines(asString(input.content) ?? '');
        else if (name === 'Edit') {
          added = countTextLines(asString(input.new_string) ?? '');
          removed = countTextLines(asString(input.old_string) ?? '');
        } else if (Array.isArray(input.edits)) {
          for (const editRaw of input.edits) {
            const edit = asRecord(editRaw) ?? {};
            added += countTextLines(asString(edit.new_string) ?? '');
            removed += countTextLines(asString(edit.old_string) ?? '');
          }
        }
        upsertFile(files, rel, { status: name === 'Write' ? 'added' : 'modified', added, removed });
      }
      if (name === 'Bash') {
        const command = asString(input.command) ?? '';
        commandsRun += 1;
        if (isTestCommand(command)) testsRun += 1;
      }
      if (name === 'Skill') {
        const skill = asString(input.skill);
        if (skill) skills.add(skill);
      }
      if (name === 'Agent') subagentsSpawned += 1;
    }
  }
  const omc = await readOmcMetadata(cwd, sessionId);
  toolCalls = Math.max(toolCalls, omc.toolCalls ?? 0);
  subagentsSpawned = Math.max(subagentsSpawned, omc.subagentsSpawned ?? 0);
  subagentsCompleted = Math.max(subagentsCompleted, omc.subagentsCompleted ?? 0);
  for (const mode of omc.agentModes ?? []) agentModes.add(mode);
  return finalize({ sessionId, model, files, tokensUsed, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentModes });
}

function codexTokenTotal(info: Record<string, unknown>): number {
  const direct = numeric(info.total_tokens) || numeric(info.total);
  if (direct) return direct;
  const total = asRecord(info.total_token_usage) ?? asRecord(info.token_usage) ?? info;
  const nestedDirect = numeric(total.total_tokens) || numeric(total.total);
  if (nestedDirect) return nestedDirect;
  return numeric(total.input_tokens) + numeric(total.cached_input_tokens) + numeric(total.cache_read_input_tokens) + numeric(total.cache_creation_input_tokens) + numeric(total.output_tokens);
}

async function parseCodexSessionFile(cwd: string, sessionFile: string): Promise<AgentSessionMetrics | null> {
  const files = new Map<string, ChangedFileSummary>();
  const commands = new Map<string, { command: string; test: boolean }>();
  let tokensUsed = 0;
  let durationSeconds: number | null = null;
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  let subagentsSpawned = 0;
  let subagentsCompleted = 0;
  let agentTurns = 0;
  let sessionId: string | null = null;
  let model: string | null = null;

  for (const line of (await readFile(sessionFile, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const row = asRecord(safeJsonParse(line));
    const payload = asRecord(row?.payload);
    if (!payload) continue;
    if (row?.type === 'session_meta') {
      sessionId ??= asString(payload.id);
      model ??= asString(payload.model);
    }
    if (payload.type === 'token_count') {
      const info = asRecord(payload.info);
      if (info) tokensUsed = Math.max(tokensUsed, codexTokenTotal(info));
    }
    if (payload.type === 'function_call' && payload.name === 'exec_command') {
      toolCalls += 1;
      const callId = asString(payload.call_id);
      const argsText = asString(payload.arguments);
      const args = argsText ? asRecord(safeJsonParse(argsText)) : null;
      const command = asString(args?.cmd) ?? '';
      if (callId && command) {
        commandsRun += 1;
        const test = isTestCommand(command);
        if (test) testsRun += 1;
        commands.set(callId, { command, test });
      }
    }
    if (payload.type === 'custom_tool_call') toolCalls += 1;
    if (payload.type === 'function_call_output') {
      const callId = asString(payload.call_id);
      const command = callId ? commands.get(callId) : null;
      if (command && commandFailed(asString(payload.output) ?? '')) {
        failedCommands += 1;
        if (command.test) failedTestCommands += 1;
      }
    }
    if (payload.type === 'patch_apply_end' && payload.status !== 'failed') {
      const changes = asRecord(payload.changes);
      if (!changes) continue;
      for (const [absolutePath, changeRaw] of Object.entries(changes)) {
        const rel = relativeProjectPath(cwd, absolutePath);
        if (!rel) continue;
        const change = asRecord(changeRaw) ?? {};
        const kind = asString(change.type);
        let added = 0;
        let removed = 0;
        const diff = asString(change.unified_diff);
        if (diff) {
          const counts = countUnifiedDiff(diff);
          added = counts.added;
          removed = counts.removed;
        } else {
          added = countTextLines(asString(change.content) ?? '');
        }
        upsertFile(files, rel, { status: kind === 'add' ? 'added' : kind === 'delete' ? 'deleted' : 'modified', added, removed });
      }
    }
  }
  const omx = await readOmxMetadata(cwd, sessionId);
  tokensUsed = Math.max(tokensUsed, omx.tokensUsed ?? 0);
  subagentsSpawned = Math.max(subagentsSpawned, omx.subagentsSpawned ?? 0);
  subagentsCompleted = Math.max(subagentsCompleted, omx.subagentsCompleted ?? 0);
  agentTurns = Math.max(agentTurns, omx.agentTurns ?? 0);
  for (const mode of omx.agentModes ?? []) agentModes.add(mode);
  return finalize({ sessionId, model, files, tokensUsed, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted, agentTurns, agentModes });
}

function geminiTokenTotal(tokens: Record<string, unknown>): number {
  const total = numeric(tokens.total);
  if (total) return total;
  return numeric(tokens.input) + numeric(tokens.cached) + numeric(tokens.output) + numeric(tokens.thoughts) + numeric(tokens.tool);
}

async function parseGeminiSessionFile(cwd: string, sessionFile: string): Promise<AgentSessionMetrics | null> {
  const files = new Map<string, ChangedFileSummary>();
  const skills = new Set<string>();
  const agentModes = new Set<string>();
  let sessionId: string | null = null;
  let model: string | null = null;
  let tokensUsed = 0;
  let testsRun = 0;
  let failedCommands = 0;
  let failedTestCommands = 0;
  let commandsRun = 0;
  let toolCalls = 0;
  let startMillis: number | null = null;
  let endMillis: number | null = null;
  let subagentsSpawned = 0;

  for (const line of (await readFile(sessionFile, 'utf8')).split('\n')) {
    if (!line.trim()) continue;
    const row = asRecord(safeJsonParse(line));
    if (!row) continue;
    sessionId ??= asString(row.sessionId);
    startMillis ??= parseIsoMillis(row.startTime);
    const rowEndMillis = parseIsoMillis(row.lastUpdated) ?? parseIsoMillis(row.timestamp);
    if (rowEndMillis) endMillis = Math.max(endMillis ?? 0, rowEndMillis);
    model ??= asString(row.model);
    const tokens = asRecord(row.tokens);
    if (tokens) tokensUsed += geminiTokenTotal(tokens);
    const calls = Array.isArray(row.toolCalls) ? row.toolCalls : [];
    for (const callRaw of calls) {
      const call = asRecord(callRaw);
      if (!call) continue;
      toolCalls += 1;
      const name = asString(call.name);
      const args = asRecord(call.args) ?? {};
      const status = asString(call.status);
      if (name === 'activate_skill') {
        const skill = asString(args.name);
        if (skill) skills.add(skill);
      } else if (name === 'write_file') {
        const rel = relativeProjectPath(cwd, asString(args.file_path) ?? '');
        if (rel) upsertFile(files, rel, { status: 'added', added: countTextLines(asString(args.content) ?? ''), removed: 0 });
      } else if (name === 'replace') {
        const rel = relativeProjectPath(cwd, asString(args.file_path) ?? '');
        if (rel) upsertFile(files, rel, { status: 'modified', added: countTextLines(asString(args.new_string) ?? ''), removed: countTextLines(asString(args.old_string) ?? '') });
      } else if (name === 'run_shell_command') {
        commandsRun += 1;
        const command = asString(args.command) ?? '';
        const failed = status === 'error' || commandFailed(asString(call.resultDisplay) ?? '');
        if (failed) failedCommands += 1;
        if (isTestCommand(command)) {
          testsRun += 1;
          if (failed) failedTestCommands += 1;
        }
      } else if (name === 'invoke_agent') {
        subagentsSpawned += 1;
      } else if (name === 'update_topic') {
        agentModes.add('superpowers');
      }
    }
  }
  const durationSeconds = startMillis && endMillis && endMillis > startMillis ? (endMillis - startMillis) / 1000 : null;
  return finalize({ sessionId, model, files, tokensUsed, durationSeconds, testsRun, failedCommands, failedTestCommands, commandsRun, toolCalls, skills, subagentsSpawned, subagentsCompleted: subagentsSpawned, agentModes });
}

function claudeProjectDirName(cwd: string): string {
  return resolve(cwd).replace(/\//g, '-');
}

async function newestJsonlUnder(dir: string, limit = 80): Promise<string[]> {
  async function walk(current: string, depth: number): Promise<Array<{ path: string; mtime: number }>> {
    if (depth < 0) return [];
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); } catch { return []; }
    const rows: Array<{ path: string; mtime: number }> = [];
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) rows.push(...await walk(path, depth - 1));
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try { rows.push({ path, mtime: (await stat(path)).mtimeMs }); } catch { /* ignore */ }
      }
    }
    return rows;
  }
  return (await walk(dir, 5)).sort((a, b) => b.mtime - a.mtime).slice(0, limit).map((row) => row.path);
}

async function discoverSessionFile(cwd: string, source: AgentType): Promise<string | null> {
  const home = homedir();
  const candidates: string[] = [];
  if (source === 'claude_code') {
    candidates.push(...await newestJsonlUnder(join(home, '.claude', 'projects', claudeProjectDirName(cwd)), 20));
    candidates.push(...await newestJsonlUnder(join(home, '.claude', 'projects'), 80));
  } else if (source === 'codex') {
    candidates.push(...await newestJsonlUnder(join(home, '.codex', 'sessions'), 120));
  } else if (source === 'gemini_cli') {
    for (const tmpProject of await readdir(join(home, '.gemini', 'tmp'), { withFileTypes: true }).catch(() => [])) {
      if (tmpProject.isDirectory()) candidates.push(...await newestJsonlUnder(join(home, '.gemini', 'tmp', tmpProject.name, 'chats'), 20));
    }
  } else {
    return null;
  }
  for (const candidate of [...new Set(candidates)]) {
    if (source === 'gemini_cli') {
      const projectRoot = await readFile(join(dirname(dirname(candidate)), '.project_root'), 'utf8').catch(() => '');
      if (resolve(projectRoot.trim()) === resolve(cwd)) return candidate;
      continue;
    }
    if (await sessionFileBelongsToProject(candidate, cwd).catch(() => false)) return candidate;
  }
  return null;
}

export async function collectAgentSessionMetrics(options: CollectAgentSessionOptions): Promise<AgentSessionMetrics | null> {
  const sessionFile = options.sessionFile ? resolve(options.cwd, options.sessionFile) : await discoverSessionFile(options.cwd, options.source);
  if (!sessionFile || basename(sessionFile).startsWith('.')) return null;
  if (options.source === 'claude_code') return parseClaudeSessionFile(options.cwd, sessionFile);
  if (options.source === 'codex') return parseCodexSessionFile(options.cwd, sessionFile);
  if (options.source === 'gemini_cli') return parseGeminiSessionFile(options.cwd, sessionFile);
  return null;
}
