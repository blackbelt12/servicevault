import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "@/layouts/AppLayout";
import { db, seedServiceItems } from "@/db";

// Lazy-load all page components for route-based code splitting
const ClientsPage = React.lazy(() => import("@/pages/ClientsPage"));
const ClientDetailPage = React.lazy(() => import("@/pages/ClientDetailPage"));
const ClientFormPage = React.lazy(() => import("@/pages/ClientFormPage"));
const SchedulePage = React.lazy(() => import("@/pages/SchedulePage"));
const RoutePage = React.lazy(() => import("@/pages/RoutePage"));
const MorePage = React.lazy(() => import("@/pages/MorePage"));
const QuotesPage = React.lazy(() => import("@/pages/QuotesPage"));
const InvoicesPage = React.lazy(() => import("@/pages/InvoicesPage"));
const ServiceItemsPage = React.lazy(() => import("@/pages/ServiceItemsPage"));
const BusinessSettingsPage = React.lazy(() => import("@/pages/BusinessSettingsPage"));
const ExportDataPage = React.lazy(() => import("@/pages/ExportDataPage"));
const ImportDataPage = React.lazy(() => import("@/pages/ImportDataPage"));
const UnpaidPage = React.lazy(() => import("@/pages/UnpaidPage"));
const ListsPage = React.lazy(() => import("@/pages/ListsPage"));
const ListDetailPage = React.lazy(() => import("@/pages/ListDetailPage"));
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = React.useState(true);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

  React.useEffect(() => {
    db.settings.get("onboardingDone").then((row) => {
      setNeedsOnboarding(!row || row.value !== "true");
      setChecking(false);
    });
  }, []);

  if (checking) return null;
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    seedServiceItems();
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          {/* Onboarding — outside AppLayout (no tab bar) */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* All other routes — wrapped in the guard */}
          <Route
            path="/"
            element={
              <OnboardingGuard>
                <AppLayout />
              </OnboardingGuard>
            }
          >
            <Route index element={<Navigate to="/clients" replace />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/new" element={<ClientFormPage />} />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="clients/:id/edit" element={<ClientFormPage />} />
            <Route path="lists" element={<ListsPage />} />
            <Route path="lists/:id" element={<ListDetailPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="route" element={<RoutePage />} />
            <Route path="more" element={<MorePage />} />
            <Route path="more/unpaid" element={<UnpaidPage />} />
            <Route path="more/quotes" element={<QuotesPage />} />
            <Route path="more/invoices" element={<InvoicesPage />} />
            <Route path="more/services" element={<ServiceItemsPage />} />
            <Route path="more/settings" element={<BusinessSettingsPage />} />
            <Route path="more/export" element={<ExportDataPage />} />
            <Route path="more/import" element={<ImportDataPage />} />
            <Route path="*" element={<Navigate to="/clients" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
