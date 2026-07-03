const SHELL_HEREDOC_REDIRECT_TARGET = /(?:^|\s)(?:\d?>|>>|>)\s*(['"]?)([^'"\s;&|<>]+)\1/g;

export type ShellHeredocTarget = {
  readonly paths: readonly string[];
  readonly delimiter: string;
};

export function shellHeredocDelimiter(line: string): string | null {
  return /<<\s*['"]?(?<delimiter>[A-Za-z0-9_:-]+)['"]?/.exec(line)?.groups?.delimiter ?? null;
}

function shellHeredocRedirectPath(line: string): string | null {
  SHELL_HEREDOC_REDIRECT_TARGET.lastIndex = 0;
  const stdoutRedirects = [...line.matchAll(SHELL_HEREDOC_REDIRECT_TARGET)]
    .filter((match) => !/^\s*[2-9]>/.test(match[0]))
    .map((match) => match[2])
    .filter((path) => Boolean(path));
  const lastRedirect = stdoutRedirects.at(-1);
  return lastRedirect === '/dev/null' ? null : lastRedirect ?? null;
}

function shellHeredocTeePaths(line: string): string[] {
  const args = /(?:^|\s)tee\s+(?<args>[^|<>;&]*)/.exec(line)?.groups?.args?.trim();
  if (!args) return [];
  const words: string[] = [];
  const pattern = /'(?<single>[^']*)'|"(?<double>(?:\\"|[^"])*)"|(?<bare>\S+)/g;
  for (const match of args.matchAll(pattern)) {
    const word = match.groups?.single ?? match.groups?.double?.replace(/\\"/g, '"') ?? match.groups?.bare;
    if (word && !word.startsWith('-') && word !== '--') words.push(word);
  }
  return words;
}

export function shellHeredocTarget(line: string): ShellHeredocTarget | null {
  const delimiter = shellHeredocDelimiter(line);
  if (!delimiter) return null;
  const tee = shellHeredocTeePaths(line);
  if (tee.length) return { paths: tee, delimiter };
  const redirect = shellHeredocRedirectPath(line);
  if (redirect) return { paths: [redirect], delimiter };
  return null;
}
