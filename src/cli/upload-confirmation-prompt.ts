import { createInterface } from 'node:readline/promises';
import { stdin as processStdin, stdout as processStdout } from 'node:process';

export type UploadConfirmationPrompt = (question: string) => Promise<string>;

export type UploadConfirmationPromptInput = {
  readonly interactive?: boolean;
  readonly prompt?: UploadConfirmationPrompt;
};

function defaultPrompt(question: string): Promise<string> {
  const rl = createInterface({ input: processStdin, output: processStdout });
  return rl.question(question).finally(() => rl.close());
}

export async function confirmUploadFromTerminal(input: UploadConfirmationPromptInput = {}): Promise<boolean> {
  const interactive = input.interactive ?? Boolean(processStdin.isTTY && processStdout.isTTY);
  if (!interactive) return false;
  const prompt = input.prompt ?? defaultPrompt;
  const answer = (await prompt('Upload this private AgentFeed review draft now? [y/N] ')).trim().toLowerCase();
  return answer === 'y' || answer === 'yes';
}
