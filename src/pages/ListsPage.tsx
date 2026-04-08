import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Plus, FolderOpen, X } from "lucide-react";
import { db } from "@/db";

export default function ListsPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  const lists = useLiveQuery(async () => {
    const all = await db.clientLists.orderBy("name").toArray();
    const counts: Record<number, number> = {};
    for (const list of all) {
      counts[list.id!] = await db.clientListMembers
        .where("listId")
        .equals(list.id!)
        .count();
    }
    return all.map((l) => ({ ...l, count: counts[l.id!] ?? 0 }));
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate("/clients")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Clients
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          New List
        </button>
      </div>

      <div className="px-4">
        <h1 className="text-2xl font-bold mb-4">Lists</h1>

        {!lists || lists.length === 0 ? (
          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm">No lists yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-primary text-sm font-medium"
            >
              Create your first list
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => navigate(`/lists/${list.id}`)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 flex items-center gap-3 active:bg-accent transition-colors"
              >
                <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{list.name}</p>
                  {list.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {list.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {list.count} client{list.count !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateListModal onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function CreateListModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await db.clientLists.add({
      name: name.trim(),
      description: description.trim() || undefined,
      createdAt: new Date(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">New List</h2>
          <button onClick={onClose} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Name *
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
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            Create List
          </button>
        </div>
      </div>
    </div>
  );
}
