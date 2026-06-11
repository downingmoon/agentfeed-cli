import { bareDoubleDashArgumentMessage } from './command-recovery.js';

export function bareDoubleDashError(command: string): Error {
  return new Error(bareDoubleDashArgumentMessage(command));
}
