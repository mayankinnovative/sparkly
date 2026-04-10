import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';
import { detectTimezoneFromIP } from '@/lib/timezone';

// Layouts
import { AppLayout } from '@/components/layout/AppLayout';

// Outer pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';

// Inner pages
import { DashboardPage } from '@/pages/app/DashboardPage';
import { LogJobPage } from '@/pages/app/LogJobPage';
import { AllJobsPage } from '@/pages/app/AllJobsPage';
import { RecurringJobsPage } from '@/pages/app/RecurringJobsPage';
import { LogExpensePage } from '@/pages/app/LogExpensePage';
import { CustomersPage } from '@/pages/app/CustomersPage';
import { InvoicesPage } from '@/pages/app/InvoicesPage';
import { PaymentLinksPage } from '@/pages/app/PaymentLinksPage';
import { PayrollPage } from '@/pages/app/PayrollPage';
import { TaxFilingPage } from '@/pages/app/TaxFilingPage';
import { RevenueReportPage } from '@/pages/app/RevenueReportPage';
import { PricingPage } from '@/pages/app/PricingPage';
import { SettingsPage } from '@/pages/app/SettingsPage';
import { SuperAdminPage } from '@/pages/app/SuperAdminPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { accessToken } = useAuthStore();
  if (accessToken) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  // Detect timezone from IP on first load
  useEffect(() => {
    detectTimezoneFromIP().catch(() => {});
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public / Guest routes */}
        <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected app routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="log-job" element={<LogJobPage />} />
          <Route path="jobs" element={<AllJobsPage />} />
          <Route path="recurring-jobs" element={<RecurringJobsPage />} />
          <Route path="log-expense" element={<LogExpensePage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payment-links" element={<PaymentLinksPage />} />
          <Route path="payroll" element={<PayrollPage />} />
          <Route path="tax-filing" element={<TaxFilingPage />} />
          <Route path="revenue-report" element={<RevenueReportPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="super-admin" element={<SuperAdminPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
