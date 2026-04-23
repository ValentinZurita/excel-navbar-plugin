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
  async resolveForWorksheets(
    context: Excel.RequestContext,
    worksheets: Excel.Worksheet[],
    supportsWorksheetCustomProperties: boolean,
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

    const propertyRecords = worksheets.map((worksheet) => ({
      worksheet,
      customProperty: worksheet.customProperties.getItemOrNullObject(worksheetStableIdPropertyKey),
    }));

    propertyRecords.forEach(({ customProperty }) => customProperty.load('value,isNullObject'));
    await context.sync();

    let mutated = false;
    const records = propertyRecords.map(({ worksheet, customProperty }) => {
      const existingValue =
        !customProperty.isNullObject && typeof customProperty.value === 'string'
          ? customProperty.value.trim()
          : '';

      if (existingValue.length > 0) {
        return {
          nativeWorksheetId: worksheet.id,
          stableWorksheetId: existingValue,
        };
      }

      const stableWorksheetId = generateStableWorksheetId();
      worksheet.customProperties.add(worksheetStableIdPropertyKey, stableWorksheetId);
      mutated = true;

      return {
        nativeWorksheetId: worksheet.id,
        stableWorksheetId,
      };
    });

    if (mutated) {
      await context.sync();
    }

    return {
      records,
      identityMode: 'plugin-sheet-id',
      mutated,
    };
  }

  async resolveNativeWorksheetId(
    context: Excel.RequestContext,
    worksheets: Excel.Worksheet[],
    stableWorksheetId: string,
    supportsWorksheetCustomProperties: boolean,
  ): Promise<string | null> {
    const { records } = await this.resolveForWorksheets(
      context,
      worksheets,
      supportsWorksheetCustomProperties,
    );
    const match = records.find((record) => record.stableWorksheetId === stableWorksheetId);
    return match?.nativeWorksheetId ?? null;
  }
}
