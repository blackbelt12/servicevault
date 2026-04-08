import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Plus, Pencil, X } from "lucide-react";
import { db } from "@/db";
import type { ServiceItem } from "@/db";
import { cn } from "@/lib/utils";

export default function ServiceItemsPage() {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [adding, setAdding] = useState(false);

  const services = useLiveQuery(() => db.serviceItems.orderBy("name").toArray());

  const categories = services
    ? [...new Set(services.map((s) => s.category))].sort()
    : [];

  const toggleActive = async (id: number, active: boolean) => {
    await db.serviceItems.update(id, { active: !active });
  };

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
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>
      <div className="px-4 pb-4">
        <h1 className="text-2xl font-bold mb-4">Service Items</h1>
        {categories.map((cat) => (
          <div key={cat} className="mb-4">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              {cat}
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
              {services!
                .filter((s) => s.category === cat)
                .map((svc) => (
                  <div
                    key={svc.id}
                    className="flex items-center gap-3 p-3.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          !svc.active && "text-muted-foreground line-through"
                        )}
                      >
                        {svc.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${svc.defaultPrice} / {svc.unit}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleActive(svc.id!, svc.active)}
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-medium",
                        svc.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {svc.active ? "active" : "inactive"}
                    </button>
                    <button
                      onClick={() => setEditing(svc)}
                      className="text-muted-foreground p-1"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {(editing || adding) && (
        <ServiceModal
          service={editing}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

function ServiceModal({
  service,
  onClose,
}: {
  service: ServiceItem | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [price, setPrice] = useState(String(service?.defaultPrice ?? ""));
  const [unit, setUnit] = useState(service?.unit ?? "visit");
  const [category, setCategory] = useState(service?.category ?? "Lawn Care");

  const handleSave = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      defaultPrice: Number(price) || 0,
      unit: unit.trim() || "visit",
      category: category.trim() || "Other",
      active: true,
    };
    if (service?.id) {
      await db.serviceItems.update(service.id, data);
    } else {
      await db.serviceItems.add(data);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (service?.id) {
      await db.serviceItems.delete(service.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background w-full max-w-[428px] rounded-t-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between p-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">
            {service ? "Edit Service" : "New Service"}
          </h2>
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
              placeholder="e.g. Lawn Mowing"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Price
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Unit
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="visit"
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Lawn Care"
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium text-sm disabled:opacity-50"
          >
            {service ? "Save" : "Add Service"}
          </button>
          {service && (
            <button
              onClick={handleDelete}
              className="w-full py-3 rounded-xl font-medium text-sm text-destructive border border-destructive"
            >
              Delete Service
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
