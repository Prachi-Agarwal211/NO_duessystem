import AdminDashboard from '@/components/admin/AdminDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AdminPage() {
  return (
    <ErrorBoundary>
      <AdminDashboard />
    </ErrorBoundary>
  );
}