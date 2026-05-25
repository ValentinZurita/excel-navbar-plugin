let officeReadyPromise: Promise<void> | null = null;

export function isOfficeHostReady() {
  if (typeof Office === 'undefined' || typeof Excel === 'undefined') {
    return false;
  }

  const host = Office.context?.host;
  const excelHost = Office.HostType?.Excel ?? 'Excel';
  return host === excelHost;
}

export function waitForOfficeRuntime(): Promise<void> {
  if (typeof Office === 'undefined') {
    return Promise.resolve();
  }

  if (isOfficeHostReady()) {
    return Promise.resolve();
  }

  if (!officeReadyPromise) {
    officeReadyPromise = new Promise((resolve, reject) => {
      Office.onReady((info) => {
        if (info.host === Office.HostType.Excel) {
          resolve();
          return;
        }

        reject(new Error('This add-in requires Excel.'));
      });
    });
  }

  return officeReadyPromise;
}

export function resetOfficeRuntimeGateForTests() {
  officeReadyPromise = null;
}
