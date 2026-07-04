const DIRECT_RESULT_ROW_TYPES = new Set([
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
  readonly plan: (toolName: string | null) => void;
  readonly countResult: (rowType: string | null) => boolean;
};

function resultTypeForPlannerTool(toolName: string | null): string | null {
  switch (toolName) {
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
  const pendingResults = new Map<string, number>();

  function plan(toolName: string | null): void {
    const resultType = resultTypeForPlannerTool(toolName);
    if (!resultType) return;
    pendingResults.set(resultType, (pendingResults.get(resultType) ?? 0) + 1);
  }

  function countResult(rowType: string | null): boolean {
    if (!rowType) return false;
    if (!isAntigravityToolResultRowType(rowType)) return false;
    const resultType = rowType;
    const pendingCount = pendingResults.get(resultType) ?? 0;
    if (pendingCount <= 0) return true;
    if (pendingCount === 1) pendingResults.delete(resultType);
    else pendingResults.set(resultType, pendingCount - 1);
    return false;
  }

  return { plan, countResult };
}
