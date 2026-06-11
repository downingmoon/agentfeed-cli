import { leadingOptionErrorMessage } from './leading-option-recovery.js';
import type { LeadingOptionRecoveryInput } from './leading-option-recovery.js';

export function leadingOptionError(input: LeadingOptionRecoveryInput): Error {
  return new Error(leadingOptionErrorMessage(input));
}
