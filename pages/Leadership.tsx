
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, UserPlus, Search, X, Loader2, 
  Award, Trash2, Calendar, FileUp, CheckCircle2, 
  ChevronRight, Users, User, ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabase';
import { Student } from '../types';
import ImportWizard, { ImportField } from '../components/ImportWizard';

const COMMON_POSITIONS = [
  "HEAD PREFECT", "ASST. HEAD PREFECT", "ACADEMIC PREFECT", "SPORTS PREFECT",
  "SANITARY PREFECT", "DHM / HOSTEL PREFECT", "LITURGY / CHAPEL PREFECT",
  "ENTERTAINMENT PREFECT", "TIME KEEPER", "SPEAKER", "ASST. SPEAKER",
  "HOUSE CAPTAIN", "MESS PREFECT", "CHIEF MONITOR", "CLASS MONITOR"
];

const Leadership: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);

  const [assignment, setAssignment] = useState({
    studentId: '',
    fullName: '',
    roleTitle: '',
    expiry: ''
  });

  useEffect(() => {
    fetchLeaders();
  }, [schoolId]);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('school_leadership')
        .select('*, students(full_name, class_id, stream_id)')
        .eq('school_id', schoolId)
        .order('term_expiry', { ascending: false });
      
      if (error) console.error("Leadership fetch failed:", error.message);
      setLeaders(data || []);
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async (val: string) => {
    setSearchTerm(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('id, full_name, class_id, stream_id')
      .eq('school_id', schoolId)
      .ilike('full_name', `%${val}%`)
      .limit(8);
    setSearchResults(data || []);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignment.studentId || !assignment.roleTitle) return;
    
    setSubmitting(true);
    try {
      const { error: leaderError } = await supabase.from('school_leadership').insert([{
        student_id: assignment.studentId,
        school_id: schoolId,
        role_name: assignment.roleTitle.toUpperCase(),
        term_expiry: assignment.expiry || null
      }]);
      if (leaderError) throw leaderError;

      const { error: studentError } = await supabase
        .from('students')
        .update({ 
          is_leader: true, 
          leadership_title: assignment.roleTitle.toUpperCase(),
          leadership_expiry: assignment.expiry || null
        })
        .eq('id', assignment.studentId);
      if (studentError) throw studentError;
      
      setShowAddModal(false);
      setAssignment({ studentId: '', fullName: '', roleTitle: '', expiry: '' });
      setSearchTerm('');
      fetchLeaders();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkComplete = async (data: any[]) => {
    setSubmitting(true);
    try {
      const today = new Date();
      const nextYear = new Date(today.getFullYear() + 1, 11, 31).toISOString().split('T')[0];
      
      for (const row of data) {
        const { data: s } = await supabase.from('students')
          .select('id')
          .eq('school_id', schoolId)
          .eq('full_name', String(row.name || '').toUpperCase())
          .maybeSingle();
        
        if (s) {
          const roles = String(row.roles || row.role || '').split(',').map(r => r.trim()).filter(Boolean);
          const expiry = row.expiry || nextYear;
          for (const r of roles) {
            await supabase.from('school_leadership').insert({
              student_id: s.id,
              school_id: schoolId,
              role_name: r.toUpperCase(),
              term_expiry: expiry
            });
          }
          if (roles.length > 0) {
            await supabase.from('students').update({
              is_leader: true,
              leadership_title: roles[0].toUpperCase(),
              leadership_expiry: expiry
            }).eq('id', s.id);
          }
        }
      }
      fetchLeaders();
      setShowImportWizard(false);
    } finally {
      setSubmitting(false);
    }
  };

  const importFields: ImportField[] = [
    { key: 'name', label: 'Full Name', required: true, description: 'Legal name in registry' },
    { key: 'roles', label: 'Roles', required: true, description: 'E.g. Head Prefect (Comma separated for multiple)' },
    { key: 'expiry', label: 'Term Expiry', required: false, description: 'YYYY-MM-DD (Optional)' }
  ];

  const handleDissolve = async (id: string, studentId: string) => {
    if(!confirm('Dissolve this leadership appointment?')) return;
    try {
      await supabase.from('school_leadership').delete().eq('id', id);
      const { data: otherRoles } = await supabase
        .from('school_leadership')
        .select('role_name')
        .eq('student_id', studentId);
      
      if (!otherRoles || otherRoles.length === 0) {
        await supabase.from('students')
          .update({ is_leader: false, leadership_title: null, leadership_expiry: null })
          .eq('id', studentId);
      } else {
        await supabase.from('students')
          .update({ leadership_title: otherRoles[0].role_name })
          .eq('id', studentId);
      }
      fetchLeaders();
    } catch (err) {
      console.error("Dissolution error:", err);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
           <div className="p-2 bg-[#1E1B4B] text-[#FACC15] rounded-xl shadow-lg"><ShieldCheck className="w-5 h-5" /></div>
           <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Prefectoral Body Console</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase">Government & Student Leadership Governance.</p>
           </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setShowImportWizard(true)} className="px-6 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 transition-all flex items-center gap-2">
             <FileUp className="w-4 h-4" /> Bulk Upload
           </button>
           <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all">
             <UserPlus className="w-4 h-4" /> Assign Leader
           </button>
        </div>
      </div>

      {showImportWizard && (
        <ImportWizard 
          title="Leadership Data Import"
          fields={importFields}
          onComplete={handleBulkComplete}
          onCancel={() => setShowImportWizard(false)}
        />
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
         <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                 <th className="px-8 py-3">Leader Identity</th>
                 <th className="px-8 py-3">Cabinet Role</th>
                 <th className="px-8 py-3 text-center">Class</th>
                 <th className="px-8 py-3">Term Expiry</th>
                 <th className="px-8 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
               {loading ? (
                 <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" /></td></tr>
               ) : leaders.map((l, i) => (
                 <tr key={i} className="hover:bg-slate-50 transition-colors h-[38px] group">
                    <td className="px-8">
                       <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600"><User className="w-3.5 h-3.5" /></div>
                          <span className="text-[11px] font-black text-slate-700 uppercase">{l.students?.full_name}</span>
                       </div>
                    </td>
                    <td className="px-8"><span className="text-[10px] font-black text-indigo-600 uppercase tracking-tight">{l.role_name}</span></td>
                    <td className="px-8 text-center"><span className="text-[10px] font-bold text-slate-500 uppercase">{l.students?.class_id}{l.students?.stream_id}</span></td>
                    <td className="px-8"><span className="text-[9px] font-black text-slate-400 uppercase">{l.term_expiry ? new Date(l.term_expiry).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '---'}</span></td>
                    <td className="px-8 text-right">
                       <button onClick={() => handleDissolve(l.id, l.student_id)} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    </td>
                 </tr>
               ))}
               {leaders.length === 0 && !loading && (
                 <tr><td colSpan={5} className="py-24 text-center opacity-20"><ShieldAlert className="w-16 h-16 mx-auto mb-4" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Governance Module Standby</p></td></tr>
               )}
            </tbody>
         </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] bg-[#1E1B4B]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
             <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Leadership Assignment</h3>
                <button onClick={() => setShowAddModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
             </div>
             <form onSubmit={handleAssign} className="p-10 space-y-6">
                <div className="space-y-1 relative">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Search Student Registry</label>
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        value={searchTerm} 
                        onChange={e => searchStudents(e.target.value)} 
                        className="w-full px-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-indigo-600" 
                        placeholder="Type student name..." 
                      />
                   </div>
                   {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2">
                         {searchResults.map(s => (
                           <button 
                             key={s.id} 
                             type="button"
                             onClick={() => { setAssignment({...assignment, studentId: s.id, fullName: s.full_name}); setSearchResults([]); setSearchTerm(s.full_name); }}
                             className="w-full p-4 text-left hover:bg-indigo-50 border-b border-slate-50 last:border-none flex justify-between items-center group"
                           >
                              <div>
                                <span className="text-[11px] font-black uppercase text-slate-700 block">{s.full_name}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{s.class_id}{s.stream_id} Registry</span>
                              </div>
                              <ChevronRight className="w-4 h-4 text-indigo-200 group-hover:text-indigo-600" />
                           </button>
                         ))}
                      </div>
                   )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Leadership Title</label>
                      <div className="relative">
                        <input required value={assignment.roleTitle} onChange={e => setAssignment({...assignment, roleTitle: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs outline-none" placeholder="SELECT OR TYPE TITLE..." list="positions-list" />
                        <datalist id="positions-list">
                          {COMMON_POSITIONS.map(p => <option key={p} value={p} />)}
                        </datalist>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Term Expiry Date</label>
                      <input type="date" value={assignment.expiry} onChange={e => setAssignment({...assignment, expiry: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none" />
                   </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                   <p className="text-[9px] text-amber-700 font-bold uppercase leading-relaxed">
                      Term Governance Active: Assigning this role will lock the position until the specified expiry is reached or manually dissolved.
                   </p>
                </div>

                <button 
                  disabled={submitting || !assignment.studentId || !assignment.roleTitle}
                  className="w-full py-4 bg-[#1E1B4B] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                   {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4 text-[#FACC15]" />} 
                   Activate Leadership
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leadership;
