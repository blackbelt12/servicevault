import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/db";

export default function ExportDataPage() {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        version: 7,
        clients: await db.clients.toArray(),
        properties: await db.properties.toArray(),
        serviceItems: await db.serviceItems.toArray(),
        jobs: await db.jobs.toArray(),
        jobLineItems: await db.jobLineItems.toArray(),
        invoices: await db.invoices.toArray(),
        payments: await db.payments.toArray(),
        recurringSchedules: await db.recurringSchedules.toArray(),
        routeStops: await db.routeStops.toArray(),
        clientLists: await db.clientLists.toArray(),
        clientListMembers: await db.clientListMembers.toArray(),
        savedRoutes: await db.savedRoutes.toArray(),
        settings: await db.settings.toArray(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `servicevault-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
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
          Download all your data as a JSON file. This includes clients,
          properties, jobs, service items, routes, lists, and settings.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Download Backup"}
        </button>
      </div>
    </div>
  );
}
