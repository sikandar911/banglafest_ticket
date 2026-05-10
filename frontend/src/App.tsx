import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { Layout } from './components/layout/Layout';

// Public pages
import { HomePage } from './pages/HomePage';
import { EventDetailPage } from './pages/EventDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { CheckoutSuccessPage } from './pages/CheckoutSuccessPage';
import { CheckoutCancelPage } from './pages/CheckoutCancelPage';

// Dashboard pages
import { DashboardLayout } from './pages/dashboard/DashboardLayout';
import { ProfilePage } from './pages/dashboard/ProfilePage';
import { MyTicketsPage } from './pages/dashboard/MyTicketsPage';
import { MyOrdersPage } from './pages/dashboard/MyOrdersPage';

// Admin pages
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminRevenuePage } from './pages/admin/AdminRevenuePage';

// Scanner
import { ScannerPage } from './pages/scanner/ScannerPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Layout wrapper */}
            <Route element={<Layout />}>
              {/* Public routes */}
              <Route index element={<HomePage />} />
              <Route path="events/:id" element={<EventDetailPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="checkout/success" element={<CheckoutSuccessPage />} />
              <Route path="checkout/cancel" element={<CheckoutCancelPage />} />

              {/* User dashboard – requires login */}
              <Route element={<ProtectedRoute />}>
                <Route path="dashboard" element={<DashboardLayout />}>
                  <Route index element={<ProfilePage />} />
                  <Route path="tickets" element={<MyTicketsPage />} />
                  <Route path="orders" element={<MyOrdersPage />} />
                </Route>
              </Route>

              {/* Admin – requires ADMIN role */}
              <Route element={<ProtectedRoute roles={['ADMIN']} />}>
                <Route path="admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="events" element={<AdminEventsPage />} />
                  <Route path="orders" element={<AdminOrdersPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="revenue" element={<AdminRevenuePage />} />
                </Route>
              </Route>

              {/* Scanner – requires SCANNER or ADMIN role */}
              <Route element={<ProtectedRoute roles={['SCANNER', 'ADMIN']} />}>
                <Route path="scanner" element={<ScannerPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f9fafb',
              border: '1px solid #374151',
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
