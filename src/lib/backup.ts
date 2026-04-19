// Backup / restore layer for ServiceVault.
//
// Everything that reads or writes a .json backup file goes through this
// module. ExportDataPage and ImportDataPage are intentionally thin UIs on top
// of `buildBackup`, `parseBackup`, and `restoreBackup` so that file-format
// concerns live in exactly one place.

import { db, CURRENT_DB_VERSION } from "@/db";
import type {
  Client,
  ClientList,
  ClientListMember,
  Invoice,
  Job,
  JobLineItem,
  JobPhoto,
  Payment,
  Property,
  RecurringSchedule,
  RouteStop,
  SavedRoute,
  ServiceItem,
  Setting,
} from "@/db";

// ---------------------------------------------------------------------------
// Date field registry
// ---------------------------------------------------------------------------
// JSON has no Date type, so Dates round-trip through ISO strings. Any table
// whose interface has Date-typed fields is listed here so `reviveDates` can
// turn the strings back into real Date objects on import. Keep this in sync
// with the interfaces in src/db/index.ts.
const DATE_FIELDS = {
  clients: ["createdAt", "updatedAt"],
  jobs: ["createdAt", "updatedAt", "completedAt"],
  invoices: ["createdAt", "paidAt"],
  payments: ["paidAt"],
  recurringSchedules: ["createdAt"],
  clientLists: ["createdAt"],
  savedRoutes: ["createdAt"],
} as const;

// ---------------------------------------------------------------------------
// On-disk shape
// ---------------------------------------------------------------------------

// JobPhoto.data is a Blob. JSON.stringify turns Blobs into `{}`, silently
// nuking every photo — so on export we encode them as data URLs and decode
// them back to real Blobs on import.
interface SerializedJobPhoto {
  id?: number;
  jobId: number;
  type: "before" | "after";
  data: string; // "data:<mime>;base64,<payload>"
  createdAt: string;
}

export interface BackupFile {
  exportedAt: string;
  version: number;
  clients: Client[];
  properties: Property[];
  serviceItems: ServiceItem[];
  jobs: Job[];
  jobLineItems: JobLineItem[];
  invoices: Invoice[];
  payments: Payment[];
  recurringSchedules: RecurringSchedule[];
  routeStops: RouteStop[];
  jobPhotos: SerializedJobPhoto[];
  clientLists: ClientList[];
  clientListMembers: ClientListMember[];
  savedRoutes: SavedRoute[];
  settings: Setting[];
}

export interface ParsedBackup {
  file: BackupFile;
  warnings: string[];
}

export type ProgressCallback = (message: string) => void;

// ---------------------------------------------------------------------------
// Blob <-> data URL helpers
// ---------------------------------------------------------------------------

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("Job photo is not a valid data URL");
  }
  const commaIdx = dataUrl.indexOf(",");
  if (commaIdx === -1) throw new Error("Malformed data URL for job photo");

  const meta = dataUrl.slice(5, commaIdx); // strip leading "data:"
  const payload = dataUrl.slice(commaIdx + 1);
  const [mime = "application/octet-stream", ...params] = meta.split(";");
  const isBase64 = params.includes("base64");

  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// ---------------------------------------------------------------------------
// Date revival
// ---------------------------------------------------------------------------

function reviveDates<T>(rows: T[], fields: readonly string[]): T[] {
  if (!fields.length) return rows;
  // Cast each row to an indexable record — the DB interfaces don't declare
  // an index signature, but we mutate in place and return the original typed
  // array so callers still see the strongly-typed rows.
  for (const row of rows as unknown as Record<string, unknown>[]) {
    for (const f of fields) {
      const v = row[f];
      if (typeof v === "string") row[f] = new Date(v);
    }
  }
  return rows;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// Build a backup from the live DB
// ---------------------------------------------------------------------------

export async function buildBackup(
  onProgress?: ProgressCallback,
): Promise<BackupFile> {
  onProgress?.("Reading database...");
  const [
    clients,
    properties,
    serviceItems,
    jobs,
    jobLineItems,
    invoices,
    payments,
    recurringSchedules,
    routeStops,
    photoRows,
    clientLists,
    clientListMembers,
    savedRoutes,
    settings,
  ] = await Promise.all([
    db.clients.toArray(),
    db.properties.toArray(),
    db.serviceItems.toArray(),
    db.jobs.toArray(),
    db.jobLineItems.toArray(),
    db.invoices.toArray(),
    db.payments.toArray(),
    db.recurringSchedules.toArray(),
    db.routeStops.toArray(),
    db.jobPhotos.toArray(),
    db.clientLists.toArray(),
    db.clientListMembers.toArray(),
    db.savedRoutes.toArray(),
    db.settings.toArray(),
  ]);

  // Encode photo blobs sequentially so we can report incremental progress
  // and keep peak memory modest on devices with lots of photos.
  const jobPhotos: SerializedJobPhoto[] = [];
  for (let i = 0; i < photoRows.length; i++) {
    const p = photoRows[i];
    onProgress?.(`Encoding photo ${i + 1} of ${photoRows.length}...`);
    jobPhotos.push({
      id: p.id,
      jobId: p.jobId,
      type: p.type,
      data: await blobToDataUrl(p.data),
      createdAt: p.createdAt.toISOString(),
    });
  }

  onProgress?.("Packaging backup...");
  return {
    exportedAt: new Date().toISOString(),
    version: CURRENT_DB_VERSION,
    clients,
    properties,
    serviceItems,
    jobs,
    jobLineItems,
    invoices,
    payments,
    recurringSchedules,
    routeStops,
    jobPhotos,
    clientLists,
    clientListMembers,
    savedRoutes,
    settings,
  };
}

// ---------------------------------------------------------------------------
// Parse + validate an uploaded backup file
// ---------------------------------------------------------------------------

export function parseBackup(raw: unknown): ParsedBackup {
  if (!isRecord(raw)) {
    throw new Error("Backup file is not a valid JSON object.");
  }

  const version = raw.version;
  if (typeof version !== "number") {
    throw new Error("Backup file is missing a numeric `version`.");
  }
  if (version > CURRENT_DB_VERSION) {
    throw new Error(
      `Backup is from a newer app version (schema v${version}). This app runs v${CURRENT_DB_VERSION}. Update the app before importing.`,
    );
  }

  // `clients` is the only table we treat as mandatory — every real backup
  // has at least this one. Other tables may legitimately be empty or absent
  // (e.g. older backups pre-dating the jobPhotos table).
  if (!Array.isArray(raw.clients)) {
    throw new Error("Backup is missing the required `clients` array.");
  }

  const warnings: string[] = [];
  if (version < CURRENT_DB_VERSION) {
    warnings.push(
      `Backup is from an older schema (v${version}). It will be imported as-is; some fields may be missing.`,
    );
  }

  const grab = <T,>(key: string): T[] => {
    const v = raw[key];
    return Array.isArray(v) ? (v as T[]) : [];
  };

  const file: BackupFile = {
    exportedAt:
      typeof raw.exportedAt === "string"
        ? raw.exportedAt
        : new Date().toISOString(),
    version,
    clients: reviveDates(grab<Client>("clients"), DATE_FIELDS.clients),
    properties: grab<Property>("properties"),
    serviceItems: grab<ServiceItem>("serviceItems"),
    jobs: reviveDates(grab<Job>("jobs"), DATE_FIELDS.jobs),
    jobLineItems: grab<JobLineItem>("jobLineItems"),
    invoices: reviveDates(grab<Invoice>("invoices"), DATE_FIELDS.invoices),
    payments: reviveDates(grab<Payment>("payments"), DATE_FIELDS.payments),
    recurringSchedules: reviveDates(
      grab<RecurringSchedule>("recurringSchedules"),
      DATE_FIELDS.recurringSchedules,
    ),
    routeStops: grab<RouteStop>("routeStops"),
    jobPhotos: grab<SerializedJobPhoto>("jobPhotos"),
    clientLists: reviveDates(
      grab<ClientList>("clientLists"),
      DATE_FIELDS.clientLists,
    ),
    clientListMembers: grab<ClientListMember>("clientListMembers"),
    savedRoutes: reviveDates(
      grab<SavedRoute>("savedRoutes"),
      DATE_FIELDS.savedRoutes,
    ),
    settings: grab<Setting>("settings"),
  };

  if (file.jobPhotos.length === 0 && Array.isArray(raw.jobPhotos) === false) {
    warnings.push(
      "Backup did not include a `jobPhotos` table — no photos will be restored.",
    );
  }

  return { file, warnings };
}

// ---------------------------------------------------------------------------
// Restore a parsed backup into the live DB
// ---------------------------------------------------------------------------

export async function restoreBackup(
  file: BackupFile,
  onProgress?: ProgressCallback,
): Promise<number> {
  // Decode all photo data URLs *before* opening the write transaction. If a
  // photo is corrupt we want to abort early with the DB untouched rather
  // than halfway through the restore.
  onProgress?.(`Decoding ${file.jobPhotos.length} photo(s)...`);
  const photos: JobPhoto[] = file.jobPhotos.map((p) => ({
    id: p.id,
    jobId: p.jobId,
    type: p.type,
    data: dataUrlToBlob(p.data),
    createdAt: new Date(p.createdAt),
  }));

  // Every table we touch must be listed in db.transaction — any write to an
  // un-listed table inside the callback aborts the transaction.
  const tables = [
    db.clients,
    db.properties,
    db.serviceItems,
    db.jobs,
    db.jobLineItems,
    db.invoices,
    db.payments,
    db.recurringSchedules,
    db.routeStops,
    db.jobPhotos,
    db.clientLists,
    db.clientListMembers,
    db.savedRoutes,
    db.settings,
  ];

  let total = 0;

  onProgress?.("Replacing data...");
  // Single atomic transaction: if anything inside throws, Dexie rolls back
  // every clear() and every bulkAdd(). The DB is either fully-imported or
  // exactly the state it was in before — never half-wiped.
  await db.transaction("rw", tables, async () => {
    // Sequential awaits on purpose — see Dexie's guidance on transaction
    // lifetime with native promises; parallelising clears here is not worth
    // the risk of the transaction auto-committing mid-flight.
    for (const t of tables) await t.clear();

    // Relaxed typing — each Dexie table has a different row type, and the
    // schema-level guarantees we care about (correct keys, shape) were
    // validated in parseBackup.
    type AnyTable = { bulkAdd: (rows: unknown[]) => Promise<unknown> };
    const insert = async (table: unknown, rows: unknown[]) => {
      if (!rows.length) return;
      await (table as AnyTable).bulkAdd(rows);
      total += rows.length;
    };

    await insert(db.clients, file.clients);
    await insert(db.properties, file.properties);
    await insert(db.serviceItems, file.serviceItems);
    await insert(db.jobs, file.jobs);
    await insert(db.jobLineItems, file.jobLineItems);
    await insert(db.invoices, file.invoices);
    await insert(db.payments, file.payments);
    await insert(db.recurringSchedules, file.recurringSchedules);
    await insert(db.routeStops, file.routeStops);
    await insert(db.jobPhotos, photos);
    await insert(db.clientLists, file.clientLists);
    await insert(db.clientListMembers, file.clientListMembers);
    await insert(db.savedRoutes, file.savedRoutes);
    await insert(db.settings, file.settings);
  });

  return total;
}
