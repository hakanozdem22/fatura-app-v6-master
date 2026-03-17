import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import EmailRecipientsManagementScreen from './views/EmailRecipientsManagementScreen';
import ManagerApprovalWorkspace from './views/ManagerApprovalWorkspace';
import SystemLogsScreen from './views/SystemLogsScreen';
import StaffInvoiceUploadDashboard from './views/StaffInvoiceUploadDashboard';
import LoginScreen from './views/LoginScreen';
import RegisterScreen from './views/RegisterScreen';
import PendingApprovalScreen from './views/PendingApprovalScreen';
import ApprovedInvoicesScreen from './views/ApprovedInvoicesScreen';
import MyInvoicesScreen from './views/MyInvoicesScreen';
import SettingsScreen from './views/SettingsScreen';
import InvoiceArchiveScreen from './views/InvoiceArchiveScreen';
import RejectedDocumentsScreen from './views/RejectedDocumentsScreen';
import UpdateModal from './components/UpdateModal';
import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, requireRole }: { children: React.ReactNode, requireRole?: string[] }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile?.status === 'pending_approval') {
    return <PendingApprovalScreen />;
  }

  if (requireRole && profile && !requireRole.includes(profile.role)) {
    return <div className="min-h-screen flex items-center justify-center">Bu sayfaya erişim yetkiniz yok.</div>;
  }

  return <>{children}</>;
};

const IndexRoute = () => {
  const { profile } = useAuth();
  const role = (profile?.role as string) || '';
  if (role === 'user' || role === 'fatura sorumlusu' || role === 'fatura_sorumlusu' || role === 'irsaliye' || role === 'fatura_irsaliye') {
    return <Navigate to="/upload" replace />;
  }
  if (role === 'muhasebe' || role === 'satinalma') {
    return <Navigate to="/approved-invoices" replace />;
  }
  if (role === 'manager' || role === 'yonetici') {
    return <Navigate to="/approvals" replace />;
  }
  if (role === 'admin') {
    return <Navigate to="/recipients" replace />;
  }
  return <Navigate to="/recipients" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<IndexRoute />} />
        <Route path="recipients" element={
          <ProtectedRoute requireRole={['admin']}>
            <EmailRecipientsManagementScreen />
          </ProtectedRoute>
        } />
        <Route path="upload" element={
          <ProtectedRoute requireRole={['user', 'fatura sorumlusu', 'fatura_sorumlusu', 'irsaliye', 'fatura_irsaliye']}>
            <StaffInvoiceUploadDashboard />
          </ProtectedRoute>
        } />
        <Route path="approvals" element={
          <ProtectedRoute requireRole={['manager', 'yonetici']}>
            <ManagerApprovalWorkspace />
          </ProtectedRoute>
        } />
        <Route path="approved-invoices" element={
          <ProtectedRoute requireRole={['manager', 'yonetici', 'muhasebe', 'satinalma']}>
            <ApprovedInvoicesScreen />
          </ProtectedRoute>
        } />
        <Route path="invoice-archive" element={
          <ProtectedRoute requireRole={['muhasebe', 'satinalma']}>
            <InvoiceArchiveScreen />
          </ProtectedRoute>
        } />
        <Route path="rejected-documents" element={
          <ProtectedRoute requireRole={['muhasebe', 'satinalma', 'manager', 'yonetici']}>
            <RejectedDocumentsScreen />
          </ProtectedRoute>
        } />
        <Route path="my-invoices" element={
          <ProtectedRoute requireRole={['user', 'fatura sorumlusu', 'fatura_sorumlusu', 'irsaliye', 'fatura_irsaliye']}>
            <MyInvoicesScreen />
          </ProtectedRoute>
        } />
        <Route path="system-logs" element={
          <ProtectedRoute requireRole={['admin', 'manager', 'yonetici']}>
            <SystemLogsScreen />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute>
            <SettingsScreen />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <UpdateModal />
    </AuthProvider>
  );
}
