import type { Expense, RecurringTransaction, PartnerNames, HouseholdSettings, Settlement } from '../lib/types';
import { validateImportData } from '../lib/validators';

export interface ExportPayload {
  expenses: Expense[];
  recurring: RecurringTransaction[];
  partnerNames: PartnerNames;
  householdSettings: HouseholdSettings;
  settlements: Settlement[];
}

type RawStorageMap = Record<string, string>;

export const EXPORT_SCHEMA_VERSION = 1;

export function buildExportObject(payload: ExportPayload) {
  const exportDate = new Date().toISOString();
  const raw = {
    'household-expenses': JSON.stringify(payload.expenses),
    'household-recurring': JSON.stringify(payload.recurring),
    'household-partner-names': JSON.stringify(payload.partnerNames),
    'household-settings': JSON.stringify(payload.householdSettings),
    'household-settlements': JSON.stringify(payload.settlements),
  };

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportDate,
    data: payload,
    raw,
  };
}

export function serializeExport(payload: ExportPayload) {
  return JSON.stringify(buildExportObject(payload), null, 2);
}

export async function writeJsonToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  jsonString: string
) {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(jsonString);
  await writable.close();
}

export function downloadJson(filename: string, jsonString: string) {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseImport(text: string) {
  const parsed = JSON.parse(text);
  const validation = validateImportData(parsed);
  if (!validation.isValid) {
    const error = validation.errors[0] || 'Invalid import data';
    throw new Error(error);
  }

  if (!parsed.data && parsed.raw && typeof parsed.raw === 'object') {
    const raw = parsed.raw as RawStorageMap;
    const normalizedData: ExportPayload = {
      expenses: JSON.parse(raw['household-expenses'] || '[]'),
      recurring: JSON.parse(raw['household-recurring'] || '[]'),
      partnerNames: JSON.parse(
        raw['household-partner-names'] || '{"partner1":"Partner 1","partner2":"Partner 2"}'
      ) as PartnerNames,
      householdSettings: JSON.parse(raw['household-settings'] || '{}') as HouseholdSettings,
      settlements: JSON.parse(raw['household-settlements'] || '[]'),
    };

    return { ...parsed, data: normalizedData };
  }

  return parsed;
}
