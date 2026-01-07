import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, Loader2, ShieldAlert, ChevronRight, ArrowLeft, User, Key, ShieldCheck, Fingerprint, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type LoginStage = 'IDENTITY_DISCOVERY' | 'SECURITY_ACCESS' | 'REQUEST_LOGGED';

interface Identity {
  id: string;
  full_name: string;
  role: string;
  photo_url?: string;
  needs_reset: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState<LoginStage>('IDENTITY_DISCOVERY');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, []);

  const handleDiscovery = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data: op, error: fetchErr } = await supabase
        .from('system_operators')
        .select('*')
        .eq('email', targetEmail)
        .maybeSingle();

      if (fetchErr) {
        console.error("Discovery Node Error:", fetchErr);
        throw new Error("Registry access interrupted. Verify gateway connection.");
      }

      if (op) {
        setIdentity({
          id: op.id,
          full_name: op.full_name || targetEmail.split('@')[0].toUpperCase(),
          role: op.role,
          photo_url: op.photo_url || op.profile_photo_url,
          needs_reset: op.needs_password_reset === true
        });
        setStage('SECURITY_ACCESS');
      } else {
        setError("Administrator Email not found in System Registry.");
      }
    } catch (err: any) {
      setError(err.message || "Discovery node unreachable.");
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (authErr) throw new Error("Security Access key rejected by the Master Console.");
      
      // LOGGING: System Login Event
      await supabase.from('audit_logs').insert([{
        operator_email: email.trim().toLowerCase(),
        operator_name: identity?.full_name,
        operator_id: identity?.id,
        operator_type: 'System Operator',
        action: 'CONSOLE_LOGIN_SUCCESS',
        entity_id: 'SYSTEM_CONSOLE'
      }]);

      navigate('/dashboard', { state: { firstLogin: identity?.needs_reset } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setError("Enter official email before requesting credential recovery.");
      return;
    }
    setLoading(true);
    try {
      const { data: op } = await supabase
        .from('system_operators')
        .select('id, full_name, role')
        .eq('email', targetEmail)
        .maybeSingle();

      if (!op) {
        setError("Administrator Email not found in System Registry.");
        return;
      }

      await supabase.from('reset_requests').insert([{
        user_id: op.id,
        email: targetEmail,
        full_name: op.full_name || targetEmail.split('@')[0].toUpperCase(),
        role: op.role,
        table_source: 'system_operators',
        status: 'Pending'
      }]);

      setStage('REQUEST_LOGGED');
    } catch (err: any) {
      setError("Recovery protocol error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0F172A] p-4 relative overflow-hidden">
      <div className="absolute inset-0 active-grid opacity-10 pointer-events-none"></div>
      
      {/* Decorative Assets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FACC15] rounded-full blur-[120px] opacity-10"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px] opacity-10"></div>
      </div>

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="bg-white rounded-[3rem] shadow-2xl p-10 transition-all border border-slate-100/50">
          
          {stage === 'IDENTITY_DISCOVERY' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col items-center mb-10">
                <div className="w-16 h-16 bg-[#0F172A] text-[#FACC15] rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
                  <Fingerprint className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase text-center">Identity Discovery</h1>
                <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mt-2">Master Registry Access Point</p>
              </div>

              <form onSubmit={handleDiscovery} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Official Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="email" 
                      autoFocus
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="admin@system.console"
                      className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-2 border-transparent focus:border-[#0F172A] focus:bg-white rounded-2xl outline-none font-bold text-sm text-slate-700 shadow-inner transition-all h-[56px]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2 bg-red-50 p-4 rounded-xl border border-red-100 animate-in slide-in-from-top-1">
                    <ShieldAlert className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#FACC15] hover:bg-yellow-500 text-[#0F172A] font-black py-4.5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest h-[56px]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Identify Administrator <ChevronRight className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          )}

          {stage === 'SECURITY_ACCESS' && identity && (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <button 
                onClick={() => { setStage('IDENTITY_DISCOVERY'); setError(null); }}
                className="mb-8 flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-[#0F172A] uppercase tracking-widest transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Discovery
              </button>

              <div className="flex flex-col items-center mb-8">
                <div className="relative group mb-6">
                  <div className="w-24 h-24 rounded-full border-4 border-slate-50 p-1 shadow-xl overflow-hidden bg-slate-100 flex items-center justify-center ring-4 ring-[#FACC15]/20 transition-transform group-hover:scale-105 duration-500">
                    {identity.photo_url ? (
                      <img src={identity.photo_url} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <User className="w-10 h-10 text-slate-300" />
                    )}
                  </div>
                  <div className="absolute bottom-1 right-0 p-2 bg-[#0F172A] text-[#FACC15] rounded-full shadow-lg border-2 border-white"><ShieldCheck className="w-3 h-3" /></div>
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase text-center leading-none">Welcome back, {identity.full_name}</h2>
                <p className="text-[#0F172A] text-[9px] font-black uppercase tracking-[0.2em] mt-3 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100/50">
                   Authority Tier: {identity.role}
                </p>
              </div>

              <form onSubmit={handleSecurityAccess} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Security Access Key</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="password" 
                      autoFocus
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border-2 border-transparent focus:border-[#0F172A] focus:bg-white rounded-2xl outline-none font-bold text-sm text-slate-700 shadow-inner transition-all h-[56px]"
                    />
                  </div>
                </div>

                {error && <div className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2 bg-red-50 p-4 rounded-xl border border-red-100"><ShieldAlert className="w-4 h-4 shrink-0" /> {error}</div>}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#FACC15] hover:bg-yellow-500 text-[#0F172A] font-black py-4.5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 uppercase text-xs tracking-widest h-[56px]"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Initialize Session <Key className="w-4 h-4" /></>}
                </button>

                <button 
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-[#0F172A] transition-colors pt-2"
                >
                  Credential Recovery?
                </button>
              </form>
            </div>
          )}

          {stage === 'REQUEST_LOGGED' && (
             <div className="animate-in zoom-in-95 duration-500 text-center">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mb-8 mx-auto shadow-inner border border-emerald-100">
                   <History className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-4">Request Logged</h2>
                <p className="text-slate-500 text-[11px] font-bold leading-relaxed uppercase tracking-widest mb-10 px-4">
                   The Master Administrator has been notified. You will receive your new credentials once the registry node is cleared via official email.
                </p>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full py-4.5 bg-[#0F172A] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all h-[56px]"
                >
                   Return to Discovery
                </button>
             </div>
          )}

          <p className="mt-12 text-center text-[8px] text-slate-300 uppercase tracking-[0.5em] font-black">
            SMS MASTER OS • SECURITY TIER 4
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;