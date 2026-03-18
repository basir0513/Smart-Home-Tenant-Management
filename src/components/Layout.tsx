import React from 'react';
import { User } from 'firebase/auth';
import { Home, Users, CreditCard, Zap, LogOut, Menu, X, Building2, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserDoc } from '../types';

interface LayoutProps {
  user: User;
  userDoc: UserDoc;
  currentView: string;
  onViewChange: (view: any) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export function Layout({ user, userDoc, currentView, onViewChange, onLogout, children }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'flats', label: 'Flats', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'utilities', label: 'Utilities', icon: Zap },
  ];

  if (userDoc.role === 'admin') {
    navItems.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6 no-print">
        <div className="flex items-center gap-3 mb-10">
          <img 
            src="/api/attachments/input_file_0.png" 
            alt="Smart Home Logo" 
            className="w-full h-auto"
            referrerPolicy="no-referrer"
          />
        </div>

        {userDoc.homeName && (
          <div className="mb-8 px-4 py-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Property</p>
            <p className="text-sm font-bold text-white truncate">{userDoc.homeName}</p>
          </div>
        )}

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                currentView === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-2">
            <img 
              src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}`} 
              alt={user.displayName || user.email || ''} 
              className="w-8 h-8 rounded-full border border-slate-700"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user.displayName || user.email?.split('@')[0]}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>


      {/* Header - Mobile */}
      <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50 no-print">
        <div className="flex items-center gap-2">
          <img 
            src="/api/attachments/input_file_0.png" 
            alt="Smart Home Logo" 
            className="h-8 w-auto"
            referrerPolicy="no-referrer"
          />
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-slate-900 p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <nav className="space-y-2 mt-12">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    currentView === item.id
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-slate-800">
                <div className="flex items-center gap-3 mb-4 px-2">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email?.split('@')[0]}`} 
                    alt={user.displayName || user.email || ''} 
                    className="w-8 h-8 rounded-full border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{user.displayName || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto bg-slate-950">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
