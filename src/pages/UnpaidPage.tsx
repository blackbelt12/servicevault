import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, DollarSign, Check } from "lucide-react";
import { db } from "@/db";
import type { Job, Client, Property } from "@/db";
import { cn } from "@/lib/utils";

interface UnpaidJob {
  job: Job;
  client: Client;
  property?: Property;
  services: string[];
  total: number;
}

export default function UnpaidPage() {
  const navigate = useNavigate();
  const [marking, setMarking] = useState<number | null>(null);

  const unpaidJobs = useLiveQuery(async () => {
    const jobs = await db.jobs
      .where("paymentStatus")
      .equals("unpaid")
      .toArray();

    const enriched: UnpaidJob[] = [];
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
        0
      );
      enriched.push({ job, client, property, services, total });
    }

    return enriched.sort(
      (a, b) =>
        new Date(b.job.scheduledDate).getTime() -
        new Date(a.job.scheduledDate).getTime()
    );
  });

  const handleMarkPaid = async (jobId: number) => {
    setMarking(jobId);
    await db.jobs.update(jobId, { paymentStatus: "paid", updatedAt: new Date() });
    setMarking(null);
  };

  const totalOwed = unpaidJobs?.reduce((sum, j) => sum + j.total, 0) ?? 0;

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
        <h1 className="text-2xl font-bold mb-1">Unpaid</h1>

        {unpaidJobs && unpaidJobs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-700">
              {unpaidJobs.length} job{unpaidJobs.length !== 1 ? "s" : ""} ·{" "}
              ${totalOwed.toFixed(2)} total owed
            </span>
          </div>
        )}

        {!unpaidJobs || unpaidJobs.length === 0 ? (
          <div className="text-center mt-12">
            <div className="h-14 w-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-3">
              <Check className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground mt-1">
              No unpaid jobs.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {unpaidJobs.map(({ job, client, property, services, total }) => (
              <div
                key={job.id}
                className="bg-card border border-border rounded-xl p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => navigate(`/clients/${client.id}`)}
                      className="text-left"
                    >
                      <p className="font-medium text-sm">{client.name}</p>
                      {property && (
                        <p className="text-xs text-primary font-medium">
                          {property.name}
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
                    </button>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {total > 0 && (
                      <span className="text-sm font-semibold">
                        ${total.toFixed(2)}
                      </span>
                    )}
                    <button
                      onClick={() => handleMarkPaid(job.id!)}
                      disabled={marking === job.id}
                      className={cn(
                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        "bg-green-600 text-white disabled:opacity-50"
                      )}
                    >
                      <Check className="h-3 w-3" />
                      {marking === job.id ? "..." : "Mark Paid"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
