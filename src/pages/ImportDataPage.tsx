import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, AlertTriangle } from "lucide-react";
import { db } from "@/db";

export default function ImportDataPage() {
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingData = useRef<Record<string, unknown[]> | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.clients || !data.version) {
        setResult({ success: false, message: "Invalid backup file format." });
        return;
      }

      pendingData.current = data;
      setConfirmClear(true);
    } catch {
      setResult({ success: false, message: "Could not read file. Make sure it's a valid JSON backup." });
    }

    if (fileRef.current) fileRef.current.value = "";
  };

  const performImport = async () => {
    if (!pendingData.current) return;
    setConfirmClear(false);
    setImporting(true);

    try {
      const data = pendingData.current;

      // Clear all tables
      await Promise.all([
        db.clients.clear(),
        db.properties.clear(),
        db.serviceItems.clear(),
        db.jobs.clear(),
        db.jobLineItems.clear(),
        db.invoices.clear(),
        db.payments.clear(),
        db.recurringSchedules.clear(),
        db.routeStops.clear(),
        db.clientLists.clear(),
        db.clientListMembers.clear(),
        db.savedRoutes.clear(),
        db.settings.clear(),
      ]);

      // Import each table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tables: [string, any][] = [
        ["clients", db.clients],
        ["properties", db.properties],
        ["serviceItems", db.serviceItems],
        ["jobs", db.jobs],
        ["jobLineItems", db.jobLineItems],
        ["invoices", db.invoices],
        ["payments", db.payments],
        ["recurringSchedules", db.recurringSchedules],
        ["routeStops", db.routeStops],
        ["clientLists", db.clientLists],
        ["clientListMembers", db.clientListMembers],
        ["savedRoutes", db.savedRoutes],
        ["settings", db.settings],
      ];

      let totalRecords = 0;
      for (const [key, table] of tables) {
        const rows = data[key] as unknown[];
        if (rows?.length) {
          await table.bulkAdd(rows);
          totalRecords += rows.length;
        }
      }

      setResult({
        success: true,
        message: `Imported ${totalRecords} records successfully.`,
      });
    } catch (err) {
      setResult({
        success: false,
        message: `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      });
    } finally {
      setImporting(false);
      pendingData.current = null;
    }
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
          Restore from a previously exported backup file. This will replace all
          current data.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {importing ? "Importing..." : "Select Backup File"}
        </button>

        {result && (
          <div
            className={`mt-4 p-3 rounded-xl text-sm ${
              result.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>

      {confirmClear && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmClear(false)}
          />
          <div className="relative bg-background rounded-2xl p-5 mx-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold">Replace All Data?</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This will delete all current data and replace it with the backup.
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClear(false)}
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
