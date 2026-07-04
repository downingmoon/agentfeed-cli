const DIRECT_RESULT_ROW_TYPES = new Set([
  'ASK_QUESTION',
  'CODE_ACTION',
  'GENERATE_IMAGE',
  'INVOKE_SUBAGENT',
  'LIST_DIRECTORY',
  'VIEW_FILE'
]);

export function isAntigravityToolResultRowType(rowType: string | null): boolean {
  if (!rowType) return false;
  return DIRECT_RESULT_ROW_TYPES.has(rowType);
}

export type AntigravityToolResultTracker = {
  readonly plan: (toolName: string | null, expectedPath?: string | null) => void;
  readonly countResult: (rowType: string | null, observedPaths?: readonly string[]) => boolean;
};

type PendingAntigravityResult = {
  readonly rowType: string;
  readonly expectedPath: string | null;
};

function resultTypeForPlannerTool(toolName: string | null): string | null {
  switch (toolName) {
    case 'ask_question':
      return 'ASK_QUESTION';
    case 'generate_image':
      return 'GENERATE_IMAGE';
    case 'invoke_subagent':
      return 'INVOKE_SUBAGENT';
    case 'list_dir':
      return 'LIST_DIRECTORY';
    case 'multi_replace_file_content':
    case 'replace_file_content':
    case 'write_to_file':
      return 'CODE_ACTION';
    case 'view_file':
      return 'VIEW_FILE';
    default:
      return null;
  }
}

export function createAntigravityToolResultTracker(): AntigravityToolResultTracker {
  const pendingResults: PendingAntigravityResult[] = [];

  function plan(toolName: string | null, expectedPath: string | null = null): void {
    const resultType = resultTypeForPlannerTool(toolName);
    if (!resultType) return;
    pendingResults.push({ rowType: resultType, expectedPath });
  }

  function pendingResultMatches(pending: PendingAntigravityResult, rowType: string, observedPaths: readonly string[]): boolean {
    if (pending.rowType !== rowType) return false;
    if (pending.expectedPath == null) return true;
    return observedPaths.includes(pending.expectedPath);
  }

  function countResult(rowType: string | null, observedPaths: readonly string[] = []): boolean {
    if (!rowType) return false;
    if (!isAntigravityToolResultRowType(rowType)) return false;
    const pendingIndex = pendingResults.findIndex((pending) => pendingResultMatches(pending, rowType, observedPaths));
    if (pendingIndex < 0) return true;
    pendingResults.splice(pendingIndex, 1);
    return false;
  }

  return { plan, countResult };
}
