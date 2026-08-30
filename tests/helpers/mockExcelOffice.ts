/**
 * Mock support helper.
 * Tracks Office.js API surface used in infrastructure:
 * - Office.HostType
 * - Office.HostType.Excel
 * - Office.VisibilityMode.taskpane
 * - Office.context.host
 * - Office.context.document.settings
 */
export function mockExcelOffice(overrides: Record<string, unknown> = {}) {
  const { context: contextOverrides, ...restOverrides } = overrides;
  const context = {
    host: 'Excel',
    ...(contextOverrides as Record<string, unknown> | undefined),
  };

  return {
    HostType: { Excel: 'Excel' },
    VisibilityMode: { taskpane: 'Taskpane', hidden: 'Hidden' },
    ...restOverrides,
    context,
  } as unknown as typeof Office;
}
