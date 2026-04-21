import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  StickyNote,
  Calendar,
  FolderOpen,
  Home,
  CheckSquare,
  Square,
  X,
  Plus,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { db } from "@/db";
import type { Job, Property } from "@/db";
import { cn } from "@/lib/utils";
import AddToTargetPicker from "@/components/AddToTargetPicker";

interface ClientJob extends Job {
  total: number;
  propertyName?: string;
}

type JobTab = "all" | "unpaid" | "paid";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientId = Number(id);
  const [selectedProps, setSelectedProps] = useState<number[]>([]);
  const [showListPicker, setShowListPicker] = useState(false);
  const [jobTab, setJobTab] = useState<JobTab>("all");
  const [showLogJob, setShowLogJob] = useState(false);
  const [showAddProperty, setShowAddProperty] = useState(false);

  const selecting = selectedProps.length > 0;

  const toggleProp = (propId: number) => {
    setSelectedProps((prev) =>
      prev.includes(propId)
        ? prev.filter((id) => id !== propId)
        : [...prev, propId]
    );
  };

  const client = useLiveQuery(() => db.clients.get(clientId), [clientId]);

  const properties = useLiveQuery(
    () => db.properties.where("clientId").equals(clientId).toArray(),
    [clientId]
  );

  const clientLists = useLiveQuery(async () => {
    if (!properties) return [];
    const propIds = properties.map((p) => p.id!);
    const memberships = await db.clientListMembers.toArray();
    const relevantMemberships = memberships.filter((m) =>
      propIds.includes(m.propertyId)
    );
    const listIds = [...new Set(relevantMemberships.map((m) => m.listId))];
    const lists = await db.clientLists.bulkGet(listIds);
    return lists.filter(Boolean) as { id?: number; name: string }[];
  }, [properties]);

  const jobs = useLiveQuery(async () => {
    const allJobs = await db.jobs.where("clientId").equals(clientId).toArray();
    const enriched: ClientJob[] = [];
    for (const job of allJobs) {
      const lineItems = await db.jobLineItems.where("jobId").equals(job.id!).toArray();
      const total = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
      const property = job.propertyId ? await db.properties.get(job.propertyId) : undefined;
      enriched.push({ ...job, total, propertyName: property?.name });
    }
    return enriched.sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  }, [clientId]);

  const markPaid = async (jobId: number) => {
    await db.jobs.update(jobId, { paymentStatus: "paid", updatedAt: new Date() });
  };

  if (client === undefined) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm mt-8">
        Loading...
      </div>
    );
  }

  if (client === null) {
    return (
      <div className="p-4 text-center mt-8">
        <p className="text-muted-foreground text-sm">Client not found</p>
        <button
          onClick={() => navigate("/clients")}
          className="mt-3 text-primary text-sm font-medium"
        >
          Back to clients
        </button>
      </div>
    );
  }

  const statusColor =
    client.status === "active"
      ? "bg-green-100 text-green-700"
      : client.status === "quote"
        ? "bg-blue-100 text-blue-700"
        : "bg-gray-100 text-gray-500";

  const completedJobs = (jobs ?? []).filter((j) => j.status === "completed");
  const unpaidJobs = completedJobs.filter((j) => j.paymentStatus === "unpaid");
  const paidJobs = completedJobs.filter((j) => j.paymentStatus === "paid");
  const totalOwed = unpaidJobs.reduce((sum, j) => sum + j.total, 0);

  const tabJobs: ClientJob[] =
    jobTab === "unpaid" ? unpaidJobs :
    jobTab === "paid" ? paidJobs :
    completedJobs;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate("/clients")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={() => navigate(`/clients/${clientId}/edit`)}
          className="flex items-center gap-1.5 text-sm text-primary font-medium"
        >
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </div>

      <div className="px-4 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-base font-semibold">
            {client.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor)}>
              {client.status}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-4">
        {/* Properties */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              Properties
            </h2>
            {selecting ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowListPicker(true)}
                  className="text-xs font-medium text-primary-foreground bg-primary px-2.5 py-1 rounded-lg flex items-center gap-1"
                >
                  <FolderOpen className="h-3 w-3" />
                  Add to List
                </button>
                <button onClick={() => setSelectedProps([])} className="text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {properties && properties.length > 0 && (
                  <button
                    onClick={() => toggleProp(properties[0].id!)}
                    className="text-xs font-medium text-muted-foreground"
                  >
                    Select
                  </button>
                )}
                <button
                  onClick={() => setShowAddProperty(true)}
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Property
                </button>
              </div>
            )}
          </div>
            <div className="space-y-2">
              {(properties ?? []).map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => selecting && toggleProp(prop.id!)}
                  className={cn(
                    "flex items-start gap-2 w-full text-left rounded-lg p-1.5 -mx-1.5 transition-colors",
                    selecting && "active:bg-accent",
                    selecting && selectedProps.includes(prop.id!) && "bg-primary/5"
                  )}
                >
                  {selecting && (
                    selectedProps.includes(prop.id!) ? (
                      <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    ) : (
                      <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    )
                  )}
                  {!selecting && (
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-xs font-medium text-primary">{prop.name}</p>
                    <p className="text-sm text-foreground">{prop.address}</p>
                  </div>
                </button>
              ))}
            </div>
            {!selecting && properties && properties.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">No properties yet.</p>
            )}
          </div>

        {showListPicker && (
          <AddToTargetPicker
            propertyIds={selectedProps}
            onClose={() => {
              setShowListPicker(false);
              setSelectedProps([]);
            }}
          />
        )}

        {clientLists && clientLists.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              Lists
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {clientLists.map((list) => (
                <span
                  key={list.id}
                  className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full"
                >
                  {list.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {(client.phone || client.email) && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Contact Info</h2>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-primary">{client.phone}</span>
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-primary">{client.email}</span>
              </a>
            )}
          </div>
        )}

        {client.notes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Notes
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}

        {/* Job History */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Job History
            </h2>
            <button
              onClick={() => setShowLogJob(true)}
              className="flex items-center gap-1 text-xs font-medium text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Job
            </button>
          </div>

          {/* Stats */}
          {completedJobs.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-secondary p-2.5 text-center">
                <p className="text-lg font-bold">{completedJobs.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Jobs</p>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-center">
                <p className="text-lg font-bold text-amber-700">{unpaidJobs.length}</p>
                <p className="text-[10px] text-amber-600 uppercase tracking-wide">Unpaid</p>
              </div>
              <div className="rounded-lg bg-secondary p-2.5 text-center">
                <p className="text-lg font-bold">${totalOwed.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Owed</p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1.5 mb-3">
            {(["all", "unpaid", "paid"] as JobTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setJobTab(t)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                  jobTab === t
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                {t}
                {t === "unpaid" && unpaidJobs.length > 0 && (
                  <span className="ml-1 bg-amber-500 text-white rounded-full px-1 text-[10px]">
                    {unpaidJobs.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Job list */}
          {!jobs ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : tabJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {jobTab === "unpaid" ? "No unpaid jobs." : jobTab === "paid" ? "No paid jobs yet." : "No completed jobs yet."}
            </p>
          ) : (
            <div className="space-y-2">
              {tabJobs.map((job) => (
                <div
                  key={job.id}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 flex items-center gap-2",
                    job.paymentStatus === "unpaid"
                      ? "border-amber-300 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{job.scheduledDate}</p>
                    {job.propertyName && (
                      <p className="text-xs text-muted-foreground truncate">{job.propertyName}</p>
                    )}
                    {job.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 italic">{job.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {job.total > 0 && (
                      <span className="text-sm font-semibold">${job.total.toFixed(2)}</span>
                    )}
                    {job.paymentStatus === "unpaid" ? (
                      <button
                        onClick={() => markPaid(job.id!)}
                        className="flex items-center gap-1 text-xs font-medium bg-emerald-600 text-white px-2 py-1 rounded-md"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Mark Paid
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <DollarSign className="h-3 w-3" />
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLogJob && properties && (
        <LogJobModal
          clientId={clientId}
          properties={properties}
          onClose={() => setShowLogJob(false)}
        />
      )}

      {showAddProperty && client && (
        <AddPropertyModal
          clientId={clientId}
          clientName={client.name}
          existingCount={properties?.length ?? 0}
          onClose={() => setShowAddProperty(false)}
        />
      )}
    </div>
  );
}

/* ─── Add Property Modal ─── */

function AddPropertyModal({
  clientId,
  clientName,
  existingCount,
  onClose,
}: {
  clientId: number;
  clientName: string;
  existingCount: number;
  onClose: () => void;
}) {
  const defaultName = existingCount === 0
    ? `${clientName}'s Property`
    : `${clientName}'s Property ${existingCount + 1}`;
  const [name, setName] = useState(defaultName);
  const [nameTouched, setNameTouched] = useState(false);
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await db.properties.add({
      clientId,
      name: name.trim(),
      address: address.trim(),
      defaultPrice: parseFloat(price) > 0 ? parseFloat(price) : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Add Property</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Property Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setNameTouched(true); }}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Price per Visit (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-6 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            Add Property
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Log Job Modal ─── */

function LogJobModal({
  clientId,
  properties,
  onClose,
}: {
  clientId: number;
  properties: Property[];
  onClose: () => void;
}) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split("T")[0];

  const [date, setDate] = useState(defaultDate);
  const [propertyId, setPropertyId] = useState<number>(properties[0]?.id ?? 0);
  const [amount, setAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("paid");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!date || !propertyId) return;
    setSaving(true);
    const now = new Date();
    const jobDate = new Date(date + "T12:00:00");

    const jobId = (await db.jobs.add({
      clientId,
      propertyId,
      status: "completed",
      paymentStatus,
      scheduledDate: date,
      completedAt: jobDate,
      notes: notes.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    })) as number;

    const parsedAmount = parseFloat(amount);
    if (parsedAmount > 0) {
      await db.jobLineItems.add({
        jobId,
        serviceItemId: 0,
        description: "Lawn service",
        quantity: 1,
        unitPrice: parsedAmount,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Log Job</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Date *
            </label>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {properties.length > 1 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Property
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.address ? ` — ${p.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Amount (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-6 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Payment Status
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPaymentStatus("paid")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                  paymentStatus === "paid"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "border-border text-foreground"
                )}
              >
                Paid
              </button>
              <button
                onClick={() => setPaymentStatus("unpaid")}
                className={cn(
                  "flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors",
                  paymentStatus === "unpaid"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-border text-foreground"
                )}
              >
                Unpaid
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the job..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={!date || saving}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            Save Job
          </button>
        </div>
      </div>
    </div>
  );
}
