import type { ChangedFileSummary } from '../types.js';

export type FileEvidence = {
  readonly path: string;
  readonly status: ChangedFileSummary['status'];
  readonly added?: number | null;
  readonly removed?: number | null;
};
