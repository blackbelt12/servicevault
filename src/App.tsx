import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import AppLayout from "@/layouts/AppLayout";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import ClientFormPage from "@/pages/ClientFormPage";
import SchedulePage from "@/pages/SchedulePage";
import RoutePage from "@/pages/RoutePage";
import MorePage from "@/pages/MorePage";
import QuotesPage from "@/pages/QuotesPage";
import InvoicesPage from "@/pages/InvoicesPage";
import ServiceItemsPage from "@/pages/ServiceItemsPage";
import BusinessSettingsPage from "@/pages/BusinessSettingsPage";
import ExportDataPage from "@/pages/ExportDataPage";
import ImportDataPage from "@/pages/ImportDataPage";
import UnpaidPage from "@/pages/UnpaidPage";
import ListsPage from "@/pages/ListsPage";
import ListDetailPage from "@/pages/ListDetailPage";
import { seedServiceItems, seedRouteDemo } from "@/db";

export default function App() {
  useEffect(() => {
    seedServiceItems().then(() => seedRouteDemo());
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/new" element={<ClientFormPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/clients/:id/edit" element={<ClientFormPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/:id" element={<ListDetailPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/route" element={<RoutePage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/more/unpaid" element={<UnpaidPage />} />
          <Route path="/more/quotes" element={<QuotesPage />} />
          <Route path="/more/invoices" element={<InvoicesPage />} />
          <Route path="/more/services" element={<ServiceItemsPage />} />
          <Route path="/more/settings" element={<BusinessSettingsPage />} />
          <Route path="/more/export" element={<ExportDataPage />} />
          <Route path="/more/import" element={<ImportDataPage />} />
          <Route path="*" element={<Navigate to="/clients" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
