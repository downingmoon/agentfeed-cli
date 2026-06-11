import { optionDoesNotAcceptValueMessage, optionRequiresValueMessage } from './command-recovery.js';

export interface ValueOptionConsumptionInput {
  readonly command: string;
  readonly optionName: string;
  readonly inlineValue: string | null;
  readonly args: readonly string[];
  readonly index: number;
}

export interface ValueOptionConsumption {
  readonly nextIndex: number;
}

export function consumeValueOption(input: ValueOptionConsumptionInput): ValueOptionConsumption {
  if (input.inlineValue !== null) {
    if (input.inlineValue.length === 0) throw new Error(optionRequiresValueMessage(input.command, input.optionName));
    return { nextIndex: input.index };
  }

  const value = input.args[input.index + 1];
  if (!value || value.startsWith('--')) throw new Error(optionRequiresValueMessage(input.command, input.optionName));
  return { nextIndex: input.index + 1 };
}

export interface FlagOptionConsumptionInput {
  readonly command: string;
  readonly optionName: string;
  readonly inlineValue: string | null;
}

export interface FlagOptionConsumption {
  readonly accepted: true;
}

export function consumeFlagOption(input: FlagOptionConsumptionInput): FlagOptionConsumption {
  if (input.inlineValue !== null) throw new Error(optionDoesNotAcceptValueMessage(input.command, input.optionName));
  return { accepted: true };
}
