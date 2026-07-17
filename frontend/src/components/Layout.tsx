import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  FileText,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Settings,
  Sun,
  Moon,
  LogOut,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Wallet
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, theme, toggleTheme, clearAuth, initTheme } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const navGroups = [
    {
      title: '1. Initiation',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Project Setup', path: '/projects', icon: FolderKanban },
      ]
    },
    {
      title: '2. Planning & Baseline',
      items: [
        { label: 'WBS & Schedule', path: '/wbs', icon: CalendarDays },
        { label: 'Resources & Cost', path: '/resources', icon: Wallet },
      ]
    },
    {
      title: '3. Execution & Procurement',
      items: [
        { label: 'Procurement (PO)', path: '/procurement', icon: ShoppingCart },
        { label: 'Field HSE & Quality', path: '/safety', icon: ShieldCheck },
      ]
    },
    {
      title: '4. Control & Docs',
      items: [
        { label: 'Pooling Document', path: '/pooling-document', icon: FileText },
        { label: 'S-Curve & EVM', path: '/s-curve', icon: TrendingUp },
        { label: 'AI Predictor', path: '/ai', icon: BrainCircuit },
      ]
    }
  ];

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-50">
      
      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 left-0 bottom-0 bg-white dark:bg-[#0c0c0e] border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 flex flex-col z-30 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
          {!collapsed && (
            <span className="text-md font-bold tracking-tight bg-gradient-to-r from-brand-500 to-violet-500 bg-clip-text text-transparent">
              EPCS Control
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto no-scrollbar space-y-6">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {group.title}
                </div>
              )}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-500 dark:text-brand-100'
                          : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-brand-500' : 'text-zinc-400 group-hover:text-zinc-600'} />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Settings separate group */}
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Link
              to="/settings"
              title={collapsed ? 'Billing & Settings' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group ${
                location.pathname === '/settings'
                  ? 'bg-brand-500/10 text-brand-500 dark:text-brand-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Settings size={18} className={location.pathname === '/settings' ? 'text-brand-500' : 'text-zinc-400 group-hover:text-zinc-600'} />
              {!collapsed && <span>Billing & Settings</span>}
            </Link>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'pl-16' : 'pl-64'}`}>
        
        {/* Topbar */}
        <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-[#0c0c0e]/70 backdrop-blur-md sticky top-0 flex items-center justify-between px-6 z-20">
          
          {/* Search Trigger */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 max-w-xs w-64 cursor-pointer hover:border-zinc-300">
            <Search size={14} />
            <span className="text-xs">Quick search (⌘K)...</span>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 transition-colors"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {/* Notification Trigger */}
            <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500 relative">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500" />
            </button>

            {/* User Profile info */}
            <div className="flex items-center gap-3 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center font-bold text-white text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold">{user?.name}</p>
                <p className="text-[10px] text-zinc-400">{user?.roles[0]}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
