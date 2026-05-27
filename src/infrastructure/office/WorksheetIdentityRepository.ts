import { worksheetStableIdPropertyKey } from '../../domain/navigation/constants';
import type { NavigationIdentityMode } from '../../domain/navigation/types';

function generateStableWorksheetId() {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  return `sheetnav-${randomId}`;
}

interface WorksheetIdentityRecord {
  nativeWorksheetId: string;
  stableWorksheetId: string;
}

export class WorksheetIdentityRepository {
  private readonly stableWorksheetIdByNativeId = new Map<string, string>();

  private readonly nativeWorksheetIdByStableId = new Map<string, string>();

  private cacheScopeKey: string | null = null;

  private useCacheScope(cacheScopeKey: string) {
    if (this.cacheScopeKey === cacheScopeKey) {
      return;
    }

    this.stableWorksheetIdByNativeId.clear();
    this.nativeWorksheetIdByStableId.clear();
    this.cacheScopeKey = cacheScopeKey;
  }

  private remember(record: WorksheetIdentityRecord) {
    this.stableWorksheetIdByNativeId.set(record.nativeWorksheetId, record.stableWorksheetId);
    this.nativeWorksheetIdByStableId.set(record.stableWorksheetId, record.nativeWorksheetId);
  }

  private forgetMissingNativeIds(currentNativeWorksheetIds: Set<string>) {
    for (const [nativeWorksheetId, stableWorksheetId] of this.stableWorksheetIdByNativeId) {
      if (currentNativeWorksheetIds.has(nativeWorksheetId)) {
        continue;
      }

      this.stableWorksheetIdByNativeId.delete(nativeWorksheetId);
      this.nativeWorksheetIdByStableId.delete(stableWorksheetId);
    }
  }

  async resolveForWorksheets(
    context: Excel.RequestContext,
    worksheets: Excel.Worksheet[],
    supportsWorksheetCustomProperties: boolean,
    cacheScopeKey = 'default',
  ): Promise<{
    records: WorksheetIdentityRecord[];
    identityMode: NavigationIdentityMode;
    mutated: boolean;
  }> {
    if (!supportsWorksheetCustomProperties) {
      return {
        records: worksheets.map((worksheet) => ({
          nativeWorksheetId: worksheet.id,
          stableWorksheetId: worksheet.id,
        })),
        identityMode: 'native-id',
        mutated: false,
      };
    }

    this.useCacheScope(cacheScopeKey);

    const currentNativeWorksheetIds = new Set(worksheets.map((worksheet) => worksheet.id));
    this.forgetMissingNativeIds(currentNativeWorksheetIds);

    const records: WorksheetIdentityRecord[] = [];
    const unresolvedWorksheets: Excel.Worksheet[] = [];

    for (const worksheet of worksheets) {
      const cachedStableWorksheetId = this.stableWorksheetIdByNativeId.get(worksheet.id);
      if (cachedStableWorksheetId) {
        records.push({
          nativeWorksheetId: worksheet.id,
          stableWorksheetId: cachedStableWorksheetId,
        });
        continue;
      }

      unresolvedWorksheets.push(worksheet);
    }

    if (unresolvedWorksheets.length === 0) {
      return {
        records,
        identityMode: 'plugin-sheet-id',
        mutated: false,
      };
    }

    const propertyRecords = unresolvedWorksheets.map((worksheet) => ({
      worksheet,
      customProperty: worksheet.customProperties.getItemOrNullObject(worksheetStableIdPropertyKey),
    }));

    propertyRecords.forEach(({ customProperty }) => customProperty.load('value,isNullObject'));
    await context.sync();

    let mutated = false;
    for (const { worksheet, customProperty } of propertyRecords) {
      const existingValue =
        !customProperty.isNullObject && typeof customProperty.value === 'string'
          ? customProperty.value.trim()
          : '';

      if (existingValue.length > 0) {
        const record = {
          nativeWorksheetId: worksheet.id,
          stableWorksheetId: existingValue,
        };
        this.remember(record);
        records.push(record);
        continue;
      }

      const stableWorksheetId = generateStableWorksheetId();
      worksheet.customProperties.add(worksheetStableIdPropertyKey, stableWorksheetId);
      mutated = true;

      const record = {
        nativeWorksheetId: worksheet.id,
        stableWorksheetId,
      };
      this.remember(record);
      records.push(record);
    }

    if (mutated) {
      await context.sync();
    }

    return {
      records,
      identityMode: 'plugin-sheet-id',
      mutated,
    };
  }

  /**
   * Returns the cached native id for a stable worksheet id without performing
   * any Office.js round-trip. Useful for fast-path operations that already
   * know which worksheet to target (e.g. activate, rename) when the cache was
   * primed by a prior workbook snapshot.
   */
  peekCachedNativeWorksheetId(stableWorksheetId: string): string | null {
    return this.nativeWorksheetIdByStableId.get(stableWorksheetId) ?? null;
  }

  /**
   * Returns the cached stable id for a given native worksheet id without any
   * Office.js round-trip. Used when Excel reports a native id (e.g. the active
   * worksheet) and we need to map it back to our stable identity.
   */
  peekStableWorksheetId(nativeWorksheetId: string): string | null {
    return this.stableWorksheetIdByNativeId.get(nativeWorksheetId) ?? null;
  }

  async resolveNativeWorksheetId(
    context: Excel.RequestContext,
    worksheets: Excel.Worksheet[],
    stableWorksheetId: string,
    supportsWorksheetCustomProperties: boolean,
    cacheScopeKey = 'default',
  ): Promise<string | null> {
    this.useCacheScope(cacheScopeKey);

    const cachedNativeWorksheetId = this.nativeWorksheetIdByStableId.get(stableWorksheetId);
    if (
      cachedNativeWorksheetId &&
      worksheets.some((worksheet) => worksheet.id === cachedNativeWorksheetId)
    ) {
      return cachedNativeWorksheetId;
    }

    const { records } = await this.resolveForWorksheets(
      context,
      worksheets,
      supportsWorksheetCustomProperties,
      cacheScopeKey,
    );
    const match = records.find((record) => record.stableWorksheetId === stableWorksheetId);
    return match?.nativeWorksheetId ?? null;
  }
}
