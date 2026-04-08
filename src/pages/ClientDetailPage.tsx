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
} from "lucide-react";
import { db } from "@/db";
import type { Job } from "@/db";
import { cn } from "@/lib/utils";
import AddToTargetPicker from "@/components/AddToTargetPicker";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const clientId = Number(id);
  const [selectedProps, setSelectedProps] = useState<number[]>([]);
  const [showListPicker, setShowListPicker] = useState(false);

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

  const jobs = useLiveQuery(
    () =>
      db.jobs
        .where("clientId")
        .equals(clientId)
        .reverse()
        .sortBy("scheduledDate"),
    [clientId]
  );

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
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                statusColor
              )}
            >
              {client.status}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3 pb-4">
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Contact Info
          </h2>
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-3 text-sm"
            >
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-primary">{client.phone}</span>
            </a>
          )}
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="flex items-center gap-3 text-sm"
            >
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-primary">{client.email}</span>
            </a>
          )}
        </div>

        {/* Properties */}
        {properties && properties.length > 0 && (
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
                  <button
                    onClick={() => setSelectedProps([])}
                    className="text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (properties.length > 0) toggleProp(properties[0].id!);
                  }}
                  className="text-xs font-medium text-primary"
                >
                  Select
                </button>
              )}
            </div>
            <div className="space-y-2">
              {properties.map((prop) => (
                <button
                  key={prop.id}
                  onClick={() => selecting && toggleProp(prop.id!)}
                  className={cn(
                    "flex items-start gap-2 w-full text-left rounded-lg p-1.5 -mx-1.5 transition-colors",
                    selecting && "active:bg-accent",
                    selecting &&
                      selectedProps.includes(prop.id!) &&
                      "bg-primary/5"
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
                    <p className="text-xs font-medium text-primary">
                      {prop.name}
                    </p>
                    <p className="text-sm text-foreground">{prop.address}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {client.notes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              Notes
            </h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {client.notes}
            </p>
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Service History
          </h2>
          {!jobs || jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No service history yet.
            </p>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: Job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {job.scheduledDate}
                    </p>
                    {job.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.notes}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                      job.status === "completed" &&
                        "bg-green-100 text-green-700",
                      job.status === "scheduled" &&
                        "bg-blue-100 text-blue-700",
                      job.status === "in_progress" &&
                        "bg-yellow-100 text-yellow-700",
                      job.status === "skipped" &&
                        "bg-gray-100 text-gray-500",
                      job.status === "cancelled" &&
                        "bg-red-100 text-red-600"
                    )}
                  >
                    {job.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

