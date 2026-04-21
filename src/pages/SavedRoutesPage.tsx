import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Route, Trash2 } from "lucide-react";
import { db, todayStr } from "@/db";
import { createJobForProperty } from "@/lib/jobs";

export default function SavedRoutesPage() {
  const navigate = useNavigate();
  const savedRoutes = useLiveQuery(() => db.savedRoutes.orderBy("name").toArray());
  const [loading, setLoading] = useState<number | null>(null);

  const handleLoad = async (routeId: number, propertyIds: number[]) => {
    if (loading !== null) return;
    setLoading(routeId);
    const today = todayStr();
    const existingCount = await db.routeStops.where("routeDate").equals(today).count();
    let pos = existingCount;

    for (const propId of propertyIds) {
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

    navigate("/route");
  };

  const handleDelete = async (id: number) => {
    await db.savedRoutes.delete(id);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 p-4 pb-2">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Saved Routes</h1>
      </div>

      <div className="px-4 pb-6">
        {!savedRoutes || savedRoutes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-4">
              <Route className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-base font-semibold mb-1">No saved routes yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add stops to today's route, then use the menu to save it for reuse.
            </p>
            <button
              onClick={() => navigate("/route")}
              className="mt-4 text-sm font-medium text-primary"
            >
              Go to Route
            </button>
          </div>
        ) : (
          <div className="space-y-2 mt-3">
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{route.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {route.propertyIds.length} stop{route.propertyIds.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleLoad(route.id!, route.propertyIds)}
                  disabled={loading !== null}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50"
                >
                  {loading === route.id ? "Loading…" : "Load"}
                </button>
                <button
                  onClick={() => handleDelete(route.id!)}
                  className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
