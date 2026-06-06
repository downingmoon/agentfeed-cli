type AnsiColor = 'bold' | 'dim' | 'red' | 'green' | 'yellow' | 'cyan' | 'gray';

const ANSI: Record<AnsiColor, [open: string, close: string]> = {
  bold: ['\x1b[1m', '\x1b[22m'],
  dim: ['\x1b[2m', '\x1b[22m'],
  red: ['\x1b[31m', '\x1b[39m'],
  green: ['\x1b[32m', '\x1b[39m'],
  yellow: ['\x1b[33m', '\x1b[39m'],
  cyan: ['\x1b[36m', '\x1b[39m'],
  gray: ['\x1b[90m', '\x1b[39m'],
};

const ANSI_ESCAPE_SEQUENCE = /\x1B(?:\[[0-?]*[ -/]*[@-~]|\][^\x07\x1B]*(?:\x07|\x1B\\)|[PX^_][^\x1B]*(?:\x1B\\)|[@-Z\\-_])/g;
const UNSAFE_TERMINAL_CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

interface StreamLike {
  isTTY?: boolean;
}

function envDisablesColor(): boolean {
  return process.env.NO_COLOR !== undefined
    || process.env.AGENTFEED_NO_COLOR === '1'
    || process.env.AGENTFEED_PLAIN === '1';
}

export function colorEnabled(stream: StreamLike = process.stdout): boolean {
  if (envDisablesColor()) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true;
  return stream.isTTY === true;
}

export function color(text: string, colorName: AnsiColor, stream: StreamLike = process.stdout): string {
  const safeText = sanitizeTerminalText(text);
  if (!colorEnabled(stream)) return safeText;
  const [open, close] = ANSI[colorName];
  return `${open}${safeText}${close}`;
}

export function sanitizeTerminalText(text: string): string {
  return text
    .replace(ANSI_ESCAPE_SEQUENCE, '')
    .replace(UNSAFE_TERMINAL_CONTROL, '')
    .replace(/\r/g, '');
}

export function heading(text: string): string {
  return color(text, 'bold');
}

export function section(text: string): string {
  return color(text, 'cyan');
}

export function muted(text: string): string {
  return color(text, 'gray');
}

export function good(text: string): string {
  return color(text, 'green');
}

export function warn(text: string): string {
  return color(text, 'yellow');
}

export function command(text: string): string {
  return color(text, 'cyan');
}

function configuredColumns(): number | null {
  const stdoutColumns = process.stdout.columns;
  if (Number.isFinite(stdoutColumns) && stdoutColumns > 0) return stdoutColumns;
  const envColumns = Number.parseInt(process.env.COLUMNS ?? '', 10);
  return Number.isFinite(envColumns) && envColumns > 0 ? envColumns : null;
}

export function terminalWidth(defaultWidth = 100): number {
  const width = configuredColumns() ?? defaultWidth;
  return Math.max(40, Math.min(width, 160));
}

export function wrapKeyValue(label: string, value: string, options: { width?: number; hangingIndent?: number } = {}): string[] {
  label = sanitizeTerminalText(label);
  value = sanitizeTerminalText(value);
  const prefix = `${label}: `;
  const width = options.width ?? terminalWidth();
  if (prefix.length + value.length <= width) return [`${prefix}${value}`];

  const indent = ' '.repeat(options.hangingIndent ?? prefix.length);
  const firstAvailable = Math.max(12, width - prefix.length);
  const nextAvailable = Math.max(12, width - indent.length);
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = prefix;
  let available = firstAvailable;

  for (const word of words) {
    const currentTextLength = current === prefix ? 0 : current.length - (lines.length ? indent.length : prefix.length);
    if (currentTextLength === 0) {
      current += word;
      continue;
    }
    if (currentTextLength + 1 + word.length <= available) {
      current += ` ${word}`;
      continue;
    }
    lines.push(current);
    current = `${indent}${word}`;
    available = nextAvailable;
  }

  if (current.trim()) lines.push(current);
  return lines.length ? lines : [`${prefix}${value}`];
}

export function formatCliError(message: string): string {
  const safeMessage = sanitizeTerminalText(message);
  if (!colorEnabled(process.stderr)) return safeMessage;
  return safeMessage
    .split('\n')
    .map((line, index) => {
      if (index === 0) return color(line, 'red', process.stderr);
      if (line.startsWith('Did you mean:')) return color(line, 'cyan', process.stderr);
      if (/^(Run|Try|Use|Command):/.test(line)) return color(line, 'gray', process.stderr);
      return line;
    })
    .join('\n');
}
