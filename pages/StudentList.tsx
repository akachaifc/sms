import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Search, MoreVertical, X, Loader2, 
  Fingerprint, MapPin, BookOpen, Activity, 
  ShieldCheck, ShieldAlert, Award, Calendar, Home, User as UserIcon,
  Phone, Heart, Briefcase, Banknote, Map, Scale, FileSpreadsheet, Save,
  ChevronRight, Filter, ChevronDown, Contact, FileText, Star,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../supabase';
import { Student, School } from '../types';

interface StudentListProps {
  schoolId: string;
}

const StudentList: React.FC<StudentListProps> = ({ schoolId }) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    fetchStudents();
    fetchSchool();
  }, [schoolId]);

  const fetchSchool = async () => {
    const { data } = await supabase.from('schools').select('*').eq('id', schoolId).maybeSingle();
    if (data) setSchool(data);
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('students').select('*').eq('school_id', schoolId).order('full_name');
      setStudents(data || []);
      if (data) {
        const uniqueGroups = Array.from(new Set(data.map(s => `${s.class_id || ''}${s.stream_id || ''}`))) as string[];
        setExpandedGroups(uniqueGroups);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.reg_no && s.reg_no.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const grouped = useMemo(() => {
    const groups: Record<string, Student[]> = {};
    filtered.forEach(s => {
      const groupKey = `${s.class_id || ''}${s.stream_id || ''}` || 'UNVERIFIED CLASS';
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(s);
    });
    return groups;
  }, [filtered]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupKey) ? prev.filter(g => g !== groupKey) : [...prev, groupKey]
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm px-8">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search school registry..." 
            className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-indigo-600" 
          />
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
             <Filter className="w-4 h-4" /> Filter Views
           </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center gap-3">
             <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accessing Registry Records...</p>
          </div>
        ) : Object.keys(grouped).sort().map(groupKey => (
          <div key={groupKey} className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
             <button 
               onClick={() => toggleGroup(groupKey)}
               className="w-full px-8 py-5 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-all"
             >
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100">
                      <Contact className="w-4 h-4" />
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{groupKey} REGISTRY</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{grouped[groupKey].length} Verified Records</p>
                   </div>
                </div>
                {expandedGroups.includes(groupKey) ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
             </button>
             
             {expandedGroups.includes(groupKey) && (
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50/30">
                     <tr className="text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                       <th className="px-10 py-3">Student Identity</th>
                       <th className="px-10 py-3">Stream</th>
                       <th className="px-10 py-3">Registry Ref</th>
                       <th className="px-10 py-3">Status</th>
                       <th className="px-10 py-3 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {grouped[groupKey].map(s => (
                       <tr 
                        key={s.id} 
                        onClick={() => navigate(`/schools/${schoolId}/student/${s.id}?tab=REGISTRY`)} 
                        className="hover:bg-indigo-50/30 transition-all group cursor-pointer h-[50px]"
                       >
                         <td className="px-10">
                           <div className="flex items-center gap-4">
                             <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 shadow-sm overflow-hidden shrink-0 group-hover:scale-110 transition-transform relative">
                                {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" alt={s.full_name} /> : <UserIcon className="w-5 h-5" />}
                             </div>
                             <div>
                               <span className="text-[12px] font-black text-slate-800 uppercase block">{s.full_name}</span>
                               {s.is_leader && <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest">{s.leadership_title}</span>}
                             </div>
                           </div>
                         </td>
                         <td className="px-10">
                           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                             {s.stream_id || 'NONE'}
                           </span>
                         </td>
                         <td className="px-10"><span className="text-[11px] font-black text-slate-500">{s.reg_no || '---'}</span></td>
                         <td className="px-10">
                           <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${s.enrollment_status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400'}`}>
                             {s.enrollment_status || 'active'}
                           </span>
                         </td>
                         <td className="px-10 text-right">
                           <button onClick={(e) => e.stopPropagation()} className="p-2 hover:bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm border border-slate-100"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentList;