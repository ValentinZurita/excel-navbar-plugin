import { persistedSchemaVersion } from './constants';
import type {
  LegacyPersistedNavigationModel,
  NavigationIdentityMode,
  PersistedNavigationModel,
  WorkbookSnapshot,
} from './types';

function mapLegacyWorksheetIds(
  worksheetIds: string[],
  stableWorksheetIdByNativeId: Map<string, string>,
): string[] {
  return worksheetIds
    .map((worksheetId) => stableWorksheetIdByNativeId.get(worksheetId))
    .filter((worksheetId): worksheetId is string => Boolean(worksheetId));
}

export function migrateLegacyPersistedNavigationModel(
  legacyModel: LegacyPersistedNavigationModel,
  snapshot: WorkbookSnapshot,
  identityMode: NavigationIdentityMode,
): PersistedNavigationModel {
  const stableWorksheetIdByNativeId = new Map(
    snapshot.worksheets.map((worksheet) => [
      worksheet.nativeWorksheetId ?? worksheet.worksheetId,
      worksheet.stableWorksheetId ?? worksheet.worksheetId,
    ]),
  );

  return {
    schemaVersion: persistedSchemaVersion,
    identityMode,
    groups: legacyModel.groups.map((group) => ({
      ...group,
      worksheetOrder: mapLegacyWorksheetIds(group.worksheetOrder, stableWorksheetIdByNativeId),
    })),
    sheetSectionOrder: mapLegacyWorksheetIds(legacyModel.sheetSectionOrder, stableWorksheetIdByNativeId),
    pinnedWorksheetOrder: mapLegacyWorksheetIds(
      legacyModel.pinnedWorksheetOrder?.length ? legacyModel.pinnedWorksheetOrder : legacyModel.pinnedWorksheetIds,
      stableWorksheetIdByNativeId,
    ),
    hiddenSectionCollapsed: legacyModel.hiddenSectionCollapsed,
    priorStructuralStateByStableWorksheetId: Object.entries(legacyModel.priorStructuralStateByWorksheetId).reduce<
      Record<string, PersistedNavigationModel['priorStructuralStateByStableWorksheetId'][string]>
    >((accumulator, [worksheetId, structuralState]) => {
      const stableWorksheetId = stableWorksheetIdByNativeId.get(worksheetId);
      if (!stableWorksheetId) {
        return accumulator;
      }

      accumulator[stableWorksheetId] = structuralState;
      return accumulator;
    }, {}),
    updatedAt: Date.now(),
  };
}
