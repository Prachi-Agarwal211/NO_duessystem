import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata = {
  title: 'Admin Dashboard | JECRC No Dues',
  description: 'Administrative control panel for JECRC No Dues System',
};

export default function AdminLayout({ children }) {
  return (
    <DashboardLayout userType="admin">
      {children}
    </DashboardLayout>
  );
}
