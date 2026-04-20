import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, CheckCircle2, MapPin } from "lucide-react";
import { db } from "@/db";
import type { Job, Client, Property } from "@/db";
import { cn } from "@/lib/utils";

interface CompletedRow {
  job: Job;
  client: Client;
  property?: Property;
  services: string[];
  total: number;
}

export default function CompletedJobsPage() {
  const navigate = useNavigate();

  const rows = useLiveQuery(async () => {
    const jobs = await db.jobs
      .where("status")
      .equals("completed")
      .toArray();

    const enriched: CompletedRow[] = [];
    for (const job of jobs) {
      const client = await db.clients.get(job.clientId);
      if (!client) continue;
      const property = job.propertyId
        ? await db.properties.get(job.propertyId)
        : undefined;
      const lineItems = await db.jobLineItems
        .where("jobId")
        .equals(job.id!)
        .toArray();
      const services = lineItems.map((li) => li.description);
      const total = lineItems.reduce(
        (sum, li) => sum + li.quantity * li.unitPrice,
        0,
      );
      enriched.push({ job, client, property, services, total });
    }

    return enriched.sort((a, b) => {
      const aAt = a.job.completedAt?.getTime() ?? 0;
      const bAt = b.job.completedAt?.getTime() ?? 0;
      if (aAt !== bAt) return bAt - aAt;
      return b.job.scheduledDate.localeCompare(a.job.scheduledDate);
    });
  });

  const totalEarnings = rows?.reduce((sum, r) => sum + r.total, 0) ?? 0;
  const paidCount = rows?.filter((r) => r.job.paymentStatus === "paid").length ?? 0;
  const unpaidCount = rows?.filter((r) => r.job.paymentStatus === "unpaid").length ?? 0;

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
        <h1 className="text-2xl font-bold mb-1">Completed Jobs</h1>

        {rows && rows.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Stat label="Jobs" value={rows.length.toString()} />
            <Stat label="Paid" value={paidCount.toString()} />
            <Stat
              label="Earned"
              value={`$${totalEarnings.toFixed(0)}`}
            />
          </div>
        )}

        {!rows ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Loading...
          </p>
        ) : rows.length === 0 ? (
          <div className="text-center mt-12">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">No completed jobs yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Mark a stop as Done from your route to see it here.
            </p>
          </div>
        ) : (
          <>
            {unpaidCount > 0 && (
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2">
                Awaiting Payment
              </p>
            )}
            <div className="space-y-2 mb-4">
              {rows
                .filter((r) => r.job.paymentStatus === "unpaid")
                .map((row) => (
                  <CompletedRowCard
                    key={row.job.id}
                    row={row}
                    onOpen={() => navigate(`/clients/${row.client.id}`)}
                  />
                ))}
            </div>

            {paidCount > 0 && (
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground mb-2">
                Paid
              </p>
            )}
            <div className="space-y-2">
              {rows
                .filter((r) => r.job.paymentStatus !== "unpaid")
                .map((row) => (
                  <CompletedRowCard
                    key={row.job.id}
                    row={row}
                    onOpen={() => navigate(`/clients/${row.client.id}`)}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
}

function CompletedRowCard({
  row,
  onOpen,
}: {
  row: CompletedRow;
  onOpen: () => void;
}) {
  const { job, client, property, services, total } = row;
  const paid = job.paymentStatus === "paid";
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-card border border-border rounded-xl p-3.5 active:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{client.name}</p>
          {property && (
            <p className="text-xs text-primary font-medium truncate">
              {property.name}
            </p>
          )}
          {property?.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{property.address}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {job.scheduledDate}
          </p>
          {services.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {services.join(", ")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {total > 0 && (
            <span className="text-sm font-semibold">${total.toFixed(2)}</span>
          )}
          {job.paymentStatus && (
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                paid
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700",
              )}
            >
              {job.paymentStatus}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
