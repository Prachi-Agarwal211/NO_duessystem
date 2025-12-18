'use client';

import AdminDashboard from '@/components/admin/AdminDashboard';
import GlobalBackground from '@/components/ui/GlobalBackground';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AdminPage() {
  return (
    <ErrorBoundary>
      <GlobalBackground />
      <div className="relative z-10">
        <AdminDashboard />
      </div>
    </ErrorBoundary>
  );
}