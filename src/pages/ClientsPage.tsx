import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Plus,
  Search,
  Phone,
  FolderOpen,
  Home,
  FileText,
  Trash2,
  CheckSquare,
  Square,
  X,
} from "lucide-react";
import { db } from "@/db";
import type { Client } from "@/db";
import { cn } from "@/lib/utils";
import AddToTargetPicker from "@/components/AddToTargetPicker";

const filters = ["All", "Active", "Quote", "Inactive"] as const;
type Filter = (typeof filters)[number];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const navigate = useNavigate();

  const selecting = selectedClientIds.length > 0;

  const clients = useLiveQuery(async () => {
    const all = await db.clients.orderBy("name").toArray();
    return all.filter((c) => {
      if (filter !== "All" && c.status !== filter.toLowerCase()) return false;
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.phone?.includes(search)
      )
        return false;
      return true;
    });
  }, [search, filter]);

  // Get property IDs for selected clients
  const selectedPropertyIds = useLiveQuery(async () => {
    if (selectedClientIds.length === 0) return [];
    const props = await db.properties.toArray();
    return props
      .filter((p) => selectedClientIds.includes(p.clientId))
      .map((p) => p.id!);
  }, [selectedClientIds]) ?? [];

  const toggleSelect = (clientId: number) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleSetQuote = async (clientId: number) => {
    await db.clients.update(clientId, {
      status: "quote",
      updatedAt: new Date(),
    });
  };

  const handleDelete = async (clientId: number) => {
    const props = await db.properties
      .where("clientId")
      .equals(clientId)
      .toArray();
    for (const p of props) {
      await db.clientListMembers.where("propertyId").equals(p.id!).delete();
    }
    await db.properties.where("clientId").equals(clientId).delete();
    const jobs = await db.jobs.where("clientId").equals(clientId).toArray();
    for (const job of jobs) {
      await db.jobLineItems.where("jobId").equals(job.id!).delete();
      await db.routeStops.where("jobId").equals(job.id!).delete();
      await db.jobPhotos.where("jobId").equals(job.id!).delete();
    }
    await db.jobs.where("clientId").equals(clientId).delete();
    await db.clients.delete(clientId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Clients</h1>
          <div className="flex gap-2">
            {selecting ? (
              <>
                <button
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add to...
                </button>
                <button
                  onClick={() => setSelectedClientIds([])}
                  className="flex items-center text-muted-foreground p-2"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                {clients && clients.length > 0 && (
                  <button
                    onClick={() => {
                      if (clients.length > 0) toggleSelect(clients[0].id!);
                    }}
                    className="text-sm text-primary font-medium px-2 py-2"
                  >
                    Select
                  </button>
                )}
                <button
                  onClick={() => navigate("/lists")}
                  className="flex items-center gap-1 border border-primary text-primary px-2.5 py-2 rounded-lg text-sm font-medium"
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate("/clients/new")}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </>
            )}
          </div>
        </div>

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

        <div className="flex gap-1.5">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors",
                filter === f
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground/85 border-border"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {!selecting && (clients?.length ?? 0) > 0 && (
          <button
            onClick={() => navigate("/route")}
            className="mt-3 w-full rounded-lg bg-foreground text-background px-4 py-3 flex items-center justify-between text-left"
          >
            <div>
              <p className="text-sm font-semibold">5 stops remaining today</p>
              <p className="text-xs text-background/70">1 unpaid · tap to review</p>
            </div>
            <span aria-hidden className="text-lg leading-none">›</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {clients === undefined ? (
          <p className="text-center text-muted-foreground mt-8 text-sm">
            Loading...
          </p>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-green-600"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17 20h5v-1a4 4 0 00-4-4h-1M9 20H4v-1a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">No clients yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Add your customers and their properties to get started.
              They'll show up here once added.
            </p>
            <button
              onClick={() => navigate("/clients/new")}
              className="text-primary text-sm font-medium"
            >
              Add your first client
            </button>
          </div>
        ) : (
          <div className="space-y-0 mt-2 border-y border-border">
            {clients.map((client) =>
              selecting ? (
                <button
                  key={client.id}
                  onClick={() => toggleSelect(client.id!)}
                  className={cn(
                    "w-full text-left bg-card border-b border-border last:border-b-0 p-3.5 flex items-center gap-3 transition-colors",
                    selectedClientIds.includes(client.id!) && "bg-primary/5 border-primary/30"
                  )}
                >
                  {selectedClientIds.includes(client.id!) ? (
                    <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                    {client.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {client.name}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                          client.status === "active" &&
                            "bg-green-100 text-green-700",
                          client.status === "quote" &&
                            "bg-blue-100 text-blue-700",
                          client.status === "inactive" &&
                            "bg-gray-100 text-gray-500"
                        )}
                      >
                        {client.status}
                      </span>
                    </div>
                    {client.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                    )}
                  </div>
                </button>
              ) : (
                <SwipeableClientCard
                  key={client.id}
                  client={client}
                  onTap={() => navigate(`/clients/${client.id}`)}
                  onLongPress={() => toggleSelect(client.id!)}
                  onQuote={() => handleSetQuote(client.id!)}
                  onAddProperty={() =>
                    navigate(`/clients/${client.id}/edit`)
                  }
                  onDelete={() => handleDelete(client.id!)}
                />
              )
            )}
            {!selecting && clients.length > 0 && (
              <p className="text-center text-xs text-muted-foreground pt-3">
                Long press to select · Swipe left for actions
              </p>
            )}
          </div>
        )}
      </div>

      {showPicker && selectedPropertyIds.length > 0 && (
        <AddToTargetPicker
          propertyIds={selectedPropertyIds}
          onClose={() => {
            setShowPicker(false);
            setSelectedClientIds([]);
          }}
        />
      )}
    </div>
  );
}

/* ─── Swipeable Client Card ─── */

function SwipeableClientCard({
  client,
  onTap,
  onLongPress,
  onQuote,
  onAddProperty,
  onDelete,
}: {
  client: Client;
  onTap: () => void;
  onLongPress: () => void;
  onQuote: () => void;
  onAddProperty: () => void;
  onDelete: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);
  const isVertical = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const ACTION_WIDTH = 180;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
    isVertical.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null;
      onLongPress();
    }, 500);
  }, [onLongPress]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }

      if (!swiping.current && !isVertical.current) {
        if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
          isVertical.current = true;
          return;
        }
        if (Math.abs(dx) > 5) {
          swiping.current = true;
        }
      }

      if (isVertical.current) return;
      if (!swiping.current) return;

      e.preventDefault();
      const newOffset = Math.max(
        -ACTION_WIDTH,
        Math.min(0, dx + (offset < -10 ? -ACTION_WIDTH : 0))
      );
      setOffset(newOffset);
    },
    [offset]
  );

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!swiping.current && !isVertical.current && Math.abs(offset) < 10) {
      onTap();
      return;
    }
    swiping.current = false;
    isVertical.current = false;
    setOffset(offset < -ACTION_WIDTH / 3 ? -ACTION_WIDTH : 0);
  }, [offset, onTap]);

  const close = () => setOffset(0);

  return (
    <div className="relative overflow-hidden border-b border-border last:border-b-0" ref={cardRef}>
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={() => {
            close();
            onQuote();
          }}
          className="w-[60px] flex flex-col items-center justify-center bg-blue-500 text-white text-[10px] font-medium gap-0.5"
        >
          <FileText className="h-4 w-4" />
          Quote
        </button>
        <button
          onClick={() => {
            close();
            onAddProperty();
          }}
          className="w-[60px] flex flex-col items-center justify-center bg-primary text-white text-[10px] font-medium gap-0.5"
        >
          <Home className="h-4 w-4" />
          Property
        </button>
        <button
          onClick={() => {
            close();
            onDelete();
          }}
          className="w-[60px] flex flex-col items-center justify-center bg-red-500 text-white text-[10px] font-medium gap-0.5"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>

      <div
        className="relative bg-card p-3.5 flex items-center gap-3 transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
          {client.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{client.name}</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                client.status === "active" && "bg-green-100 text-green-700",
                client.status === "quote" && "bg-blue-100 text-blue-700",
                client.status === "inactive" && "bg-gray-100 text-gray-500"
              )}
            >
              {client.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {client.phone && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {client.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
