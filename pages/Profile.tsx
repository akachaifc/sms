
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, ShieldCheck, Key, Camera, Loader2, Save, 
  Mail, Phone, ShieldAlert, CheckCircle2, Lock, 
  Trash2, Building, Fingerprint
} from 'lucide-react';
import { supabase, ROOT_ADMIN_UUID } from '../supabase';

const Profile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  
  // Password state
  const [passwords, setPasswords] = useState({
    old: '',
    new: '',
    confirm: ''
  });

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      // Fix: Destructure data object to get session, then access user property from session
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;

      if (user.id === ROOT_ADMIN_UUID) {
        setProfile({
          id: user.id,
          full_name: 'ROOT ADMINISTRATOR',
          email: user.email,
          role: 'Root Authority',
          table: null
        });
        setLoading(false);
        return;
      }

      // Check System Ops
      const { data: op } = await supabase.from('system_operators').select('*').eq('id', user.id).maybeSingle();
      if (op) {
        setProfile({ ...op, full_name: user.email?.split('@')[0].toUpperCase(), table: 'system_operators' });
      } else {
        // Check Teachers
        const { data: teacher } = await supabase.from('teachers_registry').select('*').eq('id', user.id).maybeSingle();
        if (teacher) {
          setProfile({ ...teacher, table: 'teachers_registry' });
          setPhotoBase64(teacher.photo_url || null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File exceeds maximum system limit of 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.src = evt.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic to keep under 100KB approximately
        const MAX_WIDTH = 400;
        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoBase64(base64);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    setSaving(true);
    try {
      if (profile.table) {
        const updates: any = { full_name: profile.full_name };
        if (photoBase64) updates.photo_url = photoBase64;
        
        const { error } = await supabase
          .from(profile.table)
          .update(updates)
          .eq('id', profile.id);
        
        if (error) throw error;
      }
      alert("Identity node synchronized successfully.");
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Token confirmation mismatch.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwords.new });
      if (error) throw error;
      
      setPasswords({ old: '', new: '', confirm: '' });
      alert("Security credentials updated across system nodes.");
    } catch (err: any) {
      alert(`Security update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accessing Personal Vault...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            Personnel Hub
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Global Profile & Security Parameters.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Personal Identity</h3>
            </div>
            {profile?.table && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full text-[8px] font-black uppercase tracking-widest border border-indigo-200">Verified Personnel</span>
            )}
          </div>

          <form onSubmit={handleUpdateProfile} className="p-10 space-y-10">
            <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
               {/* Photo Section */}
               <div className="relative group">
                  <div className="w-40 h-40 rounded-[2.5rem] bg-indigo-50 border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center">
                    {photoBase64 ? (
                      <img src={photoBase64} className="w-full h-full object-cover" alt="Profile" />
                    ) : (
                      <User className="w-16 h-16 text-indigo-200" />
                    )}
                  </div>
                  <button 
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="absolute bottom-2 right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-90"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
               </div>

               {/* Bio Fields */}
               <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-1 col-span-full">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Full Name</label>
                    <input 
                      disabled={!profile?.table}
                      value={profile?.full_name} 
                      onChange={e => setProfile({...profile, full_name: e.target.value.toUpperCase()})}
                      className="w-full px-5 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl font-bold text-sm text-slate-700 outline-none transition-all disabled:opacity-50" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Email</label>
                    <div className="flex items-center px-5 py-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 gap-3">
                       <Mail className="w-4 h-4" />
                       <span className="text-xs font-bold">{profile?.email}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Node</label>
                    <div className="flex items-center px-5 py-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 gap-3">
                       <Phone className="w-4 h-4" />
                       <span className="text-xs font-bold">{profile?.phone ? `(+256) ${profile.phone.replace('+256', '')}` : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Role</label>
                    <div className="flex items-center px-5 py-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 gap-3">
                       <ShieldCheck className="w-4 h-4" />
                       <span className="text-xs font-black uppercase tracking-tight">{profile?.role}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity UUID</label>
                    <div className="flex items-center px-5 py-3 bg-slate-100 rounded-2xl border border-slate-400 gap-3">
                       <Fingerprint className="w-4 h-4" />
                       <span className="text-[10px] font-black truncate">{profile?.id}</span>
                    </div>
                  </div>
               </div>
            </div>

            <div className="pt-6 border-t border-slate-50 flex justify-end">
               <button 
                type="submit" 
                disabled={saving || !profile?.table}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
               >
                 {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                 Sync Identity Profile
               </button>
            </div>
          </form>
        </div>

        {/* Security Card */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-[#1E1B4B] p-8 rounded-[2.5rem] shadow-2xl border border-indigo-900 text-white space-y-8">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-indigo-500/20 rounded-2xl"><Key className="w-6 h-6 text-indigo-400" /></div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Security Credentials</h3>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Access Authentication Sync</p>
                 </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">New System Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                      <input 
                        type="password" 
                        required
                        value={passwords.new}
                        onChange={e => setPasswords({...passwords, new: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-indigo-950 border border-indigo-800 focus:border-indigo-400 rounded-2xl outline-none transition-all text-sm font-bold placeholder:text-indigo-800" 
                        placeholder="••••••••"
                      />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest ml-1">Confirm Security Token</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                      <input 
                        type="password" 
                        required
                        value={passwords.confirm}
                        onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        className="w-full pl-12 pr-4 py-4 bg-indigo-950 border border-indigo-800 focus:border-indigo-400 rounded-2xl outline-none transition-all text-sm font-bold placeholder:text-indigo-800" 
                        placeholder="••••••••"
                      />
                    </div>
                 </div>

                 <div className="p-4 bg-indigo-900/40 rounded-2xl border border-indigo-700 space-y-2">
                    <div className="flex items-center gap-2 text-[#FACC15]">
                       <ShieldAlert className="w-4 h-4" />
                       <span className="text-[9px] font-black uppercase tracking-widest">Security Policy</span>
                    </div>
                    <p className="text-[9px] text-indigo-200 font-medium leading-relaxed uppercase">
                       Updating your password will immediately terminate all active sessions on other devices for security verification.
                    </p>
                 </div>

                 <button 
                  type="submit" 
                  disabled={saving || !passwords.new}
                  className="w-full bg-[#FACC15] hover:bg-yellow-500 text-indigo-950 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                 >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Update Secure Access
                 </button>
              </form>
           </div>

           <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-red-50 rounded-2xl text-red-600"><Trash2 className="w-6 h-6" /></div>
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest">Node Dissolution</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Registry Permanent Removal</p>
                 </div>
              </div>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed mb-6 uppercase">
                 Personnel nodes can only be dissolved by a <span className="font-black text-indigo-600 uppercase">Root Admin</span> or <span className="font-black text-indigo-600 uppercase">Master Admin</span> with sufficient permission flags.
              </p>
              <button 
                disabled 
                className="w-full py-4 border-2 border-slate-100 text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed"
              >
                Request Node Removal
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
