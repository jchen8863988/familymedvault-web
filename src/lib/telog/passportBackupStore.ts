/**
 * TeLog passport backup persistence — Supabase with dev memory fallback.
 */
import { createServiceSupabase } from "@/lib/supabase/admin";

export type PassportBackupEntry = {
  category: string;
  title: string;
  notes?: string;
  occurredAt: string;
  attachmentUri?: string;
  attachmentData?: string;
  attachmentMime?: string;
};

export type PassportAutoSnapshotPayload = {
  updatedAt: string;
  autoRows: Array<{ key: string; title: string; sub: string; chip: string; chipTone: string }>;
  timelineSummary: string;
  stateTimelineEvents: Array<Record<string, unknown>>;
  monthStateDurations: Array<Record<string, unknown>>;
  totalKm: number | null;
  driveCount: number;
};

export type PassportBackupRow = {
  deviceId: string;
  vinSuffix: string;
  entries: PassportBackupEntry[];
  autoSnapshot: PassportAutoSnapshotPayload | null;
  updatedAt: string;
};

export class PassportBackupStorageError extends Error {
  constructor(
    message: string,
    readonly code: "storage_not_configured" | "db_error",
  ) {
    super(message);
    this.name = "PassportBackupStorageError";
  }
}

type MemoryRow = {
  entries: PassportBackupEntry[];
  autoSnapshot: PassportAutoSnapshotPayload | null;
  updatedAt: string;
};

const memoryStore = new Map<string, MemoryRow>();

function backupKey(deviceId: string, vinSuffix: string): string {
  return `${deviceId}:${vinSuffix}`;
}

function useMemoryFallback(): boolean {
  return process.env.TELOG_CLOUD_COLLECT_ALLOW_MEMORY === "1" || process.env.NODE_ENV === "development";
}

function mapDbRow(
  deviceId: string,
  vinSuffix: string,
  row: {
    entries: unknown;
    auto_snapshot: unknown;
    updated_at: string;
  },
): PassportBackupRow {
  return {
    deviceId,
    vinSuffix,
    entries: Array.isArray(row.entries) ? (row.entries as PassportBackupEntry[]) : [],
    autoSnapshot: row.auto_snapshot
      ? (row.auto_snapshot as PassportAutoSnapshotPayload)
      : null,
    updatedAt: row.updated_at,
  };
}

export async function pushPassportBackup(input: {
  deviceId: string;
  vinSuffix: string;
  entries: PassportBackupEntry[];
  autoSnapshot?: PassportAutoSnapshotPayload | null;
}): Promise<void> {
  const key = backupKey(input.deviceId, input.vinSuffix);
  const updatedAt = new Date().toISOString();

  if (useMemoryFallback()) {
    memoryStore.set(key, {
      entries: input.entries,
      autoSnapshot: input.autoSnapshot ?? null,
      updatedAt,
    });
    return;
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    throw new PassportBackupStorageError(
      "Supabase not configured",
      "storage_not_configured",
    );
  }

  const { error } = await supabase.from("telog_passport_backups").upsert({
    device_id: input.deviceId,
    vin_suffix: input.vinSuffix,
    entries: input.entries,
    auto_snapshot: input.autoSnapshot ?? null,
    updated_at: updatedAt,
  });

  if (error) {
    throw new PassportBackupStorageError(error.message, "db_error");
  }
}

export async function pullPassportBackup(
  deviceId: string,
  vinSuffix: string,
): Promise<PassportBackupRow | null> {
  const key = backupKey(deviceId, vinSuffix);

  if (useMemoryFallback()) {
    const row = memoryStore.get(key);
    if (!row) return null;
    return {
      deviceId,
      vinSuffix,
      entries: row.entries,
      autoSnapshot: row.autoSnapshot,
      updatedAt: row.updatedAt,
    };
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    throw new PassportBackupStorageError(
      "Supabase not configured",
      "storage_not_configured",
    );
  }

  const { data, error } = await supabase
    .from("telog_passport_backups")
    .select("entries, auto_snapshot, updated_at")
    .eq("device_id", deviceId)
    .eq("vin_suffix", vinSuffix)
    .maybeSingle();

  if (error) {
    throw new PassportBackupStorageError(error.message, "db_error");
  }
  if (!data) return null;

  return mapDbRow(deviceId, vinSuffix, data as {
    entries: unknown;
    auto_snapshot: unknown;
    updated_at: string;
  });
}

export async function deletePassportBackup(
  deviceId: string,
  vinSuffix: string,
): Promise<void> {
  const key = backupKey(deviceId, vinSuffix);

  if (useMemoryFallback()) {
    memoryStore.delete(key);
    return;
  }

  const supabase = createServiceSupabase();
  if (!supabase) {
    throw new PassportBackupStorageError(
      "Supabase not configured",
      "storage_not_configured",
    );
  }

  const { error } = await supabase
    .from("telog_passport_backups")
    .delete()
    .eq("device_id", deviceId)
    .eq("vin_suffix", vinSuffix);

  if (error) {
    throw new PassportBackupStorageError(error.message, "db_error");
  }
}
