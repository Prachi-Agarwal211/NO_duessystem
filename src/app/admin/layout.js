import PageWrapper from '@/components/landing/PageWrapper';

export const metadata = {
  title: 'Admin Dashboard | JECRC UNIVERSITY NO DUES',
  description: 'Administrative control panel for JECRC UNIVERSITY NO DUES System',
};

export default function AdminLayout({ children }) {
  return (
    <PageWrapper showThemeToggle={true}>
      {children}
    </PageWrapper>
  );
}
