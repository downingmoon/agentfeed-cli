export type CliJsonErrorOutput = {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details: readonly string[];
  };
  readonly next_actions: readonly string[];
  readonly suggestions: readonly string[];
};

export function errorCodeFromMessage(message: string): string {
  const firstLine = message.split(/\r?\n/, 1)[0] ?? 'AgentFeed command failed.';
  return firstLine
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'agentfeed_error';
}

export function jsonErrorFromMessage(message: string): CliJsonErrorOutput {
  const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const details = lines.slice(1);
  const nextActions = lines
    .filter((line) => /^Run:\s+/i.test(line) || /^Use:\s+/i.test(line) || /^Try:\s+/i.test(line))
    .map((line) => line.replace(/^(Run|Use|Try):\s+/i, ''));
  const suggestions = lines
    .filter((line) => /^Did you mean:\s+/i.test(line))
    .map((line) => line.replace(/^Did you mean:\s+/i, ''));
  return {
    error: {
      code: errorCodeFromMessage(message),
      message: lines[0] ?? 'AgentFeed command failed.',
      details
    },
    next_actions: [...new Set(nextActions)],
    suggestions: [...new Set(suggestions)]
  };
}
