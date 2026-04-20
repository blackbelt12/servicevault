import { NavLink } from "react-router-dom";
import { Users, Calendar, MapPin, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/route", label: "Route", icon: MapPin },
  { to: "/schedule", label: "Schedule", icon: Calendar },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/more", label: "More", icon: MoreHorizontal },
] as const;

export default function BottomTabs() {
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[428px] border-t border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-50">
      <div className="flex justify-around items-center h-16 safe-bottom">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "group relative flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute inset-x-6 top-1 h-0.5 rounded-full transition-opacity",
                    isActive ? "bg-primary opacity-100" : "opacity-0"
                  )}
                />
                <Icon className="h-5 w-5 transition-transform group-active:scale-95" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
