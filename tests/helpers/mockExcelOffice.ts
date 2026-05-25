export function mockExcelOffice(overrides: Record<string, unknown> = {}) {
  const { context: contextOverrides, ...restOverrides } = overrides;
  const context = {
    host: 'Excel',
    ...(contextOverrides as Record<string, unknown> | undefined),
  };

  return {
    HostType: { Excel: 'Excel' },
    ...restOverrides,
    context,
  } as unknown as typeof Office;
}
