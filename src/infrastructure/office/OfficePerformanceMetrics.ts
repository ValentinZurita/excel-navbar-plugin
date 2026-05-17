type GlobalWithProcess = typeof globalThis & {
  __EXCEL_NAVBAR_DEBUG_METRICS__?: boolean;
};

function getNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function areOfficeMetricsEnabled() {
  const globalObject = globalThis as GlobalWithProcess;
  const nodeEnv = typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined;

  return Boolean(
    globalObject.__EXCEL_NAVBAR_DEBUG_METRICS__ || nodeEnv === 'development' || nodeEnv === 'test',
  );
}

export async function measureOfficeOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
): Promise<T> {
  if (!areOfficeMetricsEnabled()) {
    return operation();
  }

  const startedAt = getNow();

  try {
    return await operation();
  } finally {
    const durationMs = getNow() - startedAt;
    if (typeof console !== 'undefined' && typeof console.debug === 'function') {
      console.debug(`[Sheet Navigator] ${operationName} took ${durationMs.toFixed(1)}ms`);
    }
  }
}
