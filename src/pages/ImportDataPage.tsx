import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Upload } from "lucide-react";
import { parseBackup, restoreBackup, type BackupFile } from "@/lib/backup";

type Status = { success: boolean; message: string } | null;

export default function ImportDataPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pending = useRef<BackupFile | null>(null);

  const resetInput = () => {
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    resetInput();
    if (!file) return;

    setStatus(null);
    setWarnings([]);
    pending.current = null;

    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);
      const { file: parsed, warnings } = parseBackup(raw);
      pending.current = parsed;
      setWarnings(warnings);
      setConfirming(true);
    } catch (err) {
      setStatus({
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Could not read backup file. Make sure it's valid JSON.",
      });
    }
  };

  const performImport = async () => {
    if (!pending.current) return;
    setConfirming(false);
    setBusy(true);
    setProgress(null);
    try {
      const count = await restoreBackup(pending.current, setProgress);
      setStatus({
        success: true,
        message: `Imported ${count} records successfully.`,
      });
    } catch (err) {
      // restoreBackup wraps the whole thing in a Dexie transaction, so on
      // failure the DB is back to its pre-import state.
      setStatus({
        success: false,
        message: `Import failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }. Your existing data was not changed.`,
      });
    } finally {
      setBusy(false);
      setProgress(null);
      pending.current = null;
    }
  };

  const cancelImport = () => {
    setConfirming(false);
    pending.current = null;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate("/more")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          More
        </button>
      </div>
      <div className="px-4 pb-4">
        <h1 className="text-2xl font-bold mb-4">Import Data</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Restore from a previously exported backup. This replaces all current
          data — the entire restore runs in a single transaction, so if
          anything fails your existing data is kept.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {busy ? "Importing..." : "Select Backup File"}
        </button>

        {busy && progress && (
          <div className="mt-4 p-3 rounded-xl text-sm bg-muted text-muted-foreground">
            {progress}
          </div>
        )}

        {status && !busy && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm ${
              status.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {status.message}
          </div>
        )}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={cancelImport}
          />
          <div className="relative bg-background rounded-2xl p-5 mx-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold">Replace All Data?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              This will delete all current data and replace it with the
              backup. This action cannot be undone.
            </p>

            {warnings.length > 0 && (
              <ul className="mb-4 space-y-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 list-disc list-inside">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}

            <div className="flex gap-3">
              <button
                onClick={cancelImport}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={performImport}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
