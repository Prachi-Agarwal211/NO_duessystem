import PageWrapper from '@/components/landing/PageWrapper';

export const metadata = {
  title: 'Admin Dashboard | JECRC No Dues',
  description: 'Administrative control panel for JECRC No Dues System',
};

export default function AdminLayout({ children }) {
  return (
    <PageWrapper showThemeToggle={true}>
      {children}
    </PageWrapper>
  );
}
