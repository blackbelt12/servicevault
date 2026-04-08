import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Search, Phone, FolderOpen } from "lucide-react";
import { db } from "@/db";
import { cn } from "@/lib/utils";

const filters = ["All", "Active", "Lead", "Inactive"] as const;
type Filter = (typeof filters)[number];

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const navigate = useNavigate();

  const clients = useLiveQuery(async () => {
    const all = await db.clients.orderBy("name").toArray();
    return all.filter((c) => {
      if (filter !== "All" && c.status !== filter.toLowerCase()) return false;
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.phone?.includes(search) &&
        !c.address?.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [search, filter]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold">Clients</h1>
          <div className="flex gap-2">
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
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {clients === undefined ? (
          <p className="text-center text-muted-foreground mt-8 text-sm">Loading...</p>
        ) : clients.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm">No clients found</p>
            <button
              onClick={() => navigate("/clients/new")}
              className="mt-3 text-primary text-sm font-medium"
            >
              Add your first client
            </button>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => navigate(`/clients/${client.id}`)}
                className="w-full text-left bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 active:bg-accent transition-colors"
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
                    <span className="font-medium text-sm truncate">
                      {client.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                        client.status === "active" &&
                          "bg-green-100 text-green-700",
                        client.status === "lead" &&
                          "bg-blue-100 text-blue-700",
                        client.status === "inactive" &&
                          "bg-gray-100 text-gray-500"
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
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
