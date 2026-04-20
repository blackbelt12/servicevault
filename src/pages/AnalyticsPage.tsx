import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart3, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { cn } from "@/lib/utils";

type Range = "week" | "biweekly" | "month" | "season" | "year";

const RANGES: { key: Range; label: string }[] = [
  { key: "week", label: "7 Days" },
  { key: "biweekly", label: "14 Days" },
  { key: "month", label: "30 Days" },
  { key: "season", label: "90 Days" },
  { key: "year", label: "Year" },
];

type Bucket = { label: string; revenue: number; jobs: number };

function buildBuckets(range: Range, now: Date): { start: Date; end: Date; label: string }[] {
  const buckets: { start: Date; end: Date; label: string }[] = [];

  if (range === "week" || range === "biweekly") {
    const days = range === "week" ? 7 : 14;
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      // for 14 days show every other label to avoid crowding
      const show = range === "week" || i % 2 === 0;
      const label = show
        ? d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)
        : "";
      buckets.push({ start: d, end, label });
    }
  } else if (range === "month") {
    for (let i = 3; i >= 0; i--) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      buckets.push({ start, end, label: `Wk ${4 - i}` });
    }
  } else {
    // season = 3 months, year = 12 months
    const months = range === "season" ? 3 : 12;
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
      const label = d.toLocaleDateString("en-US", { month: "short" });
      buckets.push({ start, end, label });
    }
  }

  return buckets;
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("month");

  const data = useLiveQuery(async () => {
    const now = new Date();
    const rawBuckets = buildBuckets(range, now);
    const rangeStart = rawBuckets[0].start;

    const allCompleted = await db.jobs.where("status").equals("completed").toArray();
    const jobs = allCompleted.filter(
      (j) => j.completedAt && new Date(j.completedAt) >= rangeStart,
    );

    if (jobs.length === 0) {
      return {
        totalRevenue: 0,
        jobCount: 0,
        paid: 0,
        unpaid: 0,
        avgPerJob: 0,
        chartData: rawBuckets.map((b) => ({ label: b.label, revenue: 0, jobs: 0 })),
        topServices: [] as { name: string; revenue: number; count: number }[],
      };
    }

    const jobIds = jobs.map((j) => j.id!);
    const allLineItems = await db.jobLineItems.where("jobId").anyOf(jobIds).toArray();

    const liByJob = new Map<number, typeof allLineItems>();
    for (const li of allLineItems) {
      if (!liByJob.has(li.jobId)) liByJob.set(li.jobId, []);
      liByJob.get(li.jobId)!.push(li);
    }

    let totalRevenue = 0;
    let paid = 0;
    let unpaid = 0;

    for (const job of jobs) {
      const lis = liByJob.get(job.id!) ?? [];
      totalRevenue += lis.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
      if (job.paymentStatus === "paid") paid++;
      else unpaid++;
    }

    const chartData: Bucket[] = rawBuckets.map((b) => {
      const bucketJobs = jobs.filter((j) => {
        const d = new Date(j.completedAt!);
        return d >= b.start && d <= b.end;
      });
      const revenue = bucketJobs.reduce((s, j) => {
        const lis = liByJob.get(j.id!) ?? [];
        return s + lis.reduce((ls, li) => ls + li.quantity * li.unitPrice, 0);
      }, 0);
      return { label: b.label, revenue, jobs: bucketJobs.length };
    });

    // Revenue by service description
    const svcMap = new Map<string, { revenue: number; count: number }>();
    for (const li of allLineItems) {
      const key = li.description || "Other";
      const cur = svcMap.get(key) ?? { revenue: 0, count: 0 };
      cur.revenue += li.quantity * li.unitPrice;
      cur.count += li.quantity;
      svcMap.set(key, cur);
    }
    const topServices = [...svcMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    return {
      totalRevenue,
      jobCount: jobs.length,
      paid,
      unpaid,
      avgPerJob: jobs.length ? totalRevenue / jobs.length : 0,
      chartData,
      topServices,
    };
  }, [range]);

  const isEmpty = !data || data.jobCount === 0;
  const collectionPct =
    data && data.jobCount > 0 ? Math.round((data.paid / data.jobCount) * 100) : 0;

  return (
    <div className="p-4 pb-24 space-y-4 max-w-[428px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* Range pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
              range === r.key
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Revenue hero */}
      <div className="rounded-2xl bg-primary p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-white/70">Total Revenue</p>
            <p className="text-4xl font-bold mt-0.5 tracking-tight">
              $
              {(data?.totalRevenue ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <TrendingUp className="h-6 w-6 text-white/50 mt-1" />
        </div>
        <p className="text-sm text-white/60 mt-3">
          {data?.jobCount ?? 0} completed {data?.jobCount === 1 ? "job" : "jobs"}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Avg / Job"
          value={`$${(data?.avgPerJob ?? 0).toFixed(0)}`}
        />
        <StatCard label="Paid" value={data?.paid ?? 0} positive />
        <StatCard
          label="Unpaid"
          value={data?.unpaid ?? 0}
          warn={(data?.unpaid ?? 0) > 0}
        />
      </div>

      {/* Collection rate */}
      {!isEmpty && (
        <div className="rounded-xl border border-border p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold">Collection Rate</p>
            <p className="text-sm font-bold text-primary">{collectionPct}%</p>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${collectionPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-muted-foreground">{data?.paid} paid</p>
            <p className="text-xs text-muted-foreground">{data?.unpaid} unpaid</p>
          </div>
        </div>
      )}

      {/* Revenue chart */}
      {data?.chartData && <RevenueChart data={data.chartData} />}

      {/* Top services */}
      {!isEmpty && data?.topServices && data.topServices.length > 0 && (
        <div className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">Top Services</p>
          <div className="space-y-3">
            {data.topServices.map((svc) => (
              <ServiceRow
                key={svc.name}
                name={svc.name}
                revenue={svc.revenue}
                count={svc.count}
                max={data.topServices[0].revenue}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && data && (
        <div className="rounded-xl border border-border p-8 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No completed jobs yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Complete jobs to see your analytics here
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  positive,
  warn,
}: {
  label: string;
  value: string | number;
  positive?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-[11px] text-muted-foreground leading-none mb-1.5">{label}</p>
      <p
        className={cn(
          "text-xl font-bold leading-none",
          positive && "text-primary",
          warn && "text-amber-500",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RevenueChart({ data }: { data: Bucket[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const hasAnyRevenue = data.some((d) => d.revenue > 0);

  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-sm font-semibold mb-4">Revenue Over Time</p>
      <div className="flex items-end gap-1" style={{ height: 96 }}>
        {data.map((bucket, i) => {
          const heightPct = hasAnyRevenue ? (bucket.revenue / max) * 100 : 0;
          const isToday =
            i === data.length - 1 && bucket.jobs > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full">
              <div className="flex-1 w-full flex items-end">
                <div
                  className={cn(
                    "w-full rounded-sm transition-all duration-500",
                    heightPct === 0
                      ? "bg-muted"
                      : isToday
                        ? "bg-primary"
                        : "bg-primary/70",
                  )}
                  style={{ height: heightPct === 0 ? 4 : `${heightPct}%` }}
                />
              </div>
              {bucket.label ? (
                <span className="text-[9px] leading-none text-muted-foreground">
                  {bucket.label}
                </span>
              ) : (
                <span className="text-[9px] leading-none">&nbsp;</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceRow({
  name,
  revenue,
  count,
  max,
}: {
  name: string;
  revenue: number;
  count: number;
  max: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm truncate">{name}</span>
          <span className="text-xs text-muted-foreground shrink-0">×{count}</span>
        </div>
        <span className="text-sm font-semibold ml-2 shrink-0">
          ${revenue.toFixed(0)}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary/80 rounded-full transition-all duration-700"
          style={{ width: `${(revenue / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
