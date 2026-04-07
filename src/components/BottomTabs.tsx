import { NavLink } from "react-router-dom";
import { Users, Calendar, MapPin, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/route", label: "Route", icon: MapPin },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

export default function BottomTabs() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] bg-background border-t border-border z-50">
      <div className="flex justify-around items-center h-16 safe-bottom">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
