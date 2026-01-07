
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShieldCheck, UserPlus, Search, MoreVertical, ShieldAlert, Loader2, AlertCircle, X, CheckCircle2, UserCircle, Key, Download } from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../supabase';
import { SystemOperator } from '../types';

const SystemStaff: React.FC = () => {
  const [operators, setOperators] = useState<SystemOperator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'Principal' as SystemOperator['role'],
  });

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('system_operators')
        .select('*')
        .order('role', { ascending: false });

      if (fetchError) throw fetchError;
      setOperators(data || []);
    } catch (err: any) {
      console.error('Error fetching operators:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = () => {
    return Math.random().toString(36).slice(-8);
  };

  const sendOperatorEmail = async (password: string) => {
    setStatusMessage('Dispatching login credentials via EmailJS...');
    
    const serviceId = 'service_s2bvvh2';
    const publicKey = 'psRo0pR25zPBvGgeD';
    const templateId = 'template_ysfduyo';

    const templateParams = {
      admin_name: formData.name,
      assigned_role: formData.role === 'Master' ? 'Master Admin' : 'Principal Admin',
      school_name: 'SMS MASTER CONSOLE',
      school_admin_email: formData.email.toLowerCase(),
      generated_password: password,
      download_link: 'https://sms-portal.gov/downloads/SMS_Admin_Console_v4_Setup.exe'
    };

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: templateParams
        })
      });

      if (response.ok) {
        setStatusMessage('EmailJS 200 OK');
        return true;
      } else {
        const errText = await response.text();
        console.error('EmailJS Error:', errText);
        setStatusMessage('EmailJS Failed');
        return false;
      }
    } catch (err) {
      console.error('Email Dispatch Exception:', err);
      setStatusMessage('EmailJS Failed (Network)');
      return false;
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert("Full Name and a valid Email are required.");
      return;
    }

    setSubmitting(true);
    setStatusMessage('Securing Master Node...');
    
    try {
      const tempPassword = generatePassword();
      let userId: string | null = null;
      
      // FIX: Use a temporary client to prevent session switching
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });

      // 1. Attempt Auth User Creation using the non-persisting client
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: tempPassword,
        options: {
          data: {
            full_name: formData.name,
            role: formData.role
          }
        }
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('already registered')) {
          setStatusMessage('Operator exists. Re-syncing node...');
          const { data: existingOp } = await supabase
            .from('system_operators')
            .select('id')
            .eq('email', formData.email.toLowerCase())
            .maybeSingle();
          
          if (existingOp) userId = existingOp.id;
          else throw new Error("Operator authentication exists but profile link failed.");
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id || null;
      }

      if (!userId) throw new Error("Critical: UUID Synchronization Failed.");

      setStatusMessage('Syncing Database Node...');

      // 2. Upsert into System Operators
      const { error: dbError } = await supabase.from('system_operators').upsert([{
        id: userId,
        email: formData.email.toLowerCase(),
        role: formData.role,
        needs_password_reset: true // Explicitly set for new nodes
      }]);

      if (dbError) throw dbError;

      // 3. Dispatch Email
      const emailSuccess = await sendOperatorEmail(tempPassword);
      
      await new Promise(r => setTimeout(r, 1000));

      setShowOnboardModal(false);
      setFormData({ name: '', email: '', role: 'Principal' });
      fetchOperators();
      
      if (!emailSuccess) {
        alert('Operator synchronized, but EmailJS failed. Manual credentials: ' + tempPassword);
      } else {
        alert('Master Node successfully provisioned and credentials dispatched.');
      }
    } catch (err: any) {
      alert(`Provisioning Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
      setStatusMessage('');
    }
  };

  const filteredOperators = operators.filter(op => 
    op.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="p-1.5 bg-red-600 rounded-lg shadow-sm">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            Console Administrators
          </h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Management of higher-tier system operators.</p>
        </div>
        <button 
          onClick={() => setShowOnboardModal(true)}
          className="bg-[#FACC15] text-indigo-950 px-5 py-2 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-sm transition-all active:scale-95 hover:bg-yellow-500"
        >
          <UserPlus className="w-3.5 h-3.5" />
          ONBOARD OPERATOR
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-3 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by email..." 
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accessing Registry...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-500">
               <AlertCircle className="w-8 h-8" />
               <p className="text-[10px] font-black uppercase">{error}</p>
            </div>
          ) : (
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-[9px] text-slate-400 uppercase tracking-widest border-b border-slate-100 font-black">
                  <th className="px-6 py-3">Operator Identity</th>
                  <th className="px-6 py-3">Authority Tier</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-bold text-slate-700">
                {filteredOperators.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-3 lowercase">{op.email}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5">
                        {op.role === 'Master' || op.role === 'Root' ? (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-purple-200 flex items-center gap-1.5 shadow-sm">
                            <ShieldCheck className="w-3 h-3" /> Master Tier
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-200 flex items-center gap-1.5 shadow-sm">
                            <UserCircle className="w-3 h-3" /> Principal Tier
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="p-1 hover:bg-white rounded-lg transition-colors group-hover:shadow-sm opacity-0 group-hover:opacity-100">
                        <MoreVertical className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredOperators.length === 0 && (
                   <tr>
                     <td colSpan={3} className="py-20 text-center opacity-30 font-black text-[10px] uppercase tracking-widest">No matching operators in registry</td>
                   </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showOnboardModal && (
        <div className="fixed inset-0 z-[200] bg-indigo-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-md overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-indigo-600 rounded-lg"><UserPlus className="w-4 h-4 text-white" /></div>
                   <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Operator Provisioning</h3>
                </div>
                <button onClick={() => setShowOnboardModal(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
             </div>
             <form onSubmit={handleOnboard} className="p-8 space-y-5">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Operator Full Name</label>
                   <input 
                     required
                     type="text" 
                     value={formData.name} 
                     onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                     placeholder="e.g. ARINDA JUDE" 
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-600" 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Email</label>
                   <input 
                     required
                     type="email" 
                     value={formData.email} 
                     onChange={e => setFormData({...formData, email: e.target.value})}
                     placeholder="name@system.console" 
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-600" 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Authority Assignment</label>
                   <select 
                     value={formData.role} 
                     onChange={e => setFormData({...formData, role: e.target.value as any})}
                     className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-indigo-600"
                   >
                      <option value="Master">Master Admin (Global Node Control)</option>
                      <option value="Principal">Principal Admin (Institutional Access)</option>
                   </select>
                </div>

                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-2">
                   <div className="flex items-center gap-2 text-indigo-600">
                      <Key className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Protocol Sync</span>
                   </div>
                   <p className="text-[9px] text-indigo-700 font-bold leading-relaxed uppercase">
                      Provisioning will trigger a password generation sequence and dispatch credentials via secure EmailJS bridge.
                   </p>
                </div>

                <div className="pt-2">
                   <button 
                     disabled={submitting}
                     className="w-full py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                   >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="mt-1 normal-case font-bold">{statusMessage}</span>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            SECURE MASTER NODE
                          </div>
                        </>
                      )}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemStaff;
