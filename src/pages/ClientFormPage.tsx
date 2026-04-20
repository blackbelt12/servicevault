import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { db } from "@/db";
import type { Client } from "@/db";
import { cn } from "@/lib/utils";

interface PropertyForm {
  id?: number;
  name: string;
  address: string;
  // Stored as a string so the input can be empty mid-edit. Parsed to a
  // number at save time; blank / non-numeric leaves defaultPrice unset.
  price: string;
}

interface FormData {
  status: Client["status"];
  name: string;
  phone: string;
  email: string;
  notes: string;
  properties: PropertyForm[];
}

const newProperty = (index: number): PropertyForm => ({
  name: `Property ${index}`,
  address: "",
  price: "",
});

// Parse a price input. Returns undefined for blank / invalid so we don't
// persist 0 as "the user explicitly wants a zero-dollar lawn".
const parsePrice = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined && id !== "new";
  const clientId = isEdit ? Number(id) : null;

  const [form, setForm] = useState<FormData>({
    status: "active",
    name: "",
    phone: "",
    email: "",
    notes: "",
    properties: [newProperty(1)],
  });
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (clientId) {
      (async () => {
        const client = await db.clients.get(clientId);
        if (!client) {
          setLoading(false);
          return;
        }
        const props = await db.properties
          .where("clientId")
          .equals(clientId)
          .toArray();
        setForm({
          status: client.status,
          name: client.name,
          phone: client.phone ?? "",
          email: client.email ?? "",
          notes: client.notes ?? "",
          properties:
            props.length > 0
              ? props.map((p) => ({
                  id: p.id,
                  name: p.name,
                  address: p.address,
                  price:
                    p.defaultPrice !== undefined ? String(p.defaultPrice) : "",
                }))
              : [newProperty(1)],
        });
        setLoading(false);
      })();
    }
  }, [clientId]);

  const set = (field: keyof Omit<FormData, "properties">, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setProp = (idx: number, field: keyof PropertyForm, value: string) =>
    setForm((f) => ({
      ...f,
      properties: f.properties.map((p, i) =>
        i === idx ? { ...p, [field]: value } : p
      ),
    }));

  const addProperty = () =>
    setForm((f) => ({
      ...f,
      properties: [...f.properties, newProperty(f.properties.length + 1)],
    }));

  const removeProperty = (idx: number) =>
    setForm((f) => ({
      ...f,
      properties: f.properties.filter((_, i) => i !== idx),
    }));

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const now = new Date();
    const data: Omit<Client, "id"> = {
      status: form.status,
      name: form.name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      notes: form.notes || undefined,
      updatedAt: now,
      createdAt: now,
    };

    if (clientId) {
      await db.clients.update(clientId, { ...data, createdAt: undefined });

      // Update existing properties, add new ones, remove deleted ones
      const existingProps = await db.properties
        .where("clientId")
        .equals(clientId)
        .toArray();
      const keptIds = form.properties
        .map((p) => p.id)
        .filter(Boolean) as number[];
      // Delete removed
      for (const ep of existingProps) {
        if (!keptIds.includes(ep.id!)) {
          await db.properties.delete(ep.id!);
        }
      }
      // Update or add
      for (const p of form.properties) {
        if (p.id) {
          await db.properties.update(p.id, {
            name: p.name.trim() || "Property",
            address: p.address.trim(),
            defaultPrice: parsePrice(p.price),
          });
        } else if (p.address.trim()) {
          await db.properties.add({
            clientId,
            name: p.name.trim() || "Property",
            address: p.address.trim(),
            defaultPrice: parsePrice(p.price),
          });
        }
      }

      navigate(`/clients/${clientId}`);
    } else {
      const newId = (await db.clients.add(data)) as number;
      for (const p of form.properties) {
        if (p.address.trim()) {
          await db.properties.add({
            clientId: newId,
            name: p.name.trim() || "Property",
            address: p.address.trim(),
            defaultPrice: parsePrice(p.price),
          });
        }
      }
      navigate(`/clients/${newId}`);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm mt-8">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!form.name.trim()}
          className="text-sm font-medium text-primary disabled:opacity-40"
        >
          {isEdit ? "Save" : "Add Client"}
        </button>
      </div>

      <div className="px-4 pb-6">
        <h1 className="text-xl font-bold mb-4">
          {isEdit ? "Edit Client" : "New Client"}
        </h1>

        <div className="space-y-4">
          {isEdit && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Status
              </label>
              <div className="flex rounded-lg border border-input overflow-hidden">
                {(["active", "quote", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => set("status", s)}
                    className={cn(
                      "flex-1 py-2.5 text-sm font-medium transition-colors capitalize",
                      form.status === s
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-foreground"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Field
            label="Name *"
            value={form.name}
            onChange={(v) => set("name", v)}
            placeholder="Full name or business name"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => set("phone", v)}
            placeholder="(555) 123-4567"
            type="tel"
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="email@example.com"
            type="email"
          />

          {/* Properties */}
          <div className="border-t border-border pt-4">
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Properties
            </label>
            <div className="space-y-3">
              {form.properties.map((prop, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={prop.name}
                      onChange={(e) => setProp(idx, "name", e.target.value)}
                      className="text-xs font-semibold text-primary bg-transparent focus:outline-none w-full"
                    />
                    {form.properties.length > 1 && (
                      <button
                        onClick={() => removeProperty(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={prop.address}
                    onChange={(e) => setProp(idx, "address", e.target.value)}
                    placeholder="123 Main St, Austin, TX 78701"
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div>
                    <label className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground mb-1 block">
                      Price per visit
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={prop.price}
                        onChange={(e) =>
                          setProp(idx, "price", e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Baseline charge applied to each new job for this lawn. Extras can be added per visit.
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addProperty}
              className="flex items-center gap-1.5 text-sm text-primary font-medium mt-2"
            >
              <Plus className="h-4 w-4" />
              Add new property
            </button>
          </div>

          <div className="border-t border-border pt-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
