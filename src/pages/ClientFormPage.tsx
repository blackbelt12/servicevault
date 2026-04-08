import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import type { Client } from "@/db";
import { cn } from "@/lib/utils";

type FormData = Omit<Client, "id" | "createdAt" | "updatedAt">;

const emptyForm: FormData = {
  status: "active",
  name: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function ClientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id !== undefined && id !== "new";
  const clientId = isEdit ? Number(id) : null;

  const [form, setForm] = useState<FormData>(emptyForm);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (clientId) {
      db.clients.get(clientId).then((client) => {
        if (client) {
          setForm({
            status: client.status,
            name: client.name,
            phone: client.phone ?? "",
            email: client.email ?? "",
            address: client.address ?? "",
            notes: client.notes ?? "",
          });
        }
        setLoading(false);
      });
    }
  }, [clientId]);

  const set = (field: keyof FormData, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) return;

    const now = new Date();
    const data: Omit<Client, "id"> = {
      ...form,
      name: form.name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      updatedAt: now,
      createdAt: now,
    };

    if (clientId) {
      await db.clients.update(clientId, { ...data, createdAt: undefined });
      navigate(`/clients/${clientId}`);
    } else {
      const newId = await db.clients.add(data);
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
                {(["active", "lead", "inactive"] as const).map((s) => (
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
            value={form.phone ?? ""}
            onChange={(v) => set("phone", v)}
            placeholder="(555) 123-4567"
            type="tel"
          />
          <Field
            label="Email"
            value={form.email ?? ""}
            onChange={(v) => set("email", v)}
            placeholder="email@example.com"
            type="email"
          />
          <Field
            label="Address"
            value={form.address ?? ""}
            onChange={(v) => set("address", v)}
            placeholder="123 Main St, Austin, TX 78701"
          />

          <div className="border-t border-border pt-4">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Notes
            </label>
            <textarea
              value={form.notes ?? ""}
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
