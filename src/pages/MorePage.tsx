import { useNavigate } from "react-router-dom";
import {
  FileText,
  Receipt,
  Wrench,
  Building2,
  Download,
  Upload,
  ChevronRight,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

const menuItems: { icon: LucideIcon; label: string; path: string; description: string }[] = [
  {
    icon: DollarSign,
    label: "Unpaid",
    path: "/more/unpaid",
    description: "Jobs waiting on payment",
  },
  {
    icon: FileText,
    label: "Quotes",
    path: "/more/quotes",
    description: "View and manage quotes",
  },
  {
    icon: Receipt,
    label: "Invoices",
    path: "/more/invoices",
    description: "Track payments and invoices",
  },
  {
    icon: Wrench,
    label: "Service Items",
    path: "/more/services",
    description: "Manage preset services and prices",
  },
  {
    icon: Building2,
    label: "Business Settings",
    path: "/more/settings",
    description: "Company name, phone, email, logo",
  },
  {
    icon: Download,
    label: "Export Data",
    path: "/more/export",
    description: "Download everything as a backup",
  },
  {
    icon: Upload,
    label: "Import Data",
    path: "/more/import",
    description: "Restore from a backup",
  },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-2">
        <h1 className="text-2xl font-bold">More</h1>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 p-4 text-left active:bg-accent transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <item.icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
