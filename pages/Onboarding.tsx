import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Loader2, ShieldCheck, 
  ToggleRight, ToggleLeft, ChevronRight, ChevronLeft, 
  Mail, Phone, X, Home, UserCircle, Briefcase, 
  BookOpen, Banknote, Globe, Camera, Search,
  CheckCircle2, AlertCircle, Plus, Trash2, 
  Layout, Heart, ShieldAlert, Stamp, Tag,
  FileSearch, Database, Shield, Zap
} from 'lucide-react';
import { supabase } from '../supabase';
import { MasterSubject } from '../types';

const UGANDA_GEOGRAPHY: Record<string, string[]> = {
  'Central': ['Kampala', 'Wakiso', 'Mukono', 'Masaka', 'Luwero', 'Mpigi', 'Mityana', 'Entebbe', 'Kayunga', 'Buvuma'],
  'Eastern': ['Jinja', 'Mbale', 'Soroti', 'Iganga', 'Tororo', 'Kamuli', 'Busia', 'Kumi', 'Bugiri', 'Kaliro'],
  'Northern': ['Gulu', 'Lira', 'Arua', 'Moroto', 'Kitgum', 'Nebbi', 'Apac', 'Kotido', 'Adjumani', 'Yumbe'],
  'Western': ['Mbarara', 'Kabale', 'Fort Portal', 'Kasese', 'Hoima', 'Bushenyi', 'Ibanda', 'Masindi', 'Ntungamo', 'Rukungiri']
};

const EXAM_TYPES = ['BOT', 'MOT', 'EOT', 'MOCKS'];

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    logo_base64: null as string | null,
    website: '',
    email: '',
    phone: '',
    naming_convention: 'Full Name' as 'Full Name' | 'Split Names',
    street: '',
    region: '',
    district: '',
    composition: 'Mixed' as 'Mixed' | 'Single-Sex',
    gender_focus: 'Mixed' as 'Mixed' | 'Male' | 'Female',
    residence: 'Mixed' as 'Day Only' | 'Boarding Only' | 'Mixed',
    offered_levels: [] as string[],
    uses_houses: false,
    houses: [] as { name: string, short: string }[],
    modules: {
      academic: true,
      attendance: false,
      discipline: false,
      welfare: false,
      financial: false,
      inventory: false,
      id_cards: true,
    },
    exam_types: ['BOT', 'MOT', 'EOT'],
    selected_subjects: [] as { 
      subject_code: string, 
      name: string, 
      papers: string[], 
      short_form: string,
      level: string 
    }[],
    personnel: {
      'Headteacher': { name: '', email: '', phone: '' },
      'System Administrator': { name: '', email: '', phone: '' },
      'Academics Registrar': { name: '', email: '', phone: '' },
      'Discipline Master': { name: '', email: '', phone: '' },
      'School Nurse': { name: '', email: '', phone: '' },
      'School Bursar': { name: '', email: '', phone: '' },
      'Store Manager': { name: '', email: '', phone: '' },
    } as Record<string, { name: string, email: string, phone: string }>
  });

  const [subjectBank, setSubjectBank] = useState<MasterSubject[]>([]);

  useEffect(() => {
    if (step === 5) fetchSubjects();
  }, [step]);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data } = await supabase.from('master_subject_bank').select('*');
    if (data) setSubjectBank(data);
    setLoading(false);
  };

  const filteredSubjects = useMemo(() => {
    return subjectBank.filter(s => formData.offered_levels.includes(s.level));
  }, [subjectBank, formData.offered_levels]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidStep1 = formData.name && validateEmail(formData.email) && formData.phone.length === 9;
  const isValidStep2 = formData.street && formData.region && formData.district;
  const isValidStep3 = formData.offered_levels.length > 0 && (!formData.uses_houses || formData.houses.length > 0);
  const isValidStep6 = formData.personnel['Headteacher'].name && validateEmail(formData.personnel['Headteacher'].email) &&
                        formData.personnel['System Administrator'].name && validateEmail(formData.personnel['System Administrator'].email);

  const checkSchoolExists = async () => {
    const { data } = await supabase
      .from('schools')
      .select('id')
      .ilike('name', formData.name.trim())
      .maybeSingle();
    return !!data;
  };

  const handleNext = async () => {
    setError(null);
    if (step === 1) {
      setLoading(true);
      const exists = await checkSchoolExists();
      setLoading(false);
      if (exists) {
        setError("This institution name is already registered in the system.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      alert("Logo too large. Please upload an image under 100KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
      setFormData({ ...formData, logo_base64: evt.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  const toggleLevel = (lvl: string) => {
    const current = formData.offered_levels;
    const next = current.includes(lvl) ? current.filter(l => l !== lvl) : [...current, lvl];
    setFormData({ ...formData, offered_levels: next });
  };

  const toggleSubject = (s: MasterSubject) => {
    const exists = formData.selected_subjects.find(x => x.subject_code === s.code);
    if (exists) {
      setFormData({
        ...formData,
        selected_subjects: formData.selected_subjects.filter(x => x.subject_code !== s.code)
      });
    } else {
      setFormData({
        ...formData,
        selected_subjects: [...formData.selected_subjects, {
          subject_code: s.code,
          name: s.name,
          papers: s.papers || [],
          short_form: s.short_forms?.[0] || s.code,
          level: s.level
        }]
      });
    }
  };

  const activePersonnelRoles = useMemo(() => {
    const roles = ['Headteacher', 'System Administrator'];
    if (formData.modules.academic) roles.push('Academics Registrar');
    if (formData.modules.discipline) roles.push('Discipline Master');
    if (formData.modules.welfare) roles.push('School Nurse');
    if (formData.modules.financial) roles.push('School Bursar');
    if (formData.modules.inventory) roles.push('Store Manager');
    return roles;
  }, [formData.modules]);

  // MANDATORY SEQUENTIAL PIPELINE
  const handleFinalize = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage('Syncing School Data...');

    try {
      const schoolID = `SCH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const downloadLink = 'https://sms-portal.gov/downloads/SMS_Admin_Console_v4_Setup.exe';

      // STEP 1: COMMIT PRIMARY SCHOOL RECORD
      const { error: schoolError } = await supabase.from('schools').insert([{
        id: schoolID,
        name: formData.name,
        logo_url: formData.logo_base64,
        email: formData.email,
        phone: `+256${formData.phone}`,
        website: formData.website,
        region: formData.region,
        district: formData.district,
        street: formData.street,
        infrastructure_type: formData.composition,
        residence_type: formData.residence,
        offered_levels: formData.offered_levels,
        modules: formData.modules,
        status: 'Active',
        settings: {
          gender_focus: formData.gender_focus,
          naming_convention: formData.naming_convention,
          uses_houses: formData.uses_houses,
          exam_types: formData.exam_types
        }
      }]);
      
      if (schoolError) {
        console.error("Database write blocked:", schoolError);
        throw new Error(`Registry Lock Denied: ${schoolError.message}`);
      }

      // Commit Houses & Subjects (Secondary Data)
      if (formData.uses_houses && formData.houses.length > 0) {
        await supabase.from('houses').insert(
          formData.houses.map(h => ({ school_id: schoolID, name: h.name, short_form: h.short }))
        );
      }
      if (formData.selected_subjects.length > 0) {
        await supabase.from('school_subjects').insert(
          formData.selected_subjects.map(s => ({
            school_id: schoolID,
            subject_code: s.subject_code,
            name: s.name,
            papers: s.papers,
            short_form: s.short_form,
            level: s.level
          }))
        );
      }

      // STEP 2 & 3: PERSONNEL LOOP (SEQUENTIAL DISPATCH)
      const personnelToCreate = activePersonnelRoles.map(role => ({
        role,
        ...formData.personnel[role]
      }));

      for (const p of personnelToCreate) {
        if (!p.email || !p.name) continue;

        setStatusMessage(`Notifying ${p.role}...`);
        
        // Generate Secure 8-character password
        const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let password = "";
        for(let i=0; i<8; i++) password += charset.charAt(Math.floor(Math.random() * charset.length));

        // Create Auth Account
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: p.email.toLowerCase(),
          password: password,
          options: { data: { full_name: p.name, role: p.role, school_id: schoolID } }
        });

        let userId = authData.user?.id;

        // Recovery if existing
        if (authErr && authErr.message.toLowerCase().includes('already registered')) {
          const { data: existing } = await supabase.from('teachers_registry').select('id').eq('email', p.email.toLowerCase()).maybeSingle();
          userId = existing?.id;
        }

        if (userId) {
          // Commit to Registry
          await supabase.from('teachers_registry').upsert([{
            id: userId,
            school_id: schoolID,
            full_name: p.name.toUpperCase(),
            email: p.email.toLowerCase(),
            phone_numbers: [`+256${p.phone}`],
            category: 'Non-Teaching',
            role: p.role,
            needs_password_reset: true,
            status: 'active'
          }]);

          // IMMEDIATE DISPATCH: template_ysfduyo
          try {
            await fetch('https://api.emailjs.com/api/v1.0/email/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                service_id: 'service_s2bvvh2',
                template_id: 'template_ysfduyo',
                user_id: 'psRo0pR25zPBvGgeD',
                template_params: {
                  admin_name: p.name,
                  assigned_role: p.role,
                  school_name: formData.name,
                  school_admin_email: p.email.toLowerCase(),
                  generated_password: password,
                  download_link: downloadLink
                }
              })
            });
          } catch (mailErr) {
            console.warn(`Dispatch failed for ${p.role}, continuing pipeline...`);
          }
        }
      }

      setStatusMessage('Provisioning Complete.');
      alert(`${formData.name} is now locked in the National Registry. Administrators notified.`);
      navigate('/institutional-registry');

    } catch (err: any) {
      setError(err.message);
      console.error("FATAL HANDSHAKE ERROR:", err);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 relative">
      {/* GLOBAL ERROR HUD */}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[500] w-full max-w-xl animate-in slide-in-from-bottom-10">
          <div className="bg-red-600 text-white p-6 rounded-[2rem] shadow-2xl flex items-start gap-5 border-4 border-white">
            <ShieldAlert className="w-10 h-10 shrink-0" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Security Protocol Violation</p>
              <p className="text-sm font-bold uppercase mt-1 leading-tight">{error}</p>
              <p className="text-[9px] font-black uppercase mt-3 text-red-100 bg-red-700/50 px-3 py-1 rounded-lg w-fit">Registry write failed. Contact Root Command.</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-red-500 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden min-h-[700px] flex flex-col">
        {/* Breadcrumb Steps */}
        <div className="bg-slate-50 px-12 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="flex items-center gap-2 shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black ${step >= i ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}>
                  {step > i ? <ShieldCheck className="w-4 h-4" /> : i}
                </div>
                {i < 7 && <div className={`h-1 w-4 rounded-full ${step > i ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>}
              </div>
            ))}
          </div>
          {statusMessage && <div className="bg-indigo-50 text-indigo-600 px-5 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 animate-pulse border border-indigo-100"><Loader2 className="w-4 h-4 animate-spin" /> {statusMessage}</div>}
        </div>

        <div className="p-12 flex-1 overflow-y-auto no-scrollbar">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Building2 className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Institutional Identity</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Official naming and contact configuration</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official School Name</label>
                    <input 
                      required
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} 
                      placeholder="ENTER LEGAL NAME..." 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold text-sm outline-none transition-all shadow-inner uppercase" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official School Email</label>
                    <input 
                      required
                      type="email"
                      value={formData.email} 
                      onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })} 
                      placeholder="admin@school.ug" 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold text-sm outline-none transition-all shadow-inner" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Telephone</label>
                    <div className="flex bg-slate-50 border-2 border-transparent focus-within:border-indigo-600 rounded-2xl overflow-hidden transition-all shadow-inner">
                      <span className="bg-slate-200 px-5 flex items-center text-[10px] font-black text-slate-500 border-r border-slate-300">+256</span>
                      <input 
                        required
                        maxLength={9}
                        value={formData.phone} 
                        onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })} 
                        placeholder="7XXXXXXXX" 
                        className="w-full px-6 py-4 bg-transparent font-bold text-sm outline-none" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Logo (Under 100KB)</label>
                    <div className="p-1 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 bg-slate-50 hover:bg-white transition-all min-h-[160px] relative group">
                      {formData.logo_base64 ? (
                        <div className="relative w-full h-full p-4 flex items-center justify-center">
                          <img src={formData.logo_base64} className="max-h-[120px] object-contain" alt="Logo" />
                          <button onClick={() => setFormData({ ...formData, logo_base64: null })} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3"/></button>
                        </div>
                      ) : (
                        <>
                          <div className="p-4 bg-white rounded-full shadow-sm text-slate-300"><Camera className="w-8 h-8"/></div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Click to browse local files</p>
                          <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Website</label>
                    <div className="relative">
                      <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        value={formData.website} 
                        onChange={e => setFormData({ ...formData, website: e.target.value })} 
                        placeholder="www.school.ug" 
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold text-sm outline-none transition-all shadow-inner" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: GEOGRAPHY */}
          {step === 2 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xl"><MapPin className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Geography & Location</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Physical mapping and regional designation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Region</label>
                    <select 
                      required
                      value={formData.region} 
                      onChange={e => setFormData({ ...formData, region: e.target.value, district: '' })} 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-xs uppercase outline-none shadow-inner"
                    >
                      <option value="">-- SELECT REGION --</option>
                      {Object.keys(UGANDA_GEOGRAPHY).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">District</label>
                    <div className="relative">
                      <select 
                        disabled={!formData.region}
                        value={formData.district} 
                        onChange={e => setFormData({ ...formData, district: e.target.value })} 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-xs uppercase outline-none shadow-inner disabled:opacity-30 appearance-none"
                      >
                        <option value="">{formData.region ? '-- SELECT DISTRICT --' : '-- SELECT REGION FIRST --'}</option>
                        {formData.region && UGANDA_GEOGRAPHY[formData.region].map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <Search className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Street Address / Landmark</label>
                    <textarea 
                      required
                      value={formData.street} 
                      onChange={e => setFormData({ ...formData, street: e.target.value.toUpperCase() })} 
                      placeholder="ENTER PHYSICAL ADDRESS..." 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-bold text-sm outline-none transition-all shadow-inner h-[140px] resize-none uppercase" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: INFRASTRUCTURE & HOUSING */}
          {step === 3 && (
            <div className="space-y-10 animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xl"><Home className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Infrastructure & Housing</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Academic levels and residential settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Composition</label>
                      <select 
                        value={formData.composition} 
                        onChange={e => setFormData({ ...formData, composition: e.target.value as any, gender_focus: e.target.value === 'Mixed' ? 'Mixed' : formData.gender_focus })} 
                        className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-[11px] uppercase outline-none shadow-inner"
                      >
                        <option value="Mixed">Mixed Gender</option>
                        <option value="Single-Sex">Single-Sex</option>
                      </select>
                    </div>
                    {formData.composition === 'Single-Sex' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gender Target</label>
                        <select 
                          value={formData.gender_focus} 
                          onChange={e => setFormData({ ...formData, gender_focus: e.target.value as any })} 
                          className="w-full px-6 py-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl font-black text-[11px] uppercase outline-none"
                        >
                          <option value="Male">Male Only</option>
                          <option value="Female">Female Only</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Residence Mode</label>
                    <select 
                      value={formData.residence} 
                      onChange={e => setFormData({ ...formData, residence: e.target.value as any })} 
                      className="w-full px-6 py-4 bg-slate-50 rounded-2xl font-black text-[11px] uppercase outline-none shadow-inner"
                    >
                      <option value="Mixed">Day & Boarding</option>
                      <option value="Day Only">Day Only</option>
                      <option value="Boarding Only">Boarding Only</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><Layout className="w-4 h-4 text-indigo-600" /> Academic Levels</h4>
                    <div className="flex flex-wrap gap-2">
                      {['Primary', 'O-Level', 'A-Level'].map(lvl => (
                        <button 
                          key={lvl} 
                          onClick={() => toggleLevel(lvl)} 
                          className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${formData.offered_levels.includes(lvl) ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                        >{lvl}</button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Houses Registry</h4>
                      <button 
                        onClick={() => setFormData({ ...formData, uses_houses: !formData.uses_houses })} 
                        className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all ${formData.uses_houses ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}
                      >
                        <span className="text-[9px] font-black uppercase">{formData.uses_houses ? 'ENFORCED' : 'DISABLED'}</span>
                        {formData.uses_houses ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                    </div>

                    {formData.uses_houses && (
                      <div className="space-y-3 animate-in fade-in">
                        <div className="flex gap-2">
                          <input id="new-house-name" placeholder="FULL NAME (E.G. MANDELA)" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-indigo-600" />
                          <input id="new-house-short" placeholder="SHORT (E.G. M)" className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold uppercase outline-none focus:border-indigo-600 text-center" />
                          <button 
                            onClick={() => {
                              const n = (document.getElementById('new-house-name') as HTMLInputElement).value;
                              const s = (document.getElementById('new-house-short') as HTMLInputElement).value;
                              if (n && s) {
                                setFormData({ ...formData, houses: [...formData.houses, { name: n.toUpperCase(), short: s.toUpperCase() }] });
                                (document.getElementById('new-house-name') as HTMLInputElement).value = '';
                                (document.getElementById('new-house-short') as HTMLInputElement).value = '';
                              }
                            }}
                            className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-md"
                          ><Plus className="w-4 h-4"/></button>
                        </div>
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden max-h-[160px] overflow-y-auto no-scrollbar">
                           <table className="w-full text-left table-dense">
                             <tbody className="divide-y divide-slate-50">
                               {formData.houses.map((h, i) => (
                                 <tr key={i} className="group h-[35px]">
                                   <td className="px-4 py-1 text-[10px] font-black text-slate-800">{h.name}</td>
                                   <td className="px-4 py-1 text-[10px] font-black text-indigo-600 text-center w-20">{h.short}</td>
                                   <td className="px-4 py-1 text-right">
                                      <button onClick={() => setFormData({...formData, houses: formData.houses.filter((_, idx) => idx !== i)})} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-3.5 h-3.5"/></button>
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: MODULE ACTIVATION */}
          {step === 4 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-indigo-950 text-white rounded-2xl shadow-xl shadow-indigo-100"><Briefcase className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Activation Matrix</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized service node selection</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'academic', label: 'Academic & Grades', icon: BookOpen },
                    { id: 'attendance', label: 'Student Attendance', icon: CheckCircle2 },
                    { id: 'discipline', label: 'Discipline Registry', icon: ShieldCheck },
                    { id: 'welfare', label: 'Welfare / Sickbay', icon: Heart },
                    { id: 'financial', label: 'Financial / Bursary', icon: Banknote },
                    { id: 'inventory', label: 'Inventory / Store', icon: Briefcase },
                    { id: 'id_cards', label: 'Identity Management', icon: UserCircle },
                  ].map(mod => (
                    <button 
                      key={mod.id} 
                      onClick={() => setFormData({ ...formData, modules: { ...formData.modules, [mod.id]: !formData.modules[mod.id as keyof typeof formData.modules] }})} 
                      className={`p-6 rounded-[1.5rem] border-2 flex items-center justify-between transition-all group ${formData.modules[mod.id as keyof typeof formData.modules] ? 'bg-white border-indigo-600 shadow-xl text-indigo-950 scale-[1.02]' : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60 grayscale'}`}
                    >
                       <div className="flex items-center gap-4">
                          <mod.icon className={`w-6 h-6 ${formData.modules[mod.id as keyof typeof formData.modules] ? 'text-indigo-600' : ''}`} />
                          <span className="text-[11px] font-black uppercase tracking-widest">{mod.label}</span>
                       </div>
                       {formData.modules[mod.id as keyof typeof formData.modules] ? <ToggleRight className="w-8 h-8 text-indigo-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                    </button>
                  ))}
                </div>

                {formData.modules.academic && (
                  <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 space-y-6 animate-in zoom-in-95">
                    <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                      <Stamp className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Global Exam Matrix</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {EXAM_TYPES.map(ex => (
                        <label key={ex} className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${formData.exam_types.includes(ex) ? 'bg-white border-indigo-600 shadow-md' : 'bg-transparent border-slate-100 opacity-40'}`}>
                          <input 
                            type="checkbox" 
                            checked={formData.exam_types.includes(ex)} 
                            onChange={() => {
                              const next = formData.exam_types.includes(ex) ? formData.exam_types.filter(x => x !== ex) : [...formData.exam_types, ex];
                              setFormData({ ...formData, exam_types: next });
                            }} 
                            className="hidden" 
                          />
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${formData.exam_types.includes(ex) ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                             {formData.exam_types.includes(ex) && <ShieldCheck className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">{ex} Assessment</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: CURRICULUM */}
          {step === 5 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><BookOpen className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Curriculum Configuration</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Filtering {filteredSubjects.length} institutional subjects based on academic breadth</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map(subj => {
                  const selected = formData.selected_subjects.find(s => s.subject_code === subj.code);
                  return (
                    <div key={subj.code} className={`p-6 rounded-[2.5rem] border-2 transition-all group ${selected ? 'bg-white border-indigo-600 shadow-xl' : 'bg-slate-50/50 border-transparent grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-4">
                         <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}><BookOpen className="w-4 h-4" /></div>
                            <span className="text-[11px] font-black uppercase tracking-tight">{subj.code}</span>
                         </div>
                         <button onClick={() => toggleSubject(subj)} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${selected ? 'bg-[#0F172A] text-[#FACC15]' : 'bg-slate-200 text-slate-500'}`}>
                            {selected ? 'ENROLLED' : 'ADD SUBJECT'}
                         </button>
                      </div>
                      <h4 className="text-[12px] font-black text-slate-800 uppercase mb-6 h-8 line-clamp-2">{subj.name}</h4>
                      
                      {selected && (
                        <div className="space-y-6 animate-in zoom-in-95">
                           <div className="space-y-2">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <ChevronRight className="w-3 h-3" /> Select Papers Offered
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                 {subj.papers?.map(paper => (
                                   <label key={paper} className={`px-3 py-1 rounded-lg text-[9px] font-black cursor-pointer transition-all border ${selected.papers.includes(paper) ? 'bg-indigo-50 border-indigo-600 text-indigo-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                                      <input 
                                        type="checkbox" 
                                        checked={selected.papers.includes(paper)} 
                                        className="hidden" 
                                        onChange={() => {
                                          const next = selected.papers.includes(paper) ? selected.papers.filter(p => p !== paper) : [...selected.papers, paper];
                                          setFormData({ ...formData, selected_subjects: formData.selected_subjects.map(s => s.subject_code === subj.code ? { ...s, papers: next } : s) });
                                        }}
                                      />
                                      {paper}
                                   </label>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Tag className="w-3 h-3" /> System Label
                              </label>
                              <select 
                                value={selected.short_form} 
                                onChange={e => setFormData({ ...formData, selected_subjects: formData.selected_subjects.map(s => s.subject_code === subj.code ? { ...s, short_form: e.target.value } : s) })}
                                className="w-full bg-slate-50 border-none rounded-xl px-3 py-1.5 text-[9px] font-black uppercase outline-none focus:ring-1 focus:ring-indigo-600"
                              >
                                {subj.short_forms?.map(f => <option key={f} value={f}>{f}</option>)}
                              </select>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 6: ADMINISTRATIVE STAFFING */}
          {step === 6 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-[#0F172A] text-white rounded-2xl shadow-xl"><UserCircle className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Governance Personnel</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Credentials will be generated for the following administrative nodes.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[500px] overflow-y-auto no-scrollbar pr-4">
                {activePersonnelRoles.map(role => (
                  <div key={role} className="p-8 bg-white rounded-[3rem] border border-slate-100 shadow-sm space-y-6 group hover:border-indigo-600 transition-all">
                     <div className="flex items-center justify-between border-b border-slate-50 pb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><ShieldCheck className="w-4 h-4" /></div>
                           <h4 className="text-[12px] font-black uppercase text-slate-800 tracking-tight">{role}</h4>
                        </div>
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Mandatory Node</span>
                     </div>
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                           <input 
                            required
                            value={formData.personnel[role]?.name} 
                            onChange={e => setFormData({ ...formData, personnel: { ...formData.personnel, [role]: { ...formData.personnel[role], name: e.target.value.toUpperCase() } } })} 
                            className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner" 
                            placeholder="NAME ON NATIONAL ID..."
                           />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
                              <input 
                                required
                                type="email"
                                value={formData.personnel[role]?.email} 
                                onChange={e => setFormData({ ...formData, personnel: { ...formData.personnel, [role]: { ...formData.personnel[role], email: e.target.value.toLowerCase() } } })} 
                                className="w-full px-5 py-3 bg-slate-50 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner" 
                                placeholder="EMAIL ADDRESS..."
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Line</label>
                              <div className="flex bg-slate-50 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-600 shadow-inner">
                                 <span className="bg-slate-200 px-3 flex items-center text-[9px] font-black text-slate-500">+256</span>
                                 <input 
                                  required
                                  maxLength={9}
                                  value={formData.personnel[role]?.phone} 
                                  onChange={e => setFormData({ ...formData, personnel: { ...formData.personnel, [role]: { ...formData.personnel[role], phone: e.target.value.replace(/\D/g, '') } } })} 
                                  className="w-full px-3 py-3 bg-transparent font-bold text-xs outline-none" 
                                  placeholder="7XXXXXXXX"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 7: INSTITUTIONAL SUMMARY */}
          {step === 7 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><FileSearch className="w-6 h-6" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Final Registry Review</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Verify all parameters before global provisioning</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* DENSE SUMMARY TABLE */}
                <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-inner">
                   <table className="w-full text-left table-dense">
                      <thead>
                         <tr className="bg-white border-b border-slate-200">
                            <th colSpan={2} className="px-8 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest">A. Core Institutional Node</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                         <tr><td className="px-8 py-2 font-black text-slate-400 w-1/3 uppercase">Institutional Name</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.name}</td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Contact Node</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.email} • +256 {formData.phone}</td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Geography</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.region} • {formData.district}</td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Address</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.street}</td></tr>
                      </tbody>
                      <thead>
                         <tr className="bg-white border-b border-slate-200">
                            <th colSpan={2} className="px-8 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest">B. Academic & Operations</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Composition</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.composition} ({formData.gender_focus})</td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Residency Mode</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.residence}</td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Levels Offered</td><td className="px-8 py-2 font-bold text-indigo-600 uppercase">{formData.offered_levels.join(', ')}</td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Module Payload</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">
                            {Object.entries(formData.modules).filter(([_,v]) => v).map(([k]) => k.replace('_',' ')).join(', ')}
                         </td></tr>
                         <tr><td className="px-8 py-2 font-black text-slate-400 uppercase">Subject Registry</td><td className="px-8 py-2 font-bold text-slate-800 uppercase">{formData.selected_subjects.length} Subjects Linked</td></tr>
                      </tbody>
                      <thead>
                         <tr className="bg-white border-b border-slate-200">
                            <th colSpan={2} className="px-8 py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest">C. Governance Personnel</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                         {activePersonnelRoles.map(role => (
                           <tr key={role}>
                             <td className="px-8 py-2 font-black text-slate-400 uppercase">{role}</td>
                             <td className="px-8 py-2 font-bold text-slate-800 uppercase">
                               {formData.personnel[role].name} • <span className="lowercase text-slate-400">{formData.personnel[role].email}</span>
                             </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-200 flex items-center gap-4">
                   <ShieldCheck className="w-8 h-8 text-emerald-600" />
                   <div>
                      <p className="text-[11px] font-black text-emerald-900 uppercase">Pre-Provisioning Clear</p>
                      <p className="text-[10px] text-emerald-700 font-bold uppercase mt-0.5 tracking-tight leading-relaxed">
                        Registry handshake protocol will execute sequentially. All personnel will receive encrypted keys via the secure EmailJS bridge immediately after institutional lock.
                      </p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="bg-white px-12 py-8 border-t border-slate-100 flex justify-between items-center shrink-0">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="px-10 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-200 transition-all">
               <ChevronLeft className="w-4 h-4" /> PREVIOUS
            </button>
          ) : (
            <button onClick={() => navigate('/dashboard')} className="px-10 py-4 text-slate-300 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:text-red-500 transition-all">
               <X className="w-4 h-4" /> CANCEL ONBOARDING
            </button>
          )}

          {step < 7 ? (
            <button 
              disabled={loading || (step === 1 && !isValidStep1) || (step === 2 && !isValidStep2) || (step === 3 && !isValidStep3) || (step === 6 && !isValidStep6)}
              onClick={handleNext} 
              className="px-16 py-4 bg-[#0F172A] text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 hover:bg-black active:scale-95 transition-all disabled:opacity-30"
            >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>CONTINUE PROCESS <ChevronRight className="w-4 h-4" /></>}
            </button>
          ) : (
            <button 
              disabled={loading}
              onClick={handleFinalize} 
              className="px-20 py-5 bg-indigo-600 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-[0.2em] shadow-[0_0_50px_-10px_rgba(79,70,229,0.5)] flex items-center gap-4 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
            >
               {loading ? (
                 <>
                   <Loader2 className="w-6 h-6 animate-spin" />
                   <div className="text-left">
                      <p className="text-[12px] leading-none uppercase font-black">HANDSHAKE IN PROGRESS...</p>
                      <p className="text-[8px] opacity-60 mt-1 uppercase tracking-widest font-black">{statusMessage}</p>
                   </div>
                 </>
               ) : (
                 <>
                   <ShieldCheck className="w-6 h-6 text-[#FACC15]" />
                   FINISH & ACTIVATE INSTITUTION
                 </>
               )}
            </button>
          )}
        </div>
      </div>
      
      {/* Visual Notice */}
      <div className="mt-8 flex justify-center">
         <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] flex items-center gap-4">
            <span className="w-12 h-px bg-slate-200"></span>
            UGANDA SCHOOL OS • MASTER PROVISIONING PROTOCOL v1.2.0
            <span className="w-12 h-px bg-slate-200"></span>
         </p>
      </div>
    </div>
  );
};

export default Onboarding;