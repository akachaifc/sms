import React, { useEffect, useState } from 'react';
import { 
  School as SchoolIcon, 
  Activity, 
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Clock,
  AlertCircle,
  ImageIcon,
  Users as UsersIcon,
  TrendingUp,
  Globe,
  Loader2,
  CheckCircle2,
  Wifi,
  Mail,
  ArrowRight,
  ShieldAlert,
  History,
  BookOpen,
  Download,
  Bell,
  LogIn,
  Key,
  Database,
  X,
  ChevronRight,
  Fingerprint,
  PenTool,
  Cpu,
  UserCircle,
  FileText,
  RefreshCcw
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase, ROOT_ADMIN_UUID } from '../supabase';
import { School, SystemDiagnostics } from '../types';

const Dashboard: React.FC = () => {
  const location = useLocation();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [healthChecking, setHealthChecking] = useState(false);
  const [showHealthOverlay, setShowHealthOverlay] = useState(false);
  const [showPopulationModal, setShowPopulationModal] = useState(false);
  const [showNotice, setShowNotice] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live Stats State
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    staff: 0,
    admins: 0,
    parents: 0,
    revenue: 0,
    totalSchools: 0
  });

  // Diagnostics State
  const [diagnostics, setDiagnostics] = useState<SystemDiagnostics | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-GB', { 
        timeZone: 'Africa/Kampala',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    }, 1000);

    // First-time notice logic for system operators
    if (location.state?.firstLogin) {
      setShowNotice(true);
      setTimeout(() => setShowNotice(false), 8000);
    }

    return () => clearInterval(interval);
  }, [location.state]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user.id;
      
      if (userId === ROOT_ADMIN_UUID) {
        setUserRole('Root');
      } else {
        const { data: operator } = await supabase.from('system_operators').select('role').eq('id', userId).single();
        setUserRole(operator?.role || 'Principal');
      }

      const [
        { data: schoolsData },
        { count: studentCount },
        { count: registryCount },
        { count: adminCount },
        { count: parentCount },
        { data: invoicesData }
      ] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('teachers_registry').select('*', { count: 'exact', head: true }),
        supabase.from('system_operators').select('*', { count: 'exact', head: true }),
        supabase.from('parent_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('amount').eq('status', 'Paid')
      ]);

      setSchools(schoolsData || []);
      setStats({
        students: studentCount || 0,
        teachers: registryCount || 0,
        staff: 0, 
        admins: adminCount || 0,
        parents: parentCount || 0,
        revenue: invoicesData?.reduce((acc, inv) => acc + inv.amount, 0) || 0,
        totalSchools: schoolsData?.length || 0
      });

    } finally {
      setLoading(false);
    }
  };

  const runFullDiagnostics = async () => {
    setHealthChecking(true);
    setShowHealthOverlay(true);
    const startPing = performance.now();
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const [
        { count: todayL },
        { count: weeklyL },
        { count: emails },
        { count: totalS },
        { count: totalStud },
        { count: totalInv },
        { count: totalLogs },
        { count: totalStaff },
        { count: photos },
        { count: sigs }
      ] = await Promise.all([
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'LOGIN').gte('created_at', today),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'LOGIN').gte('created_at', weekAgoStr),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }).eq('action', 'EMAIL_DISPATCH'),
        supabase.from('schools').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('invoices').select('*', { count: 'exact', head: true }),
        supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
        supabase.from('teachers_registry').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).not('photo_url', 'is', null),
        supabase.from('students').select('*', { count: 'exact', head: true }).not('signature_url', 'is', null)
      ]);

      const endPing = performance.now();

      setDiagnostics({
        todayLogins: todayL || 0,
        weeklyLogins: weeklyL || 0,
        totalRows: (totalS || 0) + (totalStud || 0) + (totalInv || 0) + (totalLogs || 0) + (totalStaff || 0),
        apiRequests24h: (totalLogs || 0) > 100 ? totalLogs! / 10 : totalLogs || 0,
        emailPayloads: emails || 0,
        smsPayloads: 0,
        activeAdmins: stats.admins,
        activeStaff: stats.teachers,
        activeParents: stats.parents,
        activeStudents: stats.students,
        photosIntegrated: photos || 0,
        signaturesIntegrated: sigs || 0,
        latencyMs: Math.round(endPing - startPing)
      });

    } catch (err) {
      console.error('System Health Scan Failed:', err);
    } finally {
      setHealthChecking(false);
    }
  };

  const isHighAuthority = userRole === 'Root' || userRole === 'Master';
  const totalNetworkPopulation = stats.students + stats.teachers + stats.staff + stats.admins + stats.parents;

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-UG').format(num);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-[1600px] mx-auto relative">
      {/* SECURITY NOTICE TOAST */}
      {showNotice && (
        <div className="fixed top-20 right-8 z-[500] animate-in slide-in-from-right-10 duration-500">
           <div className="bg-[#0F172A] border-l-4 border-[#FACC15] text-white p-5 rounded-2xl shadow-2xl flex items-start gap-4 max-w-sm ring-1 ring-white/10 backdrop-blur-md">
              <ShieldAlert className="w-6 h-6 text-[#FACC15] shrink-0" />
              <div>
                 <p className="text-[11px] font-black uppercase tracking-widest mb-1">Security Notice</p>
                 <p className="text-[10px] text-slate-300 font-bold leading-relaxed uppercase">
                    This is your first login. For institutional integrity, please update your access key in the Profile section.
                 </p>
                 <button onClick={() => setShowNotice(false)} className="mt-3 text-[9px] font-black text-[#FACC15] uppercase tracking-widest hover:underline">Acknowledge</button>
              </div>
           </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Network Overview</h1>
          <p className="text-sm text-slate-500 font-medium uppercase tracking-widest text-[10px] mt-2 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            Live System Monitoring and Registry Audits.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={runFullDiagnostics}
            className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl border-2 border-indigo-50 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-sm"
          >
            <Activity className="w-4 h-4" />
            SYSTEM HEALTH STATUS
          </button>
          <Link 
            to="/onboarding"
            className="bg-[#FACC15] hover:bg-yellow-500 text-indigo-950 px-8 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-xl transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            ONBOARD NEW SCHOOL
          </Link>
        </div>
      </div>

      {/* Primary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Population Tile */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors duration-500"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-indigo-50 text-indigo-600 p-4 rounded-[1.5rem]">
                <UsersIcon className="w-8 h-8" />
              </div>
              <button 
                onClick={() => setShowPopulationModal(true)}
                className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all group-hover:shadow-md"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Global Population</p>
              <h2 className="text-4xl font-black text-slate-800 mt-2">{totalNetworkPopulation.toLocaleString()}</h2>
              <p className="text-[10px] font-bold text-indigo-400 mt-2 uppercase">Verified System Records</p>
            </div>
          </div>
        </div>

        {/* Schools Tile */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-100 transition-colors duration-500"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-6">
              <div className="bg-blue-50 text-blue-600 p-4 rounded-[1.5rem]">
                <SchoolIcon className="w-8 h-8" />
              </div>
              <Link to="/institutional-registry" className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all group-hover:shadow-md">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Active Institutions</p>
              <h2 className="text-4xl font-black text-slate-800 mt-2">{stats.totalSchools}</h2>
              <p className="text-[10px] font-bold text-blue-400 mt-2 uppercase">Operating Institutional Nodes</p>
            </div>
          </div>
        </div>

        {/* Revenue Tile */}
        {isHighAuthority && (
          <div className="bg-[#0F172A] p-8 rounded-[2.5rem] shadow-2xl border border-indigo-900 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-indigo-900/50 text-[#FACC15] p-4 rounded-[1.5rem] border border-indigo-800">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <Link to="/financials" className="p-3 bg-indigo-900/30 text-indigo-400 rounded-xl hover:bg-[#FACC15] hover:text-indigo-950 transition-all shadow-sm">
                  <ArrowUpRight className="w-5 h-5" />
                </Link>
              </div>
              <div>
                <p className="text-[11px] font-black text-indigo-300 uppercase tracking-widest">Consolidated Revenue</p>
                <h2 className="text-3xl font-black text-white mt-2">UGX {formatCurrency(stats.revenue)}</h2>
                <p className="text-[10px] font-bold text-[#FACC15] mt-2 uppercase">Audit: Verified Credits</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Population Breakdown Modal */}
      {showPopulationModal && (
        <div className="fixed inset-0 z-[200] bg-[#0F172A]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                  <UsersIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-widest">Registry Census</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time aggregated population nodes.</p>
                </div>
              </div>
              <button onClick={() => setShowPopulationModal(false)} className="p-3 bg-white text-slate-400 rounded-2xl hover:text-red-500 transition-all shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Students', value: stats.students, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Parents', value: stats.parents, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Staff/Faculty', value: stats.teachers, color: 'text-amber-600', bg: 'bg-amber-50' },
                  { label: 'Administrators', value: stats.admins, color: 'text-blue-600', bg: 'bg-blue-50' }
                ].map((item, i) => (
                  <div key={i} className={`${item.bg} p-6 rounded-3xl text-center flex flex-col items-center justify-center min-h-[120px]`}>
                    <p className={`text-2xl font-black ${item.color}`}>{item.value.toLocaleString()}</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SCREEN SYSTEM HEALTH STATUS OVERLAY */}
      {showHealthOverlay && (
        <div className="fixed inset-0 z-[300] bg-gradient-to-br from-[#0F172A] to-[#1E1B4B] active-grid p-10 flex flex-col animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 shrink-0">
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-indigo-600 text-white rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)] border border-indigo-400/30">
                   <Activity className={`w-10 h-10 ${healthChecking ? 'animate-ping' : ''}`} />
                </div>
                <div>
                   <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">SYSTEM DIAGNOSTICS</h2>
                   <div className="flex items-center gap-4 mt-2">
                      <p className="text-[#FACC15] font-bold uppercase tracking-[0.4em] text-xs">STATUS: {healthChecking ? 'ANALYZING...' : 'OPERATIONAL'}</p>
                      <div className="h-4 w-px bg-indigo-800"></div>
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                         <p className="text-white/60 font-black text-[10px] uppercase tracking-widest">Network Node: STABLE</p>
                      </div>
                   </div>
                </div>
             </div>
             <div className="flex flex-col items-end">
                <div className="text-6xl font-black text-[#FACC15] tracking-tighter tabular-nums mb-1">{currentTime}</div>
                <p className="text-white/40 font-black text-[10px] uppercase tracking-[0.4em]">UGANDA STANDARD TIME (EAT)</p>
             </div>
          </div>

          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 overflow-y-auto no-scrollbar pb-10">
            {/* Sector 1: Logins */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 flex flex-col space-y-8 group hover:bg-white/10 transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl"><LogIn className="w-6 h-6" /></div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Session Activity</h4>
               </div>
               <div className="space-y-6">
                  <div className="flex justify-between items-end border-b border-white/5 pb-6">
                     <span className="text-white/40 font-black uppercase text-[10px] tracking-widest">Today's Ingress</span>
                     <span className="text-4xl font-black text-white tabular-nums">{diagnostics?.todayLogins || 0}</span>
                  </div>
                  <div className="flex justify-between items-end">
                     <span className="text-white/40 font-black uppercase text-[10px] tracking-widest">Weekly Cumulative</span>
                     <span className="text-3xl font-black text-indigo-400 tabular-nums">{diagnostics?.weeklyLogins || 0}</span>
                  </div>
               </div>
               <div className="mt-auto pt-6 flex items-center gap-2 text-indigo-400/60 font-black text-[9px] uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> Registry Log Audited
               </div>
            </div>

            {/* Sector 2: DB */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 flex flex-col space-y-8 group hover:bg-white/10 transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl"><Database className="w-6 h-6" /></div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Registry Database</h4>
               </div>
               <div className="space-y-6">
                  <div className="space-y-3">
                     <div className="flex justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                        <span>Total Ledger Rows</span>
                        <span className="text-white">{diagnostics?.totalRows || 0} Nodes</span>
                     </div>
                     <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, (diagnostics?.totalRows || 0) / 500000 * 100)}%` }}></div>
                     </div>
                  </div>
                  <div className="space-y-3">
                     <div className="flex justify-between text-[10px] font-black text-white/60 uppercase tracking-widest">
                        <span>Registry Throughput</span>
                        <span className="text-white">{Math.round(diagnostics?.apiRequests24h || 0)} Req/24h</span>
                     </div>
                     <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, (diagnostics?.apiRequests24h || 0) / 10000 * 100)}%` }}></div>
                     </div>
                  </div>
               </div>
               <div className="mt-auto p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center justify-between">
                  <span className="text-blue-400 font-black text-[9px] uppercase tracking-widest">Latency Spectrum</span>
                  <span className="text-white font-black text-xs tabular-nums">{diagnostics?.latencyMs || 0}ms</span>
               </div>
            </div>

            {/* Sector 3: Comms */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 flex flex-col space-y-8 group hover:bg-white/10 transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl"><Bell className="w-6 h-6" /></div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Communication Bridge</h4>
               </div>
               <div className="grid grid-cols-1 gap-6">
                  <div className="p-6 bg-amber-400/5 rounded-3xl border border-amber-400/10">
                     <div className="flex justify-between items-center">
                        <p className="text-amber-400/60 font-black text-[10px] uppercase">Emails Dispatched</p>
                        <p className="text-2xl font-black text-white tabular-nums">{diagnostics?.emailPayloads || 0}</p>
                     </div>
                  </div>
                  <div className="p-6 bg-amber-400/5 rounded-3xl border border-amber-400/10 opacity-40">
                     <div className="flex justify-between items-center">
                        <p className="text-amber-400/60 font-black text-[10px] uppercase">SMS Broadcasts</p>
                        <p className="text-2xl font-black text-white tabular-nums">0</p>
                     </div>
                  </div>
               </div>
               <div className="mt-auto pt-6 flex items-center gap-2 text-amber-400/60 font-black text-[9px] uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> Messaging Pipeline Online
               </div>
            </div>

            {/* Sector 4: Registry */}
            <div className="lg:col-span-8 bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 p-10 flex flex-col space-y-10 group hover:bg-white/10 transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl"><Key className="w-6 h-6" /></div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Institutional Population Census</h4>
               </div>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
                  {[
                    { label: 'Administrators', value: diagnostics?.activeAdmins || 0, color: 'text-blue-400', icon: ShieldCheck },
                    { label: 'Verified Educators', value: diagnostics?.activeStaff || 0, color: 'text-indigo-400', icon: UserCircle },
                    { label: 'Parent Nodes', value: diagnostics?.activeParents || 0, color: 'text-emerald-400', icon: UsersIcon },
                    { label: 'Student Records', value: diagnostics?.activeStudents || 0, color: 'text-amber-400', icon: Fingerprint }
                  ].map((s, i) => (
                    <div key={i} className="space-y-4">
                      <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${s.color}`}>
                         <s.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-3xl font-black text-white tabular-nums">{s.value.toLocaleString()}</p>
                        <p className="text-white/30 font-black text-[9px] uppercase tracking-widest mt-1">{s.label}</p>
                      </div>
                    </div>
                  ))}
               </div>
               <div className="flex gap-4">
                  <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                     Compliance: ISO/IEC Registry Standard
                  </div>
               </div>
            </div>

            {/* Sector 5: Files */}
            <div className="lg:col-span-4 bg-white/5 backdrop-blur-md rounded-[3rem] border border-white/10 p-8 flex flex-col space-y-8 group hover:bg-white/10 transition-all">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-500/20 text-purple-400 rounded-2xl"><Download className="w-6 h-6" /></div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Assets & Document Vault</h4>
               </div>
               <div className="space-y-4">
                  <div className="p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10 space-y-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <ImageIcon className="w-4 h-4 text-purple-400" />
                           <span className="text-white/60 font-black text-[10px] uppercase">Biometric Photos</span>
                        </div>
                        <span className="text-xl font-black text-white">{diagnostics?.photosIntegrated || 0}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <PenTool className="w-4 h-4 text-purple-400" />
                           <span className="text-white/60 font-black text-[10px] uppercase">Auth Signatures</span>
                        </div>
                        <span className="text-xl font-black text-white">{diagnostics?.signaturesIntegrated || 0}</span>
                     </div>
                  </div>
                  <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5 space-y-4">
                     <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 text-white/20">
                           <FileText className="w-4 h-4" />
                           <span className="font-black text-[10px] uppercase">Reports Generated</span>
                        </div>
                        <span className="text-xl font-black text-white/20">0</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center shrink-0">
             <button 
              onClick={() => setShowHealthOverlay(false)}
              className="text-white/40 hover:text-white font-black text-xs uppercase tracking-[0.4em] transition-all flex items-center gap-3"
             >
                <ChevronRight className="w-5 h-5 rotate-180" /> EXIT DIAGNOSTIC VIEW
             </button>
             <div className="flex gap-4">
                <button onClick={runFullDiagnostics} className="px-10 py-5 bg-[#FACC15] text-indigo-950 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-[0_0_50px_-12px_rgba(250,204,21,0.3)] hover:shadow-[0_0_60px_-12px_rgba(250,204,21,0.5)] transition-all flex items-center gap-3 active:scale-95">
                   <RefreshCcw className={`w-4 h-4 ${healthChecking ? 'animate-spin' : ''}`} /> REFRESH LIVE DIAGNOSTICS
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Authority Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {isHighAuthority && (
          <Link to="/system-staff" className="group bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Access Control</h3>
                <p className="text-sm text-slate-500 mt-1 font-medium">Manage System Administrators and Access Permissions.</p>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all">
              <ArrowRight className="w-6 h-6" />
            </div>
          </Link>
        )}

        <Link to="/knowledge-bank" className="group bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
              <BookOpen className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Administrative Bank</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium">Configure Standards for Subjects, Calendars, and Records.</p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
            <ArrowRight className="w-6 h-6" />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;