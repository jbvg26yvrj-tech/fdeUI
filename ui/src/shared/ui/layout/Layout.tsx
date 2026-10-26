import { useState, useEffect, type ReactNode } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated } = useAuth();
  //const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed(prev => !prev);

  if (!isAuthenticated) {
    return <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>{children}</div>;
  }

  return (
    <div className='h-screen flex flex-col bg-gray-50 dark:bg-gray-900'>
      <Topbar onToggleSidebar={toggleSidebar} />
      <div className='flex flex-1 overflow-hidden'>
        <Sidebar collapsed={sidebarCollapsed} />
        <main className='flex-1 overflow-auto p-6 dark:text-gray-100'>{children}</main>
      </div>
    </div>
  );
};
