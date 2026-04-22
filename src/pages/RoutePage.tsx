import { useState, useEffect, useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Navigation,
  CheckCircle2,
  GripVertical,
  Phone,
  MapPin,
  X,
  Trash2,
  Plus,
  Search,
  MoreVertical,
  Save,
  XCircle,
  Download,
  BookMarked,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { db, todayStr } from "@/db";
import type { Client, Job, Property, RouteStop, JobLineItem, ServiceItem } from "@/db";
import { createJobForProperty } from "@/lib/jobs";
import { cn } from "@/lib/utils";

interface EnrichedStop {
  stop: RouteStop;
  job: Job;
  client: Client;
  property?: Property;
  services: string[];
}

export default function RoutePage() {
  const today = todayStr();

  const stops = useLiveQuery(
    () => db.routeStops.where("routeDate").equals(today).sortBy("position"),
    [today]
  );

  const [enriched, setEnriched] = useState<EnrichedStop[]>([]);
  const [showAddStop, setShowAddStop] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadingRouteId, setLoadingRouteId] = useState<number | null>(null);

  const savedRoutes = useLiveQuery(() => db.savedRoutes.orderBy("name").toArray());

  useEffect(() => {
    if (!stops) return;
    (async () => {
      const result: EnrichedStop[] = [];
      for (const stop of stops) {
        const job = await db.jobs.get(stop.jobId);
        if (!job) continue;
        const client = await db.clients.get(job.clientId);
        if (!client) continue;
        const property = job.propertyId
          ? await db.properties.get(job.propertyId)
          : undefined;
        const lineItems = await db.jobLineItems
          .where("jobId")
          .equals(job.id!)
          .toArray();
        const serviceIds = lineItems.map((li: JobLineItem) => li.serviceItemId);
        const services = await db.serviceItems.bulkGet(serviceIds);
        result.push({
          stop,
          job,
          client,
          property: property ?? undefined,
          services: services
            .filter((s): s is ServiceItem => s !== undefined)
            .map((s) => s.name),
        });
      }
      setEnriched(result);
    })();
  }, [stops]);

  const pending = useMemo(
    () => enriched.filter((e) => e.stop.status !== "completed"),
    [enriched]
  );
  const completed = useMemo(
    () => enriched.filter((e) => e.stop.status === "completed"),
    [enriched]
  );
  const doneCount = completed.length;
  const totalCount = enriched.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = pending.findIndex(
        (e) => e.stop.id!.toString() === active.id
      );
      const newIndex = pending.findIndex(
        (e) => e.stop.id!.toString() === over.id
      );
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(pending, oldIndex, newIndex);
      setEnriched([...reordered, ...completed]);

      for (let i = 0; i < reordered.length; i++) {
        await db.routeStops.update(reordered[i].stop.id!, { position: i });
      }
    },
    [pending, completed]
  );

  const handleQuickLoad = async (route: { id?: number; propertyIds: number[] }) => {
    if (loadingRouteId !== null) return;
    setLoadingRouteId(route.id ?? -1);
    let pos = enriched.length;
    for (const propId of route.propertyIds) {
      const prop = await db.properties.get(propId);
      if (!prop) continue;
      const jobId = await createJobForProperty({
        clientId: prop.clientId,
        propertyId: propId,
        scheduledDate: today,
      });
      await db.routeStops.add({
        routeDate: today,
        jobId,
        position: pos++,
        status: "pending",
      });
    }
    setLoadingRouteId(null);
  };

  const handleQuickComplete = useCallback(async (item: EnrichedStop, paymentStatus: "paid" | "unpaid") => {
    const now = new Date();
    await db.jobs.update(item.job.id!, {
      status: "completed",
      paymentStatus,
      completedAt: now,
      updatedAt: now,
    });
    await db.routeStops.update(item.stop.id!, { status: "completed" });
  }, []);

  const startRoute = () => {
    const first = pending[0];
    if (!first?.property?.address) return;
    const encoded = encodeURIComponent(first.property.address);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    window.open(url, "_blank");
  };

  const clearRoute = async () => {
    const todayStops = await db.routeStops
      .where("routeDate")
      .equals(today)
      .toArray();
    for (const stop of todayStops) {
      const job = await db.jobs.get(stop.jobId);
      if (job && job.status === "scheduled") {
        await db.jobs.delete(job.id!);
        await db.jobLineItems.where("jobId").equals(job.id!).delete();
      }
      await db.routeStops.delete(stop.id!);
    }
    setShowMenu(false);
  };

  if (!stops) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm mt-8">
        Loading...
      </div>
    );
  }

  if (enriched.length === 0) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Today's Route</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLoadModal(true)}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Download className="h-4 w-4" />
              Load
            </button>
            <button
              onClick={() => setShowAddStop(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Stop
            </button>
          </div>
        </div>
        {savedRoutes && savedRoutes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <BookMarked className="h-3.5 w-3.5" />
              Saved Routes
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => handleQuickLoad(route)}
                  disabled={loadingRouteId !== null}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium whitespace-nowrap shrink-0 transition-colors",
                    loadingRouteId === route.id
                      ? "border-primary bg-primary/10 text-primary opacity-70"
                      : "border-border bg-card text-foreground active:bg-accent"
                  )}
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground" />
                  {route.name}
                  <span className="text-xs text-muted-foreground">
                    {route.propertyIds.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 13l4.553 2.276A1 1 0 0021 21.382V10.618a1 1 0 00-1.447-.894L15 12m0 8V12m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No stops on today's route</h3>
          <p className="text-sm text-gray-500 max-w-xs">
            Add stops from your client list, or load a saved route to get going.
          </p>
        </div>
        {showAddStop && (
          <AddStopModal
            today={today}
            onClose={() => setShowAddStop(false)}
          />
        )}
        {showLoadModal && (
          <LoadRouteModal
            today={today}
            existingCount={0}
            onClose={() => setShowLoadModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Today's Route</h1>
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-1 border border-border text-muted-foreground px-2.5 py-2 rounded-lg text-sm font-medium"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 w-44">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowSaveModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 active:bg-accent"
                    >
                      <Save className="h-4 w-4 text-muted-foreground" />
                      Save Route
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowLoadModal(true);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 active:bg-accent"
                    >
                      <Download className="h-4 w-4 text-muted-foreground" />
                      Load Route
                    </button>
                    <button
                      onClick={clearRoute}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 text-destructive active:bg-accent"
                    >
                      <XCircle className="h-4 w-4" />
                      Clear Route
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setShowAddStop(true)}
              className="flex items-center gap-1.5 border border-primary text-primary px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add Stop
            </button>
            {pending.length > 0 && (
              <button
                onClick={startRoute}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
              >
                <Navigation className="h-4 w-4" />
                Start
              </button>
            )}
          </div>
        </div>

        {/* Saved Routes Bar */}
        {savedRoutes && savedRoutes.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <BookMarked className="h-3.5 w-3.5" />
              Add from saved
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {savedRoutes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => handleQuickLoad(route)}
                  disabled={loadingRouteId !== null}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors",
                    loadingRouteId === route.id
                      ? "border-primary bg-primary/10 text-primary opacity-70"
                      : "border-border bg-card text-foreground active:bg-accent"
                  )}
                >
                  <Download className="h-3 w-3 text-muted-foreground" />
                  {route.name}
                  <span className="text-muted-foreground">
                    {route.propertyIds.length}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-3 rounded-md border border-border p-3">
          <div className="flex items-end justify-between mb-2">
            <div className="flex items-end gap-1">
              <span className="text-4xl leading-none font-semibold">{doneCount}</span>
              <span className="text-lg text-muted-foreground mb-0.5">/ {totalCount}</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1 ml-1">
                Stops
              </span>
            </div>
            {doneCount === totalCount ? (
              <span className="text-xs font-semibold text-primary">All done</span>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">Booked</span>
            )}
          </div>
          <div className="h-1.5 bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

      </div>

      <div className="px-4 pb-4 space-y-0 border-y border-border">
        {/* Pending — draggable */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={pending.map((e) => e.stop.id!.toString())}
            strategy={verticalListSortingStrategy}
          >
            {pending.map((item, idx) => (
              <SortableJobCard
                key={item.stop.id}
                item={item}
                index={idx}
                onComplete={(status) => handleQuickComplete(item, status)}
              />
            ))}
          </SortableContext>
        </DndContext>

      </div>

      {showAddStop && (
        <AddStopModal
          today={today}
          onClose={() => setShowAddStop(false)}
        />
      )}

      {showSaveModal && (
        <SaveRouteModal
          enriched={enriched}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {showLoadModal && (
        <LoadRouteModal
          today={today}
          existingCount={enriched.length}
          onClose={() => setShowLoadModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Sortable Job Card ─── */

function SortableJobCard({
  item,
  index,
  onComplete,
}: {
  item: EnrichedStop;
  index: number;
  onComplete: (status: "paid" | "unpaid") => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.stop.id!.toString() });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto" as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card border-b border-border px-2 py-3 flex gap-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none shrink-0 w-7"
      >
        <span className="text-[10px] font-bold text-muted-foreground mb-1">
          {index + 1}
        </span>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.client.name}</p>
        {item.property?.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.property.address}</span>
          </p>
        )}
        {item.client.phone && (
          <a
            href={`tel:${item.client.phone}`}
            className="text-xs text-primary flex items-center gap-1 mt-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3 shrink-0" />
            {item.client.phone}
          </a>
        )}
        {item.services.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {item.services.map((s) => (
              <span
                key={s}
                className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0 self-center flex flex-col gap-1">
        <button
          onClick={() => onComplete("paid")}
          className="flex items-center justify-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
        >
          <CheckCircle2 className="h-3 w-3" />
          Paid
        </button>
        <button
          onClick={() => onComplete("unpaid")}
          className="flex items-center justify-center gap-1 bg-amber-500 text-white px-3 py-1.5 rounded-md text-xs font-semibold"
        >
          Unpaid
        </button>
      </div>
    </div>
  );
}

/* ─── Add Stop Modal ─── */

function AddStopModal({
  today,
  onClose,
}: {
  today: string;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [addedPropertyIds, setAddedPropertyIds] = useState<Set<number>>(new Set());

  const lists = useLiveQuery(() => db.clientLists.orderBy("name").toArray());

  const properties = useLiveQuery(async () => {
    const todaysJobs = await db.jobs.where("scheduledDate").equals(today).toArray();
    const activePropertyIds = new Set(
      todaysJobs
        .map((job) => job.propertyId)
        .filter((id): id is number => typeof id === "number")
    );
    let pool: (Property & { clientName: string; clientPhone?: string })[];

    if (selectedListId) {
      const members = await db.clientListMembers
        .where("listId")
        .equals(selectedListId)
        .toArray();
      const propIds = members.map((m) => m.propertyId);
      const props = (await db.properties.bulkGet(propIds)).filter(
        Boolean
      ) as Property[];
      pool = [];
      for (const p of props) {
        if (activePropertyIds.has(p.id!)) continue;
        const client = await db.clients.get(p.clientId);
        if (!client) continue;
        pool.push({ ...p, clientName: client.name, clientPhone: client.phone });
      }
    } else {
      const allProps = await db.properties.toArray();
      pool = [];
      for (const p of allProps) {
        if (activePropertyIds.has(p.id!)) continue;
        const client = await db.clients.get(p.clientId);
        if (!client) continue;
        pool.push({ ...p, clientName: client.name, clientPhone: client.phone });
      }
    }

    pool.sort((a, b) => a.clientName.localeCompare(b.clientName));

    if (!search) return pool;
    const q = search.toLowerCase();
    return pool.filter(
      (p) =>
        p.clientName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.clientPhone?.includes(q)
    );
  }, [search, selectedListId, today, addedPropertyIds]);

  const handleAdd = async (prop: Property & { clientName: string }) => {
    if (!prop.id || saving) return;
    setSaving(true);

    const jobId = await createJobForProperty({
      clientId: prop.clientId,
      propertyId: prop.id,
      scheduledDate: today,
    });

    await db.routeStops.add({
      routeDate: today,
      jobId,
      position: await db.routeStops.where("routeDate").equals(today).count(),
      status: "pending",
    });

    setAddedPropertyIds((prev) => new Set(prev).add(prop.id!));
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-background flex items-center justify-between p-4 pb-2 border-b border-border z-10">
          <h2 className="text-lg font-bold">Add Stop</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search properties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-1.5 mb-3 overflow-x-auto">
            <button
              onClick={() => setSelectedListId(null)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                selectedListId === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              All
            </button>
            {lists?.map((list) => (
              <button
                key={list.id}
                onClick={() => setSelectedListId(list.id!)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0",
                  selectedListId === list.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                )}
              >
                {list.name}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {properties?.map((prop) => (
              <button
                key={prop.id}
                onClick={() => handleAdd(prop)}
                disabled={saving}
                className="w-full text-left p-3 rounded-xl border border-border flex items-center gap-3 active:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {prop.clientName
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {prop.clientName}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    {prop.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {prop.address}
                  </p>
                </div>
                {addedPropertyIds.has(prop.id!) ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
            {properties?.length === 0 && selectedListId !== null && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No properties in this list.
                </p>
                <button
                  onClick={() => setSelectedListId(null)}
                  className="mt-2 text-primary text-sm font-medium"
                >
                  Show all properties
                </button>
              </div>
            )}
            {properties?.length === 0 && selectedListId === null && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No properties found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Save Route Modal ─── */

function SaveRouteModal({
  enriched,
  onClose,
}: {
  enriched: EnrichedStop[];
  onClose: () => void;
}) {
  const [name, setName] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    const propertyIds = enriched
      .map((e) => e.job.propertyId)
      .filter(Boolean);
    await db.savedRoutes.add({
      name: name.trim(),
      propertyIds,
      createdAt: new Date(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Save Route</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Route Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monday Route, North Side"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Saves {enriched.length} stop{enriched.length !== 1 ? "s" : ""} as a
            reusable route.
          </p>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            Save Route
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Load Route Modal ─── */

function LoadRouteModal({
  today,
  existingCount,
  onClose,
}: {
  today: string;
  existingCount: number;
  onClose: () => void;
}) {
  const savedRoutes = useLiveQuery(() =>
    db.savedRoutes.orderBy("name").toArray()
  );
  const [loading, setLoading] = useState(false);

  const handleLoad = async (route: { propertyIds: number[] }) => {
    if (loading) return;
    setLoading(true);

    let pos = existingCount;

    for (const propId of route.propertyIds) {
      const prop = await db.properties.get(propId);
      if (!prop) continue;

      const jobId = await createJobForProperty({
        clientId: prop.clientId,
        propertyId: propId,
        scheduledDate: today,
      });

      await db.routeStops.add({
        routeDate: today,
        jobId,
        position: pos++,
        status: "pending",
      });
    }

    onClose();
  };

  const handleDelete = async (id: number) => {
    await db.savedRoutes.delete(id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-background flex items-center justify-between p-4 pb-2 border-b border-border z-10">
          <h2 className="text-lg font-bold">Load Saved Route</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-1.5">
          {!savedRoutes || savedRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No saved routes yet.
            </p>
          ) : (
            savedRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border"
              >
                <button
                  onClick={() => handleLoad(route)}
                  disabled={loading}
                  className="flex-1 text-left active:opacity-70 disabled:opacity-50"
                >
                  <p className="text-sm font-medium">{route.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {route.propertyIds.length} stop
                    {route.propertyIds.length !== 1 ? "s" : ""}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(route.id!)}
                  className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

