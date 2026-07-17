import { flag } from './args.js';
import { publishJsonPayload, renderPublishUploadResultLines } from './publish-output.js';
import { confirmUploadFromTerminal as defaultConfirmUploadFromTerminal, type UploadConfirmationPrompt } from './upload-confirmation-prompt.js';
import { runPublishCommand as defaultRunPublishCommand, type PublishCommandResult, type PublishCommandOptions } from './publish-execution.js';
import { renderUploadConfirmationRequiredLines } from './upload-output.js';

type ResolveDraftId = (cwd: string, args: string[]) => Promise<string>;
type RunPublishCommand = (options: PublishCommandOptions) => Promise<PublishCommandResult>;
type ConfirmUploadFromTerminal = typeof defaultConfirmUploadFromTerminal;

export type PublishCliCommandIo = {
  readonly cwd: string;
  readonly print: (text?: string) => void;
  readonly printLines: (lines: readonly string[]) => void;
  readonly resolveDraftId: ResolveDraftId;
  readonly runPublishCommand?: RunPublishCommand;
  readonly confirmUploadFromTerminal?: ConfirmUploadFromTerminal;
  readonly interactive?: boolean;
  readonly prompt?: UploadConfirmationPrompt;
};

export async function runPublishCliCommand(args: string[], io: PublishCliCommandIo): Promise<void> {
  const id = await io.resolveDraftId(io.cwd, args);
  const runPublishCommand = io.runPublishCommand ?? defaultRunPublishCommand;
  let result = await runPublishCommand({
    cwd: io.cwd,
    id,
    flags: {
      json: flag(args, '--json'),
      yes: flag(args, '--yes') || flag(args, '-y'),
      clipboard: flag(args, '--clipboard'),
      noClipboard: flag(args, '--no-clipboard'),
      openReview: flag(args, '--open-review'),
      noOpenReview: flag(args, '--no-open-review')
    }
  });
  if (result.kind === 'confirmation_required') {
    io.printLines(renderUploadConfirmationRequiredLines(
      result.draft,
      result.command,
      undefined,
      result.cacheReuseReason ? { cacheReuseReason: result.cacheReuseReason } : {}
    ));
    const confirmUploadFromTerminal = io.confirmUploadFromTerminal ?? defaultConfirmUploadFromTerminal;
    if (!await confirmUploadFromTerminal({ interactive: io.interactive, prompt: io.prompt })) return;
    result = await runPublishCommand({
      cwd: io.cwd,
      id,
      flags: {
        json: flag(args, '--json'),
        yes: true,
        clipboard: flag(args, '--clipboard'),
        noClipboard: flag(args, '--no-clipboard'),
        openReview: flag(args, '--open-review'),
        noOpenReview: flag(args, '--no-open-review')
      }
    });
    if (result.kind === 'confirmation_required') throw new Error('Internal error: confirmed publish should not require confirmation.');
  }
  if (flag(args, '--json')) {
    io.print(JSON.stringify(publishJsonPayload({ draft: result.draft, upload: result.upload, handoff: result.handoff }), null, 2));
    return;
  }
  io.printLines(renderPublishUploadResultLines({ draft: result.draft, upload: result.upload, handoff: result.handoff }));
}
