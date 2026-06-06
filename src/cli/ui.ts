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
  if (!colorEnabled(stream)) return text;
  const [open, close] = ANSI[colorName];
  return `${open}${text}${close}`;
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

export function formatCliError(message: string): string {
  if (!colorEnabled(process.stderr)) return message;
  return message
    .split('\n')
    .map((line, index) => {
      if (index === 0) return color(line, 'red', process.stderr);
      if (line.startsWith('Did you mean:')) return color(line, 'cyan', process.stderr);
      if (line.startsWith('Run:')) return color(line, 'gray', process.stderr);
      return line;
    })
    .join('\n');
}
