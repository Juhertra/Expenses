import type { StorageAdapter, StorageResult } from './storage';

type RawMap = Record<string, string>;

type ElectronApi = {
  readDataFile: () => Promise<string | null>;
  writeDataFile: (contents: string) => Promise<string | void>;
};

type StoredPayload = {
  schemaVersion: number;
  exportDate: string;
  raw: RawMap;
  data?: {
    expenses?: unknown;
    recurring?: unknown;
    partnerNames?: unknown;
    householdSettings?: unknown;
    settlements?: unknown;
  };
};

const buildRawFromData = (payload: StoredPayload): RawMap => {
  if (!payload.data) return {};
  return {
    'household-expenses': JSON.stringify(payload.data.expenses ?? []),
    'household-recurring': JSON.stringify(payload.data.recurring ?? []),
    'household-partner-names': JSON.stringify(
      payload.data.partnerNames ?? { partner1: 'Partner 1', partner2: 'Partner 2' }
    ),
    'household-settings': JSON.stringify(payload.data.householdSettings ?? {}),
    'household-settlements': JSON.stringify(payload.data.settlements ?? []),
  };
};

const buildPayload = (raw: RawMap): StoredPayload => ({
  schemaVersion: 1,
  exportDate: new Date().toISOString(),
  raw,
});

export class ElectronStorageAdapter implements StorageAdapter {
  private cache: RawMap | null = null;

  constructor(private api: ElectronApi) {}

  private async loadRaw(): Promise<RawMap> {
    if (this.cache) return this.cache;
    const contents = await this.api.readDataFile();
    if (!contents) {
      this.cache = {};
      return this.cache;
    }
    try {
      const parsed = JSON.parse(contents) as StoredPayload;
      if (parsed.raw && typeof parsed.raw === 'object') {
        this.cache = parsed.raw;
        return this.cache;
      }
      const rawFromData = buildRawFromData(parsed);
      this.cache = rawFromData;
      return this.cache;
    } catch (error) {
      this.cache = {};
      return this.cache;
    }
  }

  private async persist(raw: RawMap): Promise<void> {
    this.cache = raw;
    const payload = buildPayload(raw);
    await this.api.writeDataFile(JSON.stringify(payload, null, 2));
  }

  async get(key: string): Promise<StorageResult | null> {
    const raw = await this.loadRaw();
    if (!(key in raw)) return null;
    return { value: raw[key] };
  }

  async set(key: string, value: string): Promise<void> {
    const raw = await this.loadRaw();
    raw[key] = value;
    await this.persist(raw);
  }
}
