import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, ChevronLeft, LayoutDashboard, Users, UserCircle, 
  Banknote, Palette, Loader2, ShieldCheck, ShieldAlert, Plus, Save, 
  CheckCircle2, UserPlus, Trash2, Trophy, Briefcase, Activity, X,
  Award, BookOpen, Home, Mail, Phone, ToggleLeft, ToggleRight, Camera
} from 'lucide-react';
import { supabase } from '../supabase';
import { School, TeacherRegistry, MasterSubject } from '../types';
import DesignLab from './DesignLab';
import StudentList from './StudentList';
import Activities from './Activities';
import Leadership from './Leadership';
import BiometricEngine from './BiometricEngine';
import SchoolTeachers from './SchoolTeachers';

type ActiveTab = 'DASHBOARD' | 'REGISTRY' | 'PERSONNEL' | 'CLUBS' | 'LEADERSHIP' | 'BIOMETRICS' | 'DESIGN';

const tabs = [
  { id: 'DASHBOARD', label: 'Matrix', icon: LayoutDashboard },
  { id: 'REGISTRY', label: 'Students', icon: Users },
  { id: 'PERSONNEL', label: 'Staff', icon: Briefcase },
  { id: 'CLUBS', label: 'Clubs', icon: Trophy },
  { id: 'LEADERSHIP', label: 'Leaders', icon: ShieldCheck },
  { id: 'BIOMETRICS', label: 'Photos & Signatures', icon: Camera },
  { id: 'DESIGN', label: 'Design', icon: Palette },
];

const SchoolProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>((searchParams.get('tab') as ActiveTab) || 'DASHBOARD');
  
  const [school, setSchool] = useState<School | null>(null);
  const [staff, setStaff] = useState<TeacherRegistry[]>([]);
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (id) fetchAllData();
  }, [id]);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [
        { data: schoolData },
        { data: staffList },
        { data: subjectsList }
      ] = await Promise.all([
        supabase.from('schools').select('*').eq('id', id).single(),
        supabase.from('teachers_registry').select('*').eq('school_id', id).order('full_name'),
        supabase.from('master_subject_bank').select('*').order('name')
      ]);

      if (schoolData) setSchool(schoolData);
      setStaff(staffList || []);
      setSubjects(subjectsList || []);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!school || !id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('schools').update(school).eq('id', id);
      if (error) throw error;
      setHasChanges(false);
      alert('Institutional record synchronized.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-10">
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/institutional-registry')} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-tight">{school?.name}</h1>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Node ID: {school?.id} • {school?.district}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${school?.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>Status: {school?.status}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-slate-200/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar border border-slate-200 shadow-inner">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-3 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-[#1E1B4B] text-[#FACC15] shadow-lg scale-105' : 'text-slate-500 hover:text-indigo-900'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'DASHBOARD' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-2">
             <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
                <div className="flex items-center gap-3">
                   <LayoutDashboard className="w-5 h-5 text-indigo-600" />
                   <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Institutional Matrix</h3>
                </div>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Official Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input value={school?.email || ''} onChange={e => { setSchool({...school!, email: e.target.value}); setHasChanges(true); }} className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-bold text-xs outline-none transition-all" />
                      </div>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telephone</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input value={school?.phone || ''} onChange={e => { setSchool({...school!, phone: e.target.value}); setHasChanges(true); }} className="w-full pl-12 pr-5 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-bold text-xs outline-none transition-all" />
                      </div>
                   </div>
                   <div className="space-y-1.5 col-span-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Street Address</label>
                      <input value={school?.street || ''} onChange={e => { setSchool({...school!, street: e.target.value.toUpperCase()}); setHasChanges(true); }} className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-bold text-xs outline-none uppercase transition-all" />
                   </div>
                </div>
             </div>
             <div className="lg:col-span-4 bg-[#1E1B4B] p-10 rounded-[3rem] space-y-8 shadow-2xl border border-indigo-900 text-white">
                <h3 className="text-[10px] font-black text-[#FACC15] uppercase tracking-widest flex items-center gap-2"><Award className="w-4 h-4" /> System Activation</h3>
                <div className="space-y-3">
                   {Object.entries(school?.modules || {}).map(([key, val]) => (
                     <button key={key} onClick={() => { setSchool({...school!, modules: {...school!.modules, [key]: !val}}); setHasChanges(true); }} className={`w-full px-6 py-4 rounded-2xl border flex items-center justify-between transition-all ${val ? 'bg-indigo-900/50 border-indigo-500 text-[#FACC15]' : 'bg-transparent border-indigo-800/30 text-indigo-400 opacity-40'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest">{key.replace('_', ' ')}</span>
                        {val ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                     </button>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'REGISTRY' && <StudentList schoolId={id!} />}
        {activeTab === 'CLUBS' && <Activities schoolId={id!} />}
        {activeTab === 'LEADERSHIP' && <Leadership schoolId={id!} />}
        {activeTab === 'DESIGN' && <DesignLab schoolId={id!} />}
        {activeTab === 'BIOMETRICS' && <BiometricEngine schoolId={id!} />}
        {activeTab === 'PERSONNEL' && (
          <SchoolTeachers 
            schoolId={id!} 
            staff={staff} 
            subjects={subjects} 
            school={school}
            onRefresh={fetchAllData}
          />
        )}
      </div>

      {hasChanges && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-[#1E1B4B] text-white p-5 px-12 rounded-full shadow-2xl flex items-center gap-10 animate-in slide-in-from-bottom-10 ring-4 ring-indigo-500/20">
          <button onClick={handleSave} disabled={saving} className="bg-[#FACC15] text-indigo-950 px-12 py-3 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl flex items-center gap-3 hover:bg-yellow-500 transition-all active:scale-95">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} SYNC SCHOOL RECORD
          </button>
        </div>
      )}
    </div>
  );
};

export default SchoolProfile;