import { classifyLongOption } from './long-option-classification.js';
import type { LongOptionToken } from './long-option-token.js';
import { consumeFlagOption, consumeValueOption } from './option-consumption.js';

export interface LongOptionConsumptionInput {
  readonly command: string;
  readonly optionToken: LongOptionToken;
  readonly valueOptions: ReadonlySet<string>;
  readonly flags: ReadonlySet<string>;
  readonly args: readonly string[];
  readonly index: number;
  readonly unknownOptionError: (optionName: string) => Error;
}

export interface LongOptionConsumption {
  readonly optionName: string;
  readonly nextIndex: number;
}

function unreachableLongOptionClassification(classification: never): never {
  throw new Error(`Unhandled long option classification: ${classification}`);
}

export function consumeLongOption(input: LongOptionConsumptionInput): LongOptionConsumption {
  const classification = classifyLongOption({ name: input.optionToken.name, valueOptions: input.valueOptions, flags: input.flags });
  switch (classification.kind) {
    case 'value':
      return {
        optionName: classification.name,
        nextIndex: consumeValueOption({
          command: input.command,
          optionName: classification.name,
          inlineValue: input.optionToken.inlineValue,
          args: input.args,
          index: input.index
        }).nextIndex
      };
    case 'flag':
      consumeFlagOption({ command: input.command, optionName: classification.name, inlineValue: input.optionToken.inlineValue });
      return { optionName: classification.name, nextIndex: input.index };
    case 'unknown':
      throw input.unknownOptionError(classification.name);
    default:
      return unreachableLongOptionClassification(classification);
  }
}
