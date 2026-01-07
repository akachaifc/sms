import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Loader2, Fingerprint, BookOpen, 
  ShieldCheck, User as UserIcon,
  Users, Map, Save,
  ChevronLeft, Camera, UserCircle,
  Hash, Tag, Sparkles, Heart, Phone, Briefcase
} from 'lucide-react';
import { supabase } from '../supabase';
import { Student } from '../types';

const StudentProfile: React.FC = () => {
  const { id: schoolId, studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    setLoading(true);
    try {
      const [studRes, fieldsRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', studentId).single(),
        supabase.from('school_custom_fields').select('*').eq('school_id', schoolId)
      ]);
      if (studRes.data) setStudent({ ...studRes.data, custom_data: studRes.data.custom_data || {} });
      setCustomFields(fieldsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('students').update(student).eq('id', studentId);
      if (error) throw error;
      alert("Student Registry Node Synchronized.");
    } catch (err) {
      alert("Registry Sync Failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Accessing Institutional Vault...</p>
    </div>
  );
  if (!student) return <div className="p-20 text-center uppercase font-black opacity-20">Registry Entry Not Found</div>;

  const SectionHeader = ({ title, icon: Icon, colorClass = "bg-indigo-50 text-indigo-600" }: any) => (
    <div className="flex items-center gap-4 border-b border-slate-50 pb-6 mb-8">
      <div className={`p-3 rounded-2xl ${colorClass}`}><Icon className="w-6 h-6" /></div>
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">{title}</h3>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between px-10">
        <div className="flex items-center gap-8">
          <button onClick={() => navigate(`/schools/${schoolId}?tab=${searchParams.get('tab') || 'REGISTRY'}`)} className="p-3 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-[1.2rem] transition-all">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div className="flex items-center gap-6">
             <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 border-4 border-white shadow-2xl overflow-hidden relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {student.photo_url ? <img src={student.photo_url} className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8 text-indigo-200 m-auto mt-6" />}
                <div className="absolute inset-0 bg-indigo-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"><Camera className="w-6 h-6" /></div>
             </div>
             <input type="file" ref={photoInputRef} className="hidden" accept="image/*" />
             <div>
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none">{student.full_name}</h1>
                <div className="flex gap-4 mt-3">
                   <div className="px-3 py-1 bg-[#0F172A] text-[#FACC15] rounded-lg text-[9px] font-black uppercase border border-indigo-900 shadow-sm flex items-center gap-2"><Hash className="w-3 h-3" /> ADMIT: {student.admission_number || 'PENDING'}</div>
                   <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase border border-indigo-100 shadow-sm flex items-center gap-2"><Tag className="w-3 h-3" /> REG: {student.reg_no}</div>
                </div>
             </div>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-[#0F172A] text-white px-12 py-4 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-3 shadow-2xl active:scale-95 transition-all">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-[#FACC15]" />} SYNC MASTER RECORD
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-[#1E1B4B] p-10 rounded-[3.5rem] shadow-2xl border border-indigo-900 text-white space-y-8">
              <SectionHeader title="Official IDs" icon={Fingerprint} colorClass="bg-indigo-950/50 text-indigo-400" />
              <div className="space-y-6">
                 {[{ key: 'lin', label: 'Learner ID (LIN)' }, { key: 'emis_number', label: 'EMIS Reference' }].map(f => (
                    <div key={f.key} className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-indigo-300 tracking-widest ml-1">{f.label}</label>
                       <input value={String(student[f.key as keyof Student] || '')} onChange={e => setStudent({...student, [f.key]: e.target.value.toUpperCase()})} className="w-full bg-indigo-950/50 border border-indigo-800 rounded-2xl px-5 py-3 text-[12px] font-black text-white focus:border-indigo-400 outline-none transition-all" />
                    </div>
                 ))}
              </div>
           </div>
           <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm space-y-8">
              <SectionHeader title="Placement" icon={Map} />
              <div className="space-y-6">
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Residency Mode</label><select value={student.residence_status} onChange={e => setStudent({...student, residence_status: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-[11px] font-black uppercase outline-none"><option value="Day">Day Student</option><option value="Boarding">Boarding Section</option></select></div>
              </div>
           </div>
        </div>

        <div className="lg:col-span-9 space-y-8">
           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
              <SectionHeader title="Dual Guardian Matrix" icon={Users} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* GUARDIAN 1 */}
                <div className="space-y-8 p-8 bg-indigo-50/30 rounded-[3rem] border border-indigo-100/50 relative">
                   <div className="absolute -top-3 left-8 px-4 py-1 bg-indigo-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Primary Point of Contact (G1)</div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {[
                        { key: 'guardian_full_name', label: 'Full Legal Name', col: 'span 2' },
                        { key: 'guardian_relationship', label: 'Relationship' },
                        { key: 'guardian_id_no', label: 'National ID / NIN' },
                        { key: 'guardian_phone_primary', label: 'Primary Contact' },
                        { key: 'guardian_phone_secondary', label: 'Secondary Contact' },
                        { key: 'guardian_occupation', label: 'Occupation', col: 'span 2' }
                      ].map(f => (
                        <div key={f.key} className={`space-y-1.5 ${f.col === 'span 2' ? 'col-span-full' : ''}`}>
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                           <input value={String(student[f.key as keyof Student] || '')} onChange={e => setStudent({...student, [f.key]: e.target.value.toUpperCase()})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-600 shadow-sm transition-all" />
                        </div>
                      ))}
                   </div>
                </div>

                {/* GUARDIAN 2 */}
                <div className="space-y-8 p-8 bg-slate-50 rounded-[3rem] border border-slate-200 relative">
                   <div className="absolute -top-3 left-8 px-4 py-1 bg-slate-800 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">Secondary Guardian (G2)</div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      {[
                        { key: 'guardian2_full_name', label: 'Full Legal Name', col: 'span 2' },
                        { key: 'guardian2_relationship', label: 'Relationship' },
                        { key: 'guardian2_id_no', label: 'National ID / NIN' },
                        { key: 'guardian2_phone_primary', label: 'Primary Contact' },
                        { key: 'guardian2_phone_secondary', label: 'Secondary Contact' },
                        { key: 'guardian2_occupation', label: 'Occupation', col: 'span 2' }
                      ].map(f => (
                        <div key={f.key} className={`space-y-1.5 ${f.col === 'span 2' ? 'col-span-full' : ''}`}>
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                           <input value={String(student[f.key as keyof Student] || '')} onChange={e => setStudent({...student, [f.key]: e.target.value.toUpperCase()})} className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-xs text-slate-700 outline-none focus:border-indigo-600 shadow-sm transition-all" />
                        </div>
                      ))}
                   </div>
                </div>
              </div>
           </div>

           <div className="bg-white p-12 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
              <SectionHeader title="Academic History" icon={BookOpen} />
              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PLE Aggregates</label><input value={student.ple_info?.['total aggregates'] || ''} onChange={e => setStudent({...student, ple_info: { ...student.ple_info, 'total aggregates': e.target.value }})} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-black text-indigo-700 focus:ring-2 focus:ring-indigo-600 outline-none" /></div>
                 <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aspirations</label><textarea value={student.aspirations || ''} onChange={e => setStudent({...student, aspirations: e.target.value})} className="w-full bg-slate-50 border-none rounded-2xl p-6 text-[11px] font-medium text-slate-600 h-24 resize-none focus:ring-2 focus:ring-indigo-600 outline-none" /></div>
              </div>
           </div>

           <div className="bg-indigo-950 p-12 rounded-[4rem] shadow-2xl border border-indigo-900 space-y-10 text-white">
              <SectionHeader title="Health Audit" icon={Heart} colorClass="bg-red-900/50 text-red-400" />
              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-2"><label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Medical Notes</label><textarea value={student.medical_conditions || ''} onChange={e => setStudent({...student, medical_conditions: e.target.value})} className="w-full bg-indigo-900/40 border border-indigo-800 rounded-2xl p-6 text-xs font-bold text-white outline-none h-24 resize-none focus:border-indigo-400" /></div>
                 <div className="space-y-2"><label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Allergy Alerts</label><textarea value={student.allergies || ''} onChange={e => setStudent({...student, allergies: e.target.value})} className="w-full bg-indigo-900/40 border border-indigo-800 rounded-2xl p-6 text-xs font-bold text-white outline-none h-24 resize-none focus:border-indigo-400" /></div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
