import { Outlet } from "react-router-dom";
import BottomTabs from "@/components/BottomTabs";

export default function AppLayout() {
  return (
    <div className="mx-auto w-full max-w-[428px] min-h-svh bg-background relative">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}
