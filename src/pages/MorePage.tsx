import { useNavigate } from "react-router-dom";
import {
  FileText,
  Receipt,
  Wrench,
  Building2,
  Users,
  List,
  FolderOpen,
  CircleHelp,
  Settings,
  LogOut,
  Download,
  Upload,
  ChevronRight,
  DollarSign,
  type LucideIcon,
} from "lucide-react";

const menuItems: {
  icon: LucideIcon;
  label: string;
  path: string;
  description: string;
  section: "business" | "app";
  meta?: string;
}[] = [
  {
    icon: DollarSign,
    label: "Billing & Payments",
    path: "/more/unpaid",
    description: "View unpaid jobs and invoices",
    section: "business",
    meta: "Review",
  },
  {
    icon: Users,
    label: "Crew",
    path: "/more/settings",
    description: "Invite and manage team members",
    section: "business",
  },
  {
    icon: List,
    label: "Saved Lists",
    path: "/lists",
    description: "Organize route groups",
    section: "business",
  },
  {
    icon: FolderOpen,
    label: "Service Templates",
    path: "/more/services",
    description: "Manage preset services and prices",
    section: "business",
  },
  {
    icon: Settings,
    label: "App Settings",
    path: "/more/settings",
    description: "Notifications, defaults, and preferences",
    section: "app",
  },
  {
    icon: CircleHelp,
    label: "Help & Support",
    path: "/more",
    description: "Guides and troubleshooting",
    section: "app",
  },
  {
    icon: Download,
    label: "Export Data",
    path: "/more/export",
    description: "Download everything as a backup",
    section: "app",
  },
  {
    icon: Upload,
    label: "Import Data",
    path: "/more/import",
    description: "Restore from a backup",
    section: "app",
  },
  {
    icon: FileText,
    label: "Quotes",
    path: "/more/quotes",
    description: "View and manage quotes",
    section: "business",
  },
  {
    icon: Receipt,
    label: "Invoices",
    path: "/more/invoices",
    description: "Track payments and invoices",
    section: "business",
  },
  {
    icon: Wrench,
    label: "Service Items",
    path: "/more/services",
    description: "Manage preset services and prices",
    section: "business",
  },
  {
    icon: Building2,
    label: "Business Profile",
    path: "/more/settings",
    description: "Company name, phone, email, logo",
    section: "business",
  },
];

export default function MorePage() {
  const navigate = useNavigate();
  const businessItems = menuItems.filter((item) => item.section === "business");
  const appItems = menuItems.filter((item) => item.section === "app");

  return (
    <div className="flex flex-col">
      <div className="p-4 pb-2">
        <h1 className="text-2xl font-bold">More</h1>
      </div>

      <div className="pb-4">
        <section className="border-y border-border">
          <p className="px-4 py-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
            Business
          </p>
          <div className="divide-y divide-border border-t border-border">
            {businessItems.map((item) => (
              <MenuRow key={`${item.path}-${item.label}`} item={item} onOpen={navigate} />
            ))}
          </div>
        </section>

        <section className="border-b border-border">
          <p className="px-4 py-2 text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
            App
          </p>
          <div className="divide-y divide-border border-t border-border">
            {appItems.map((item) => (
              <MenuRow key={`${item.path}-${item.label}`} item={item} onOpen={navigate} />
            ))}
          </div>
        </section>

        <div className="px-4 pt-4">
          <button className="w-full rounded-lg border border-border py-3 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

function MenuRow({
  item,
  onOpen,
}: {
  item: (typeof menuItems)[number];
  onOpen: (path: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(item.path)}
      className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-accent/60 transition-colors"
    >
      <item.icon className="h-4 w-4 text-foreground/85 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{item.label}</p>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>
      {item.meta && (
        <span className="text-[10px] font-semibold px-2 py-1 rounded border border-amber-300 bg-amber-100 text-amber-900">
          {item.meta}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}
