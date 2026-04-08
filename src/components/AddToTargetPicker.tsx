import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { FolderOpen, Navigation, X } from "lucide-react";
import { db, todayStr } from "@/db";

/**
 * Shared modal for adding selected properties to a List or today's Route.
 */
export default function AddToTargetPicker({
  propertyIds,
  onClose,
}: {
  propertyIds: number[];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"list" | "route">("list");
  const [newListName, setNewListName] = useState("");
  const [done, setDone] = useState(false);

  const lists = useLiveQuery(() => db.clientLists.orderBy("name").toArray());

  const handleAddToList = async (listId: number) => {
    const existing = await db.clientListMembers
      .where("listId")
      .equals(listId)
      .toArray();
    const existingPropIds = existing.map((m) => m.propertyId);
    for (const propId of propertyIds) {
      if (!existingPropIds.includes(propId)) {
        await db.clientListMembers.add({ listId, propertyId: propId });
      }
    }
    onClose();
  };

  const handleCreateAndAdd = async () => {
    if (!newListName.trim()) return;
    const listId = (await db.clientLists.add({
      name: newListName.trim(),
      createdAt: new Date(),
    })) as number;
    await handleAddToList(listId);
  };

  const handleAddToRoute = async () => {
    const today = todayStr();
    const now = new Date();
    const existingStops = await db.routeStops
      .where("routeDate")
      .equals(today)
      .toArray();
    let position = existingStops.length;

    for (const propId of propertyIds) {
      const prop = await db.properties.get(propId);
      if (!prop) continue;

      // Check if this property already has a job+stop for today
      const existingJob = await db.jobs
        .where("propertyId")
        .equals(propId)
        .and((j) => j.scheduledDate === today)
        .first();
      if (existingJob) {
        const existingStop = await db.routeStops
          .where("jobId")
          .equals(existingJob.id!)
          .and((s) => s.routeDate === today)
          .first();
        if (existingStop) continue; // already on today's route
      }

      const jobId = (await db.jobs.add({
        clientId: prop.clientId,
        propertyId: propId,
        status: "scheduled",
        scheduledDate: today,
        createdAt: now,
        updatedAt: now,
      })) as number;

      await db.routeStops.add({
        routeDate: today,
        jobId,
        position,
        status: "pending",
      });
      position++;
    }
    setDone(true);
    setTimeout(onClose, 800);
  };

  const count = propertyIds.length;
  const label = `${count} ${count === 1 ? "property" : "properties"}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-background flex items-center justify-between p-4 pb-2 border-b border-border z-10">
          <h2 className="text-lg font-bold">Add {label}</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("list")}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              tab === "list"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <FolderOpen className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            List
          </button>
          <button
            onClick={() => setTab("route")}
            className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${
              tab === "route"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground"
            }`}
          >
            <Navigation className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Today's Route
          </button>
        </div>

        <div className="p-4">
          {tab === "list" ? (
            <div className="space-y-1.5">
              {lists?.map((list) => (
                <button
                  key={list.id}
                  onClick={() => handleAddToList(list.id!)}
                  className="w-full text-left p-3 rounded-xl border border-border flex items-center gap-3 active:bg-accent transition-colors"
                >
                  <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {list.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {(!lists || lists.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-3">
                  No lists yet
                </p>
              )}
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Or create a new list
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name..."
                    className="flex-1 px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={!newListName.trim()}
                    className="bg-primary text-primary-foreground px-3 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Add {label} to today's route as new stops.
              </p>
              <button
                onClick={handleAddToRoute}
                disabled={done}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Navigation className="h-4 w-4" />
                {done ? "Added!" : "Add to Today's Route"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
