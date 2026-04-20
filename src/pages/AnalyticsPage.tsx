import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart3 } from "lucide-react";
import { db } from "@/db";
import { cn } from "@/lib/utils";

type Range = "week" | "biweekly" | "month" | "year" | "season";

const ranges: { key: Range; label: string; days: number }[] = [
  { key: "week", label: "Weekly", days: 7 },
  { key: "biweekly", label: "Biweekly", days: 14 },
  { key: "month", label: "Monthly", days: 30 },
  { key: "year", label: "Yearly", days: 365 },
  { key: "season", label: "Seasonly", days: 90 },
];

function startForRange(range: Range) {
  const now = new Date();
  const days = ranges.find((r) => r.key === range)?.days ?? 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - days + 1);
  return start;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("week");

  const stats = useLiveQuery(async () => {
    const start = startForRange(range);
    const jobs = await db.jobs.where("status").equals("completed").toArray();
    const filtered = jobs.filter(
      (job) => job.completedAt && new Date(job.completedAt) >= start
    );

    let revenue = 0;
    let paid = 0;
    let unpaid = 0;

    for (const job of filtered) {
      const lineItems = await db.jobLineItems.where("jobId").equals(job.id!).toArray();
      revenue += lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
      if (job.paymentStatus === "paid") paid += 1;
      if (job.paymentStatus === "unpaid") unpaid += 1;
    }

    return {
      completed: filtered.length,
      paid,
      unpaid,
      revenue,
    };
  }, [range]);

  const rangeLabel = useMemo(
    () => ranges.find((r) => r.key === range)?.label ?? "Weekly",
    [range]
  );

  return (
    <div className="p-4 pb-24">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {ranges.map((item) => (
          <button
            key={item.key}
            onClick={() => setRange(item.key)}
            className={cn(
              "px-3 py-1.5 rounded-md border text-xs font-semibold whitespace-nowrap",
              range === item.key
                ? "bg-foreground text-background border-foreground"
                : "bg-background border-border"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-border p-3 mb-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-2">
          {rangeLabel} Snapshot
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Completed jobs" value={stats?.completed ?? 0} />
          <Metric label="Revenue" value={`$${(stats?.revenue ?? 0).toFixed(2)}`} />
          <Metric label="Paid jobs" value={stats?.paid ?? 0} />
          <Metric label="Unpaid jobs" value={stats?.unpaid ?? 0} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-xl font-semibold leading-none">{value}</p>
    </div>
  );
}
