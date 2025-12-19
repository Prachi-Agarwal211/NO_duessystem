'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { 
  LayoutDashboard, 
  History, 
  MessageSquare, 
  Settings, 
  LogOut, 
  X,
  GraduationCap,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const isStaff = pathname.startsWith('/staff');
  const isAdmin = pathname.startsWith('/admin');

  const menuItems = isStaff ? [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/staff/dashboard' },
    { name: 'History', icon: History, href: '/staff/history' },
    { name: 'Support Tickets', icon: MessageSquare, href: '/staff/support' },
  ] : isAdmin ? [
    { name: 'Overview', icon: LayoutDashboard, href: '/admin' },
    { name: 'Convocation', icon: GraduationCap, href: '/admin/convocation' },
    { name: 'Manual Entries', icon: FileText, href: '/admin/manual-entry' },
    { name: 'Support Tickets', icon: MessageSquare, href: '/admin/support' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ] : [];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    router.push('/staff/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 z-50 transform transition-transform duration-300 ease-in-out
        bg-white border-r border-gray-200 
        dark:bg-black dark:border-white/10
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        flex flex-col
      `}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 dark:border-white/5">
          <span className="font-bold text-xl bg-gradient-to-r from-jecrc-red via-jecrc-red-dark to-white dark:from-jecrc-red-bright dark:via-jecrc-red dark:to-white bg-clip-text text-transparent">
            NoDues
          </span>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
                  ${isActive
                    ? 'bg-jecrc-red text-white shadow-lg shadow-jecrc-red/20 dark:shadow-neon-red'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
