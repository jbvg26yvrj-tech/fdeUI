import { useState, useEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../../context/AuthContext';
import './shell.css';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === 'true',
  );
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => {
    setDrawerOpen(false);
    toggleRef.current?.focus();
  };

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 900px)');
    const update = () => {
      setNarrow(query.matches);
      setDrawerOpen(false);
    };
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!narrow || !drawerOpen) return;
    const previous = toggleRef.current;
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setDrawerOpen(false);
      }
      if (event.key !== 'Tab') return;
      const elements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [narrow, drawerOpen]);

  if (!isAuthenticated) return <div className='fde-auth-shell'>{children}</div>;

  return (
    <div className='fde-shell'>
      <div
        style={{ flexShrink: 0 }}
        ref={node => {
          node?.toggleAttribute('inert', narrow && drawerOpen);
        }}
      >
        <Topbar
          toggleRef={toggleRef}
          navigationExpanded={narrow ? drawerOpen : !sidebarCollapsed}
          onToggleSidebar={() =>
            narrow ? setDrawerOpen(open => !open) : setSidebarCollapsed(collapsed => !collapsed)
          }
        />
      </div>
      <div className='fde-shell-body'>
        {(!narrow || drawerOpen) && (
          <>
            {narrow && (
              <button
                className='fde-drawer-backdrop'
                aria-label='Закрыть навигацию'
                tabIndex={-1}
                onClick={closeDrawer}
              />
            )}
            <div
              id='fde-navigation'
              ref={drawerRef}
              className={narrow ? 'fde-drawer' : 'fde-sidebar-container'}
              role={narrow ? 'dialog' : undefined}
              aria-modal={narrow ? true : undefined}
              aria-label={narrow ? 'Навигация' : undefined}
            >
              {narrow && (
                <button className='fde-drawer-close' onClick={closeDrawer}>
                  Закрыть меню
                </button>
              )}
              <Sidebar
                collapsed={!narrow && sidebarCollapsed}
                onNavigate={narrow ? closeDrawer : undefined}
              />
            </div>
          </>
        )}
        <main
          className='fde-main dark:text-gray-100'
          ref={node => {
            node?.toggleAttribute('inert', narrow && drawerOpen);
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
