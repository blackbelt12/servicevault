import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { buildBackup } from "@/lib/backup";

// Feature-detect file sharing once at module load. `navigator.canShare` is
// gated on a real File so desktops that technically expose Web Share but
// can't share files (most of them) fall through to the download button.
const CAN_SHARE_FILES: boolean = (() => {
  if (
    typeof navigator === "undefined" ||
    typeof navigator.canShare !== "function"
  ) {
    return false;
  }
  try {
    const probe = new File(["{}"], "probe.json", {
      type: "application/json",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
})();

type Status = { success: boolean; message: string } | null;

export default function ExportDataPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  // Build the backup once and return it as a File object; both the download
  // path and the share path reuse this so encoding only happens one way.
  const buildBackupFile = async (): Promise<File> => {
    const backup = await buildBackup(setProgress);
    const filename = `servicevault-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    const json = JSON.stringify(backup);
    return new File([json], filename, { type: "application/json" });
  };

  const handleDownload = async () => {
    setBusy(true);
    setStatus(null);
    setProgress(null);
    try {
      const file = await buildBackupFile();
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus({ success: true, message: `Saved ${file.name}.` });
    } catch (err) {
      setStatus({
        success: false,
        message: `Export failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    setStatus(null);
    setProgress(null);
    try {
      const file = await buildBackupFile();
      await navigator.share({
        files: [file],
        title: "ServiceVault Backup",
      });
      setStatus({ success: true, message: "Backup shared." });
    } catch (err) {
      // User dismissing the share sheet fires AbortError — don't treat that
      // as a failure.
      if (err instanceof Error && err.name === "AbortError") return;
      setStatus({
        success: false,
        message: `Share failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      });
    } finally {
      setBusy(false);
      setProgress(null);
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
        <h1 className="text-2xl font-bold mb-4">Export Data</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Download a full backup of clients, properties, jobs, invoices,
          photos, routes, lists, and settings as a single JSON file.
        </p>

        <button
          onClick={handleDownload}
          disabled={busy}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {busy ? "Exporting..." : "Download Backup"}
        </button>

        {CAN_SHARE_FILES && (
          <button
            onClick={handleShare}
            disabled={busy}
            className="w-full mt-3 border border-border py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" />
            Share Backup
          </button>
        )}

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
    </div>
  );
}
