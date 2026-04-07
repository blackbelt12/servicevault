import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/layouts/AppLayout";
import ClientsPage from "@/pages/ClientsPage";
import SchedulePage from "@/pages/SchedulePage";
import RoutePage from "@/pages/RoutePage";
import MorePage from "@/pages/MorePage";
import { seedServiceItems } from "@/db";

export default function App() {
  useEffect(() => {
    seedServiceItems();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/clients" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
