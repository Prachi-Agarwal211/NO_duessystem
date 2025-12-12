'use client';

import ConvocationDashboard from '@/components/admin/ConvocationDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AdminConvocationPage() {
  return (
    <ErrorBoundary>
      <ConvocationDashboard />
    </ErrorBoundary>
  );
}