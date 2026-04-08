import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  X,
  Pencil,
} from "lucide-react";
import { db } from "@/db";
import type { Client } from "@/db";

export default function ListDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const listId = Number(id);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(false);

  const list = useLiveQuery(() => db.clientLists.get(listId), [listId]);

  const members = useLiveQuery(async () => {
    const memberships = await db.clientListMembers
      .where("listId")
      .equals(listId)
      .toArray();
    const clients: (Client & { membershipId: number })[] = [];
    for (const m of memberships) {
      const client = await db.clients.get(m.clientId);
      if (client) clients.push({ ...client, membershipId: m.id! });
    }
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  }, [listId]);

  const handleRemove = async (membershipId: number) => {
    await db.clientListMembers.delete(membershipId);
  };

  const handleDelete = async () => {
    await db.clientListMembers.where("listId").equals(listId).delete();
    await db.clientLists.delete(listId);
    navigate("/lists");
  };

  if (list === undefined) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm mt-8">
        Loading...
      </div>
    );
  }

  if (list === null) {
    return (
      <div className="p-4 text-center mt-8">
        <p className="text-muted-foreground text-sm">List not found</p>
        <button
          onClick={() => navigate("/lists")}
          className="mt-3 text-primary text-sm font-medium"
        >
          Back to lists
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate("/lists")}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Lists
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-primary font-medium flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      <div className="px-4">
        <h1 className="text-2xl font-bold">{list.name}</h1>
        {list.description && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {list.description}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {!members || members.length === 0 ? (
            <div className="text-center mt-8">
              <p className="text-muted-foreground text-sm">
                No clients in this list.
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-primary text-sm font-medium"
              >
                Add clients
              </button>
            </div>
          ) : (
            members.map((client) => (
              <div
                key={client.membershipId}
                className="bg-card border border-border rounded-xl p-3.5 flex items-center gap-3"
              >
                <button
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="flex-1 min-w-0 text-left active:opacity-70"
                >
                  <p className="font-medium text-sm truncate">{client.name}</p>
                  {client.address && (
                    <p className="text-xs text-muted-foreground truncate">
                      {client.address}
                    </p>
                  )}
                </button>
                <button
                  onClick={() => handleRemove(client.membershipId)}
                  className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {showAdd && (
        <AddToListModal
          listId={listId}
          existingClientIds={members?.map((m) => m.id!) ?? []}
          onClose={() => setShowAdd(false)}
        />
      )}

      {editing && (
        <EditListModal
          list={list}
          onClose={() => setEditing(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function AddToListModal({
  listId,
  existingClientIds,
  onClose,
}: {
  listId: number;
  existingClientIds: number[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");

  const clients = useLiveQuery(async () => {
    const all = await db.clients.orderBy("name").toArray();
    const available = all.filter((c) => !existingClientIds.includes(c.id!));
    if (!search) return available;
    const q = search.toLowerCase();
    return available.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [search, existingClientIds]);

  const handleAdd = async (clientId: number) => {
    await db.clientListMembers.add({ listId, clientId });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
        <div className="sticky top-0 bg-background flex items-center justify-between p-4 pb-2 border-b border-border z-10">
          <h2 className="text-lg font-bold">Add Clients</h2>
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
          <div className="space-y-1.5">
            {clients?.map((client) => (
              <button
                key={client.id}
                onClick={() => handleAdd(client.id!)}
                className="w-full text-left p-3 rounded-xl border border-border flex items-center gap-3 active:bg-accent transition-colors"
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
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  {client.address && (
                    <p className="text-xs text-muted-foreground truncate">
                      {client.address}
                    </p>
                  )}
                </div>
                <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {clients?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No clients available to add
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditListModal({
  list,
  onClose,
  onDelete,
}: {
  list: { id?: number; name: string; description?: string };
  onClose: () => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");

  const handleSave = async () => {
    if (!name.trim() || !list.id) return;
    await db.clientLists.update(list.id, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Edit List</h2>
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
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onDelete}
            className="w-full py-3 rounded-xl font-medium text-sm text-destructive border border-destructive"
          >
            Delete List
          </button>
        </div>
      </div>
    </div>
  );
}
