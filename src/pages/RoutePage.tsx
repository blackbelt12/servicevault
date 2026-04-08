import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Navigation,
  CheckCircle2,
  GripVertical,
  Phone,
  MapPin,
  Camera,
  ImagePlus,
  X,
  Trash2,
  Plus,
  Search,
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
import type { Client, Job, RouteStop, JobLineItem, ServiceItem } from "@/db";
import { cn } from "@/lib/utils";

interface EnrichedStop {
  stop: RouteStop;
  job: Job;
  client: Client;
  services: string[];
}

export default function RoutePage() {
  const today = todayStr();

  const stops = useLiveQuery(
    () => db.routeStops.where("routeDate").equals(today).sortBy("position"),
    [today]
  );

  const [enriched, setEnriched] = useState<EnrichedStop[]>([]);
  const [completing, setCompleting] = useState<EnrichedStop | null>(null);
  const [showAddStop, setShowAddStop] = useState(false);

  useEffect(() => {
    if (!stops) return;
    (async () => {
      const result: EnrichedStop[] = [];
      for (const stop of stops) {
        const job = await db.jobs.get(stop.jobId);
        if (!job) continue;
        const client = await db.clients.get(job.clientId);
        if (!client) continue;
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

  const startRoute = () => {
    const first = pending[0];
    if (!first?.client.address) return;
    const encoded = encodeURIComponent(first.client.address);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const url = isIOS
      ? `maps://maps.apple.com/?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
    window.open(url, "_blank");
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
          <button
            onClick={() => setShowAddStop(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Stop
          </button>
        </div>
        <p className="text-muted-foreground text-sm text-center mt-12">
          No stops on today's route yet.
        </p>
        <button
          onClick={() => setShowAddStop(true)}
          className="block mx-auto mt-3 text-primary text-sm font-medium"
        >
          Add your first stop
        </button>
        {showAddStop && (
          <AddStopModal
            today={today}
            existingCount={0}
            onClose={() => setShowAddStop(false)}
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
            <button
              onClick={() => setShowAddStop(true)}
              className="flex items-center gap-1 border border-primary text-primary px-2.5 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
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

        {/* Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">
              {doneCount} of {totalCount} done
            </span>
            {doneCount === totalCount && (
              <span className="text-primary font-medium">All done!</span>
            )}
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{
                width: `${totalCount ? (doneCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2">
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
                onComplete={() => setCompleting(item)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Completed */}
        {completed.length > 0 && (
          <>
            <p className="text-xs font-medium text-muted-foreground pt-2">
              Completed
            </p>
            {completed.map((item) => (
              <CompletedJobCard key={item.stop.id} item={item} />
            ))}
          </>
        )}
      </div>

      {completing && (
        <CompleteModal
          item={completing}
          onClose={() => setCompleting(null)}
        />
      )}

      {showAddStop && (
        <AddStopModal
          today={today}
          existingCount={enriched.length}
          onClose={() => setShowAddStop(false)}
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
  onComplete: () => void;
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
      className="bg-card border border-border rounded-xl p-3.5 flex gap-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"
      >
        <span className="text-xs font-bold text-muted-foreground mb-1">
          {index + 1}
        </span>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{item.client.name}</p>
        {item.client.address && (
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{item.client.address}</span>
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

      <button
        onClick={onComplete}
        className="shrink-0 self-center flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1.5 rounded-lg text-xs font-medium"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Done
      </button>
    </div>
  );
}

/* ─── Completed Job Card ─── */

function CompletedJobCard({ item }: { item: EnrichedStop }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3.5 flex gap-3 opacity-60">
      <div className="flex flex-col items-center justify-center shrink-0">
        <CheckCircle2 className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate line-through">
          {item.client.name}
        </p>
        {item.services.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {item.services.join(", ")}
          </p>
        )}
        {item.job.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 italic">
            {item.job.notes}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Complete Modal ─── */

function CompleteModal({
  item,
  onClose,
}: {
  item: EnrichedStop;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(item.job.notes ?? "");
  const [photos, setPhotos] = useState<
    { type: "before" | "after"; blob: Blob; url: string }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");

  const addPhotos = (files: FileList | null, type: "before" | "after") => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotos((prev) => [...prev, { type, blob: file, url }]);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleDone = async () => {
    setSaving(true);
    const now = new Date();

    await db.jobs.update(item.job.id!, {
      status: "completed",
      completedAt: now,
      notes: notes || undefined,
      updatedAt: now,
    });

    await db.routeStops.update(item.stop.id!, { status: "completed" });

    for (const photo of photos) {
      await db.jobPhotos.add({
        jobId: item.job.id!,
        type: photo.type,
        data: photo.blob,
        createdAt: now,
      });
    }

    photos.forEach((p) => URL.revokeObjectURL(p.url));
    onClose();
  };

  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beforePhotos = photos.filter((p) => p.type === "before");
  const afterPhotos = photos.filter((p) => p.type === "after");

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-background flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Complete Job</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Client info */}
          <div>
            <p className="font-medium">{item.client.name}</p>
            {item.services.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {item.services.join(", ")}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Job Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it go? Any issues?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Photos
            </label>

            <div className="flex gap-2 mb-3">
              <button
                onClick={() => {
                  setPhotoType("before");
                  fileRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground"
              >
                <Camera className="h-4 w-4" />
                Before
              </button>
              <button
                onClick={() => {
                  setPhotoType("after");
                  fileRef.current?.click();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-input text-sm font-medium text-foreground"
              >
                <ImagePlus className="h-4 w-4" />
                After
              </button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files, photoType);
                e.target.value = "";
              }}
            />

            {beforePhotos.length > 0 && (
              <div className="mb-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
                  Before
                </p>
                <PhotoGrid
                  photos={beforePhotos}
                  allPhotos={photos}
                  onRemove={removePhoto}
                />
              </div>
            )}
            {afterPhotos.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">
                  After
                </p>
                <PhotoGrid
                  photos={afterPhotos}
                  allPhotos={photos}
                  onRemove={removePhoto}
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleDone}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Mark Complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Stop Modal ─── */

function AddStopModal({
  today,
  existingCount,
  onClose,
}: {
  today: string;
  existingCount: number;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const lists = useLiveQuery(() => db.clientLists.orderBy("name").toArray());

  const clients = useLiveQuery(async () => {
    let pool: Client[];
    if (selectedListId) {
      const members = await db.clientListMembers
        .where("listId")
        .equals(selectedListId)
        .toArray();
      const ids = members.map((m) => m.clientId);
      pool = (await db.clients.bulkGet(ids)).filter(Boolean) as Client[];
      pool.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      pool = await db.clients.orderBy("name").toArray();
    }
    if (!search) return pool;
    const q = search.toLowerCase();
    return pool.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [search, selectedListId]);

  const handleAdd = async (client: Client) => {
    if (!client.id || saving) return;
    setSaving(true);

    const now = new Date();
    const jobId = (await db.jobs.add({
      clientId: client.id,
      status: "scheduled",
      scheduledDate: today,
      createdAt: now,
      updatedAt: now,
    })) as number;

    await db.routeStops.add({
      routeDate: today,
      jobId,
      position: existingCount,
      status: "pending",
    });

    onClose();
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
              placeholder="Search clients..."
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
            {clients?.map((client) => (
              <button
                key={client.id}
                onClick={() => handleAdd(client)}
                disabled={saving}
                className="w-full text-left p-3 rounded-xl border border-border flex items-center gap-3 active:bg-accent transition-colors disabled:opacity-50"
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {client.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {client.name}
                  </p>
                  {client.address && (
                    <p className="text-xs text-muted-foreground truncate">
                      {client.address}
                    </p>
                  )}
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {clients?.length === 0 && selectedListId !== null && (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No clients in this list.
                </p>
                <button
                  onClick={() => setSelectedListId(null)}
                  className="mt-2 text-primary text-sm font-medium"
                >
                  Show all clients
                </button>
              </div>
            )}
            {clients?.length === 0 && selectedListId === null && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No clients found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhotoGrid({
  photos,
  allPhotos,
  onRemove,
}: {
  photos: { type: "before" | "after"; blob: Blob; url: string }[];
  allPhotos: { type: "before" | "after"; blob: Blob; url: string }[];
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {photos.map((photo) => {
        const globalIdx = allPhotos.indexOf(photo);
        return (
          <div key={globalIdx} className="relative aspect-square rounded-lg overflow-hidden">
            <img
              src={photo.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => onRemove(globalIdx)}
              className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5"
            >
              <Trash2 className="h-3 w-3 text-white" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
