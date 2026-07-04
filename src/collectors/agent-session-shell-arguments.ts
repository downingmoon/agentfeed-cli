function unsafeUnescapedShellCharacter(value: string): boolean {
  return /[$`*?\[\]{}()<>|&;]/.test(value);
}

type ShellArgument = {
  readonly value: string;
  readonly nextIndex: number;
};

function unquotedShellArgument(value: string, start: number): ShellArgument | null {
  let content = '';
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (character === undefined || /\s/.test(character)) return { value: content, nextIndex: index };
    if (character === '\\') {
      const escaped = value[index + 1];
      if (escaped === undefined || /\r|\n/.test(escaped)) return null;
      content += escaped;
      index += 1;
      continue;
    }
    if (unsafeUnescapedShellCharacter(character)) return null;
    content += character;
  }
  return { value: content, nextIndex: value.length };
}

function doubleQuotedShellArgument(value: string, start: number): ShellArgument | null {
  let content = '';
  for (let index = start + 1; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') return { value: content, nextIndex: index + 1 };
    if (character === '\\' && index + 1 < value.length) {
      content += value[index + 1];
      index += 1;
      continue;
    }
    content += character;
  }
  return null;
}

export function shellPrintfArguments(value: string): string[] | null {
  const args: string[] = [];
  let index = 0;

  while (index < value.length) {
    while (/\s/.test(value[index] ?? '')) index += 1;
    if (index >= value.length) break;

    const character = value[index];
    if (character === "'") {
      const end = value.indexOf("'", index + 1);
      if (end === -1) return null;
      args.push(value.slice(index + 1, end));
      index = end + 1;
      continue;
    }

    if (character === '"') {
      const argument = doubleQuotedShellArgument(value, index);
      if (!argument) return null;
      args.push(argument.value);
      index = argument.nextIndex;
      continue;
    }

    const argument = unquotedShellArgument(value, index);
    if (!argument) return null;
    args.push(argument.value);
    index = argument.nextIndex;
  }

  return args;
}
