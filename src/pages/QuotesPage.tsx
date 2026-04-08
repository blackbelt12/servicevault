import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Phone, Plus, X, CheckSquare, Square } from "lucide-react";
import { db } from "@/db";
import { cn } from "@/lib/utils";
import AddToTargetPicker from "@/components/AddToTargetPicker";

export default function QuotesPage() {
  const navigate = useNavigate();
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const selecting = selectedClientIds.length > 0;

  const toggleSelect = (clientId: number) => {
    setSelectedClientIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId]
    );
  };

  const quotes = useLiveQuery(async () => {
    const clients = await db.clients
      .where("status")
      .equals("quote")
      .toArray();
    const enriched = [];
    for (const client of clients) {
      const props = await db.properties
        .where("clientId")
        .equals(client.id!)
        .toArray();
      enriched.push({ client, properties: props });
    }
    return enriched.sort((a, b) => a.client.name.localeCompare(b.client.name));
  });

  // Get property IDs for selected clients
  const selectedPropertyIds = useLiveQuery(async () => {
    if (selectedClientIds.length === 0) return [];
    const props = await db.properties.toArray();
    return props
      .filter((p) => selectedClientIds.includes(p.clientId))
      .map((p) => p.id!);
  }, [selectedClientIds]) ?? [];

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
        {selecting ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPicker(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add to...
            </button>
            <button
              onClick={() => setSelectedClientIds([])}
              className="text-muted-foreground p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ) : (
          quotes && quotes.length > 0 && (
            <button
              onClick={() => {
                if (quotes.length > 0) toggleSelect(quotes[0].client.id!);
              }}
              className="text-sm text-primary font-medium px-2 py-2"
            >
              Select
            </button>
          )
        )}
      </div>
      <div className="px-4">
        <h1 className="text-2xl font-bold mb-4">Quotes</h1>
        {!quotes || quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-8">
            No clients with quote status.
          </p>
        ) : (
          <div className="space-y-2">
            {quotes.map(({ client, properties }) => (
              <button
                key={client.id}
                onClick={() =>
                  selecting
                    ? toggleSelect(client.id!)
                    : navigate(`/clients/${client.id}`)
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!selecting) toggleSelect(client.id!);
                }}
                className={cn(
                  "w-full text-left bg-card border border-border rounded-xl p-3.5 flex items-center gap-3 active:bg-accent transition-colors",
                  selecting &&
                    selectedClientIds.includes(client.id!) &&
                    "bg-primary/5 border-primary/30"
                )}
              >
                {selecting && (
                  selectedClientIds.includes(client.id!) ? (
                    <CheckSquare className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground shrink-0" />
                  )
                )}
                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {client.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  {client.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </p>
                  )}
                  {properties.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {properties.length} propert
                      {properties.length === 1 ? "y" : "ies"}
                    </p>
                  )}
                </div>
              </button>
            ))}
            {!selecting && quotes.length > 0 && (
              <p className="text-center text-xs text-muted-foreground pt-1">
                Long press to select
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
