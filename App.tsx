import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase, ROOT_ADMIN_UUID } from './supabase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SystemStaff from './pages/SystemStaff';
import Onboarding from './pages/Onboarding';
import KnowledgeBank from './pages/KnowledgeBank';
import IngestionHub from './pages/IngestionHub';
import DesignLab from './pages/DesignLab';
import Financials from './pages/Financials';
import SupportHub from './pages/SupportHub';
import RegistryAudit from './pages/RegistryAudit';
import InstitutionalRegistry from './pages/InstitutionalRegistry';
import SchoolProfile from './pages/SchoolProfile';
import StudentProfile from './pages/StudentProfile';
import StaffProfile from './pages/StaffProfile';
import GlobalLogs from './pages/GlobalLogs';
import Profile from './pages/Profile';
import Layout from './components/Layout';
import { User } from '@supabase/supabase-js';

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error("App Error:", error);
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="p-8 bg-white shadow-xl rounded-2xl border border-red-100 max-w-md text-center">
          <h1 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">System Logic Error</h1>
          <p className="text-slate-500 text-sm mb-6 uppercase font-bold tracking-widest text-[10px]">The operating interface encountered a sequence error. All school records remain safe and synchronized.</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-indigo-900 transition-colors uppercase tracking-widest text-xs"
          >
            Restart Console
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#FACC15] rounded-2xl mb-4 shadow-2xl flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[#0F172A] border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-white font-black text-[10px] uppercase tracking-[0.3em]">SECURE ACCESS INITIALIZING...</p>
        </div>
      </div>
    );
  }

  const isRoot = user?.id === ROOT_ADMIN_UUID;

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={user ? <Layout user={user} isRoot={isRoot} /> : <Navigate to="/login" />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/institutional-registry" element={<InstitutionalRegistry />} />
            <Route path="/schools/:id" element={<SchoolProfile />} />
            <Route path="/schools/:id/student/:studentId" element={<StudentProfile />} />
            <Route path="/schools/:id/staff/:staffId" element={<StaffProfile />} />
            <Route path="/knowledge-bank" element={<KnowledgeBank />} />
            <Route path="/import-center" element={<IngestionHub />} />
            <Route path="/registry-audit" element={<RegistryAudit />} />
            <Route path="/id-designer" element={<DesignLab schoolId={""} />} />
            <Route path="/financials" element={<Financials />} />
            <Route path="/support-hub" element={<SupportHub />} />
            <Route path="/global-logs" element={<GlobalLogs />} />
            <Route path="/profile" element={<Profile />} />
            {isRoot && <Route path="/system-staff" element={<SystemStaff />} />}
          </Route>
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export default App;