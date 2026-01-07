import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, LogOut, ShieldCheck, DatabaseZap, Banknote, 
  LifeBuoy, ShieldAlert, History, Activity, User as UserIcon, Loader2
} from 'lucide-react';
import { supabase, ROOT_ADMIN_UUID } from '../supabase';
import { User } from '@supabase/supabase-js';

interface LayoutProps {
  user: User | null;
  isRoot: boolean;
}

const Layout: React.FC<LayoutProps> = ({ user, isRoot }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name: string; role: string; photo?: string } | null>(null);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      if (user?.id === ROOT_ADMIN_UUID) {
        setProfile({ name: 'ROOT ADMINISTRATOR', role: 'Root Authority', photo: undefined });
        return;
      }

      const { data: op } = await supabase.from('system_operators').select('role, full_name').eq('id', user?.id).maybeSingle();
      if (op) {
        setProfile({ name: op.full_name || user?.email?.split('@')[0].toUpperCase() || 'MASTER ADMIN', role: op.role });
        return;
      }

      const { data: teacher } = await supabase.from('teachers_registry').select('full_name, role, photo_url').eq('id', user?.id).maybeSingle();
      if (teacher) {
        setProfile({ name: teacher.full_name, role: teacher.role, photo: teacher.photo_url });
      }
    } catch (err) {
      console.error("Profile load failure");
    }
  };

  const handleLogout = async () => {
    try {
      // LOGGING: System Logout Event
      await supabase.from('audit_logs').insert([{
        operator_email: user?.email,
        operator_name: profile?.name,
        operator_id: user?.id,
        operator_type: isRoot || profile?.role?.includes('Master') ? 'System Operator' : 'School Administrator',
        action: 'CONSOLE_LOGOUT_SUCCESS',
        entity_id: 'SYSTEM_CONSOLE'
      }]);

      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      navigate('/login', { replace: true });
    } catch (err) {
      window.location.href = '/login';
    }
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Schools', path: '/institutional-registry', icon: ShieldAlert },
    { label: 'Import', path: '/import-center', icon: DatabaseZap },
    { label: 'Audit', path: '/registry-audit', icon: Activity },
    { label: 'Billing', path: '/financials', icon: Banknote },
    { label: 'Support', path: '/support-hub', icon: LifeBuoy },
    { label: 'Logs', path: '/global-logs', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans overflow-x-hidden">
      <header className="bg-[#1E1B4B] text-white shadow-lg sticky top-0 z-50 shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-[#FACC15] rounded-md flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <ShieldCheck className="w-4 h-4 text-indigo-950" />
              </div>
              <span className="font-extrabold text-sm tracking-tight uppercase hidden sm:inline">SMS MASTER</span>
            </div>
            
            <nav className="flex items-center gap-0.5 ml-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    location.pathname.startsWith(item.path)
                    ? 'bg-indigo-800 text-[#FACC15]' 
                    : 'text-indigo-200 hover:text-white hover:bg-indigo-900'
                  }`}
                >
                  <item.icon className="w-3 h-3" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-3 group hover:bg-indigo-900/50 p-1.5 pr-4 rounded-xl transition-all border border-transparent hover:border-indigo-700/50">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black leading-none uppercase tracking-widest text-white group-hover:text-[#FACC15] transition-colors">{profile?.name || user?.email?.split('@')[0]}</p>
                <p className="text-[8px] text-indigo-400 font-black leading-none mt-1 uppercase tracking-widest">
                  {profile?.role || (isRoot ? 'Root' : 'Admin')}
                </p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-indigo-800 border border-indigo-700 overflow-hidden flex items-center justify-center shadow-sm">
                 {profile?.photo ? (
                   <img src={profile.photo} className="w-full h-full object-cover" alt="User" />
                 ) : (
                   <UserIcon className="w-4 h-4 text-indigo-300" />
                 )}
              </div>
            </Link>
            <div className="h-6 w-px bg-indigo-800 mx-1"></div>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-red-600 rounded-lg text-indigo-300 hover:text-white transition-all active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 overflow-x-hidden">
        <Outlet />
      </main>
      
      <footer className="bg-white border-t border-slate-200 py-2 px-8 shrink-0">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center text-[8px] text-slate-400 uppercase tracking-[0.2em] font-black">
          <span>SMS UGANDA OS v1.2.0 • STATUS: ENCRYPTED</span>
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
              <span>REGISTRY SYNC: 100%</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;