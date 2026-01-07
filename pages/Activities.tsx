import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, UserPlus, Search, X, Loader2, 
  CheckCircle2, FileUp, Users, ChevronRight, 
  Trash2, Filter, ShieldCheck, Mail, Building,
  UserCircle, Tag, ArrowRight, Activity as ActivityIcon,
  Shield, Check, User as UserIcon, FileSpreadsheet,
  AlertCircle, RefreshCw, Save, Database, Layout,
  Crosshair, UserCheck, Upload, ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabase';
import { TeacherRegistry, Student } from '../types';
import * as XLSX from 'xlsx';

interface SchoolActivity {
  id: string;
  name: string;
  category: string;
  patron_id: string | null;
  school_id: string;
  patron?: {
    full_name: string;
    system_id: string;
  };
}

interface ClubMembership {
  id: string;
  student_id: string;
  activity_id: string;
  role: string;
  school_id: string;
  is_cert_eligible: boolean;
  students?: {
    full_name: string;
    class_id: string;
    stream_id: string;
    photo_url?: string;
  };
}

interface ImportRow {
  tempId: string;
  name: string;
  classStr: string; // S.1A format
  role: string;
  matchedStudentId?: string;
  isValid: boolean;
}

const CATEGORIES = ['Club', 'Society', 'Association', 'Game', 'Sport', 'Other'];
const CLUB_ROLES = ['Member', 'President', 'Vice President', 'Secretary', 'Treasurer', 'Captain', 'Vice Captain', 'Organizer', 'Publicity Secretary'];

const Activities: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [activities, setActivities] = useState<SchoolActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<TeacherRegistry[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<SchoolActivity | null>(null);
  const [members, setMembers] = useState<ClubMembership[]>([]);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Bulk Import Flow
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [rawImportData, setRawImportData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [importMappings, setImportMappings] = useState<Record<string, string>>({ name: '', classStr: '', role: '' });
  const [processedImportRows, setProcessedImportRows] = useState<ImportRow[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<Student[]>([]);
  const [editingCell, setEditingCell] = useState<{ idx: number, field: keyof ImportRow } | null>(null);

  // Logic states
  const [submitting, setSubmitting] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollRole, setEnrollRole] = useState('Member');

  const [newActivity, setNewActivity] = useState({ 
    name: '', 
    category: 'Club',
    patron_id: '' 
  });

  useEffect(() => {
    fetchInitialData();
  }, [schoolId]);

  useEffect(() => {
    if (selectedActivity) fetchMembers(selectedActivity.id);
  }, [selectedActivity]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [actRes, staffRes, studRes] = await Promise.all([
        supabase
          .from('school_activities')
          .select('*, patron:teachers_registry(full_name, system_id)')
          .eq('school_id', schoolId)
          .order('name'),
        supabase
          .from('teachers_registry')
          .select('*')
          .eq('school_id', schoolId)
          .order('full_name'),
        supabase
          .from('students')
          // Add school_id to selected fields to match Student interface
          .select('id, school_id, full_name, class_id, stream_id, photo_url, reg_no')
          .eq('school_id', schoolId)
      ]);

      if (actRes.data) setActivities(actRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (studRes.data) setSchoolStudents(studRes.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async (activityId: string) => {
    const { data } = await supabase
      .from('club_memberships')
      .select('*, students(full_name, class_id, stream_id, photo_url)')
      .eq('activity_id', activityId)
      .order('role');
    setMembers(data || []);
  };

  // --- BULK IMPORT PIPELINE ---

  const handleBulkFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      if (data.length > 0) {
        setRawImportData(data);
        const headers = Object.keys(data[0] as any);
        setFileHeaders(headers);
        
        // Auto mapping
        const newMap = { name: '', classStr: '', role: '' };
        headers.forEach(h => {
          const hl = h.toLowerCase();
          if (hl.includes('name')) newMap.name = h;
          if (hl.includes('class') || hl.includes('stream')) newMap.classStr = h;
          if (hl.includes('role') || hl.includes('position')) newMap.role = h;
        });
        setImportMappings(newMap);
        setImportStep(2);
      }
    };
    reader.readAsBinaryString(file);
  };

  const parseConcatenatedClass = (str: string) => {
    // S.1A -> S.1 + A
    const trimmed = (str || '').trim().toUpperCase();
    if (trimmed.length < 3) return { cid: '', sid: '' };
    // Ugandan standard is 3 chars for class (P.1, S.1)
    const cid = trimmed.substring(0, 3);
    const sid = trimmed.substring(3);
    return { cid, sid };
  };

  const matchStudent = (name: string, classStr: string) => {
    const { cid, sid } = parseConcatenatedClass(classStr);
    return schoolStudents.find(s => 
      s.full_name.toUpperCase() === name.toUpperCase().trim() && 
      s.class_id === cid && 
      s.stream_id === sid
    );
  };

  const proceedToPreview = () => {
    const rows: ImportRow[] = rawImportData.map((row, i) => {
      const name = String(row[importMappings.name] || '').toUpperCase().trim();
      const classStr = String(row[importMappings.classStr] || '').toUpperCase().trim();
      const role = String(row[importMappings.role] || 'Member').trim();
      const match = matchStudent(name, classStr);

      return {
        tempId: `row-${i}`,
        name,
        classStr,
        role: role || 'Member',
        matchedStudentId: match?.id,
        isValid: !!match
      };
    });
    setProcessedImportRows(rows);
    setImportStep(3);
  };

  const updateProcessedRow = (idx: number, updates: Partial<ImportRow>) => {
    const newRows = [...processedImportRows];
    const updatedRow = { ...newRows[idx], ...updates };
    
    // Re-validate if identity fields changed
    if (updates.name !== undefined || updates.classStr !== undefined) {
      const match = matchStudent(updatedRow.name, updatedRow.classStr);
      updatedRow.matchedStudentId = match?.id;
      updatedRow.isValid = !!match;
    }
    
    newRows[idx] = updatedRow;
    setProcessedImportRows(newRows);
  };

  const handleFinalizeBulk = async () => {
    const validRows = processedImportRows.filter(r => r.isValid && r.matchedStudentId);
    if (validRows.length === 0) {
      alert("No valid matches found in the grid.");
      return;
    }

    setSubmitting(true);
    try {
      const payloads = validRows.map(r => ({
        student_id: r.matchedStudentId,
        activity_id: selectedActivity?.id,
        role: r.role,
        school_id: schoolId,
        is_cert_eligible: r.role !== 'Member'
      }));

      const { error } = await supabase
        .from('club_memberships')
        .upsert(payloads, { onConflict: 'student_id,activity_id' });

      if (error) throw error;

      alert(`Successfully synchronized ${payloads.length} members to ${selectedActivity?.name}.`);
      setShowBulkModal(false);
      if (selectedActivity) fetchMembers(selectedActivity.id);
    } catch (err: any) {
      alert("Integration Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const discardImport = () => {
    setImportStep(1);
    setRawImportData([]);
    setProcessedImportRows([]);
    setImportMappings({ name: '', classStr: '', role: '' });
  };

  // --- END BULK IMPORT ---

  const handleSearchStudents = async (val: string) => {
    setStudentSearch(val);
    if (val.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', schoolId)
      .or(`full_name.ilike.%${val}%,reg_no.ilike.%${val}%`)
      .limit(5);
    setSearchResults(data || []);
  };

  const enrollManual = async () => {
    if (!selectedStudent || !selectedActivity) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('club_memberships')
        .insert([{
          student_id: selectedStudent.id,
          activity_id: selectedActivity.id,
          role: enrollRole,
          school_id: schoolId,
          is_cert_eligible: enrollRole !== 'Member'
        }]);
      
      if (error) throw error;
      
      fetchMembers(selectedActivity.id);
      setShowEnrollModal(false);
      setSelectedStudent(null);
      setStudentSearch('');
      setSearchResults([]);
    } catch (err: any) {
      alert("Enrollment Failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.name) return;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('school_activities')
        .insert([{
          name: newActivity.name.toUpperCase(),
          category: newActivity.category,
          patron_id: newActivity.patron_id || null,
          school_id: schoolId
        }])
        .select('*, patron:teachers_registry(full_name, system_id)')
        .single();

      if (error) throw error;
      
      setActivities(prev => [...prev, data]);
      setShowAddModal(false);
      setNewActivity({ name: '', category: 'Club', patron_id: '' });
    } catch (err: any) {
      alert(`Initialization failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteActivity = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently dissolve this activity and clear its membership registry?')) return;
    
    const { error } = await supabase.from('school_activities').delete().eq('id', id);
    if (!error) {
      setActivities(activities.filter(a => a.id !== id));
      if (selectedActivity?.id === id) setSelectedActivity(null);
    }
  };

  const removeMember = async (membershipId: string) => {
    if (!confirm('Remove member from activity?')) return;
    const { error } = await supabase.from('club_memberships').delete().eq('id', membershipId);
    if (!error && selectedActivity) fetchMembers(selectedActivity.id);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm px-8">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><Trophy className="w-6 h-6" /></div>
           <div>
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Institutional Activities Registry</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Clubs, Societies and Sports Management.</p>
           </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)} 
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4" /> Add New Activity
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
         {/* Activities List Dashboard */}
         <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-6 border-b border-slate-50 bg-slate-50/30">
               <div className="relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input type="text" placeholder="Search activity registry..." className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
               </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
               {loading ? (
                 <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" /></div>
               ) : (
                 <div className="divide-y divide-slate-50">
                   {activities.map(a => (
                     <button 
                      key={a.id} 
                      onClick={() => setSelectedActivity(a)}
                      className={`w-full p-6 text-left flex items-center justify-between transition-all group relative ${selectedActivity?.id === a.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600 shadow-inner' : 'hover:bg-slate-50'}`}
                     >
                        <div className="flex items-center gap-5">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-all ${selectedActivity?.id === a.id ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white text-slate-400 border-slate-100 group-hover:scale-110'}`}>
                              <ActivityIcon className="w-6 h-6" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[12px] font-black uppercase tracking-tight ${selectedActivity?.id === a.id ? 'text-indigo-950' : 'text-slate-800'}`}>{a.name}</span>
                                <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${a.category === 'Sport' || a.category === 'Game' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                  {a.category}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserCircle className="w-3.5 h-3.5 text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                  {a.patron ? `Patron: ${a.patron.full_name}` : 'No Patron Assigned'}
                                </span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <button 
                            onClick={(e) => handleDeleteActivity(a.id, e)}
                            className="p-2.5 bg-white text-slate-300 hover:text-red-500 rounded-xl shadow-sm border border-slate-100 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                           <ChevronRight className={`w-5 h-5 transition-all ${selectedActivity?.id === a.id ? 'text-indigo-400 translate-x-1' : 'text-slate-200'}`} />
                        </div>
                     </button>
                   ))}
                   {activities.length === 0 && (
                     <div className="py-24 text-center opacity-30 flex flex-col items-center gap-4">
                        <Trophy className="w-16 h-16" />
                        <p className="text-[11px] font-black uppercase tracking-[0.3em]">No Active Activities Found</p>
                     </div>
                   )}
                 </div>
               )}
            </div>
         </div>

         {/* Membership Registry Panel */}
         <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
            {selectedActivity ? (
              <>
                <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-5">
                      <div className="w-14 h-14 bg-[#1E1B4B] text-[#FACC15] rounded-2xl flex items-center justify-center shadow-2xl">
                        <Users className="w-7 h-7" />
                      </div>
                      <div>
                         <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Membership Registry</h3>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Found {members.length} Enrolled Members for {selectedActivity.name}</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => setShowBulkModal(true)} className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                        <FileUp className="w-4 h-4" /> Bulk Enrollment
                      </button>
                      <button onClick={() => setShowEnrollModal(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg active:scale-95">
                        <UserPlus className="w-4 h-4" /> Enroll Student
                      </button>
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                   <table className="w-full text-left table-dense">
                      <thead>
                        <tr className="bg-slate-50/50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                           <th className="px-10 py-5">Verified Member</th>
                           <th className="px-10 py-5">Academic Level</th>
                           <th className="px-10 py-5">Assigned Role</th>
                           <th className="px-10 py-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                         {members.map((m) => (
                           <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-10 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                    {m.students?.photo_url ? (
                                      <img src={m.students.photo_url} className="w-full h-full object-cover" />
                                    ) : (
                                      <UserIcon className="w-5 h-5 text-slate-300" />
                                    )}
                                  </div>
                                  <span className="text-[12px] font-black text-slate-800 uppercase">{m.students?.full_name}</span>
                                </div>
                              </td>
                              <td className="px-10 py-4"><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">{m.students?.class_id}{m.students?.stream_id}</span></td>
                              <td className="px-10 py-4">
                                 <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tight border ${m.role !== 'Member' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                   {m.role}
                                 </span>
                              </td>
                              <td className="px-10 py-4 text-right">
                                 <button onClick={() => removeMember(m.id)} className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
                              </td>
                           </tr>
                         ))}
                         {members.length === 0 && (
                            <tr><td colSpan={4} className="py-32 text-center opacity-10 flex flex-col items-center gap-6"><Users className="w-20 h-20" /><p className="text-[14px] font-black uppercase tracking-[0.5em]">Registry Empty</p></td></tr>
                         )}
                      </tbody>
                   </table>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-6">
                 <Shield className="w-24 h-24 text-slate-300" />
                 <div className="text-center">
                    <p className="text-[14px] font-black uppercase tracking-[0.5em]">Select an Activity</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-2">to access specialized membership registries</p>
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Manual Enrollment Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-[600] bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Enroll Member</h3>
                 <button onClick={() => setShowEnrollModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
              </div>
              <div className="p-8 space-y-6">
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      autoFocus
                      type="text" 
                      value={studentSearch}
                      onChange={e => handleSearchStudents(e.target.value)}
                      placeholder="Search by Name or Reg No..."
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                    />
                 </div>

                 {searchResults.length > 0 && !selectedStudent && (
                   <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                      {searchResults.map(s => (
                        <button 
                          key={s.id}
                          onClick={() => setSelectedStudent(s)}
                          className="w-full p-3 bg-white border border-slate-100 hover:border-indigo-600 rounded-xl flex items-center gap-4 transition-all shadow-sm"
                        >
                           <div className="w-10 h-10 rounded-full border border-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                              {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-slate-300" />}
                           </div>
                           <div className="text-left flex-1">
                              <p className="text-[11px] font-black uppercase text-slate-800">{s.full_name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{s.class_id}{s.stream_id} • {s.reg_no || 'No Reg'}</p>
                           </div>
                           <ChevronRight className="w-4 h-4 text-slate-300" />
                        </button>
                      ))}
                   </div>
                 )}

                 {selectedStudent && (
                   <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-4 animate-in fade-in zoom-in-95">
                      <div className="w-14 h-14 rounded-full border-4 border-white overflow-hidden shadow-md">
                         {selectedStudent.photo_url ? <img src={selectedStudent.photo_url} className="w-full h-full object-cover" /> : <UserIcon className="w-6 h-6 text-indigo-200 m-auto mt-3.5" />}
                      </div>
                      <div className="flex-1">
                         <p className="text-[12px] font-black uppercase text-indigo-900 leading-tight">{selectedStudent.full_name}</p>
                         <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Registry Ref: {selectedStudent.reg_no || '---'}</p>
                      </div>
                      <button onClick={() => setSelectedStudent(null)} className="text-indigo-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                   </div>
                 )}

                 <div className="space-y-1.5 pt-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assign Role Portfolio</label>
                    <select 
                      value={enrollRole}
                      onChange={e => setEnrollRole(e.target.value)}
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-2xl px-5 py-3 text-xs font-black uppercase outline-none"
                    >
                       {CLUB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                 </div>

                 <button 
                  disabled={!selectedStudent || submitting}
                  onClick={enrollManual}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-[#FACC15]" />}
                    Commit Enrollment
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Bulk Enrollment Pipeline Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-[600] bg-indigo-950/90 backdrop-blur-md flex items-center justify-center p-6 overflow-hidden">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Bulk Enrollment Pipeline</h3>
                      <div className="flex items-center gap-3 mt-1">
                        {['Source Selection', 'Header Mapping', 'Match & Verify'].map((stepName, i) => (
                          <React.Fragment key={stepName}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${importStep > i ? 'text-indigo-600' : 'text-slate-300'}`}>{stepName}</span>
                            {i < 2 && <ChevronRight className="w-3 h-3 text-slate-200" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                 </div>
                 <button onClick={() => setShowBulkModal(false)} className="p-4 hover:bg-white rounded-2xl text-slate-300 hover:text-red-500 transition-all"><X className="w-7 h-7" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/20">
                 {importStep === 1 && (
                    <div className="h-full flex flex-col items-center justify-center py-20 border-4 border-dashed border-indigo-50 rounded-[5rem] space-y-10 group hover:border-indigo-200 transition-all">
                       <div className="w-32 h-32 bg-indigo-50 rounded-[4rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          {/* Corrected: Added 'Upload' to lucide-react imports */}
                          <Upload className="w-12 h-12 text-indigo-400" />
                       </div>
                       <div className="text-center space-y-2">
                          <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Initialize Membership Payload</h4>
                          <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Institutional Node: {selectedActivity?.name}</p>
                       </div>
                       <input type="file" id="bulk-enroll-file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleBulkFileUpload} />
                       <label htmlFor="bulk-enroll-file" className="px-24 py-6 bg-indigo-600 text-white rounded-[3rem] font-black uppercase tracking-[0.3em] text-[14px] cursor-pointer shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all">Load Activity Spreadsheet</label>
                    </div>
                 )}

                 {importStep === 2 && (
                    <div className="space-y-10 max-w-4xl mx-auto">
                       <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                          <Database className="w-6 h-6 text-indigo-600" />
                          <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest leading-relaxed">
                            Map your Excel columns to our registry requirements. The 'Class' column must contain concatenated IDs (e.g., S.1A, P.4B) for precise matching.
                          </p>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                          {[
                            { key: 'name', label: 'Student Name', icon: UserIcon },
                            { key: 'classStr', label: 'Class/Stream (e.g. S.1A)', icon: Layout },
                            { key: 'role', label: 'Club Role', icon: Tag }
                          ].map(field => (
                            <div key={field.key} className="p-6 bg-white rounded-3xl border-2 border-slate-100 focus-within:border-indigo-600 transition-all shadow-sm">
                               <div className="flex items-center gap-3 mb-4">
                                  <div className="p-2 bg-slate-50 text-slate-400 rounded-xl"><field.icon className="w-4 h-4" /></div>
                                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{field.label}</label>
                               </div>
                               <select 
                                 value={importMappings[field.key]}
                                 onChange={e => setImportMappings({...importMappings, [field.key]: e.target.value})}
                                 className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-indigo-600 outline-none"
                               >
                                  <option value="">[ IGNORE COLUMN ]</option>
                                  {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                               </select>
                            </div>
                          ))}
                       </div>

                       <div className="flex justify-center pt-10">
                          <button 
                            onClick={proceedToPreview}
                            disabled={!importMappings.name || !importMappings.classStr}
                            className="px-20 py-5 bg-indigo-600 text-white rounded-full font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                          >
                             Proceed to Verification Grid
                          </button>
                       </div>
                    </div>
                 )}

                 {importStep === 3 && (
                    <div className="space-y-6 flex flex-col h-full">
                       <div className="flex justify-between items-center px-4">
                          <div className="flex items-center gap-4">
                             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shadow-sm"><CheckCircle2 className="w-5 h-5" /></div>
                             <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Matching Matrix</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase">Showing {processedImportRows.length} transformation candidates. Click any cell to edit typos.</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <span className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 uppercase">
                               {processedImportRows.filter(r => r.isValid).length} Matches Found
                             </span>
                             <button onClick={discardImport} className="p-3 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button>
                          </div>
                       </div>

                       <div className="flex-1 overflow-hidden bg-white rounded-[3rem] border border-slate-100 shadow-inner flex flex-col">
                          <div className="overflow-x-auto flex-1 custom-scrollbar">
                             <table className="w-full text-left table-dense">
                                <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                                   <tr className="text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                                      <th className="px-8 py-4 w-16">Status</th>
                                      <th className="px-8 py-4">Full Name</th>
                                      <th className="px-8 py-4 w-40">Class/Stream</th>
                                      <th className="px-8 py-4 w-48">Designated Role</th>
                                      <th className="px-8 py-4">Registry Match</th>
                                   </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                   {processedImportRows.map((row, i) => (
                                     <tr key={row.tempId} className={`hover:bg-slate-50/50 transition-colors ${!row.isValid ? 'bg-red-50/20' : ''}`}>
                                        <td className="px-8 py-2">
                                           {row.isValid ? (
                                              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm"><Check className="w-3.5 h-3.5" /></div>
                                           ) : (
                                              /* Corrected: Added 'ShieldAlert' to lucide-react imports */
                                              <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center animate-pulse shadow-sm"><ShieldAlert className="w-3.5 h-3.5" /></div>
                                           )}
                                        </td>
                                        
                                        {/* Name Cell */}
                                        <td className="px-8 py-2" onClick={() => setEditingCell({ idx: i, field: 'name' })}>
                                           {editingCell?.idx === i && editingCell?.field === 'name' ? (
                                              <input 
                                                autoFocus
                                                value={row.name}
                                                onBlur={() => setEditingCell(null)}
                                                onChange={e => updateProcessedRow(i, { name: e.target.value.toUpperCase() })}
                                                className="w-full bg-white border border-indigo-400 rounded-lg px-2 py-1 text-[12px] font-black uppercase outline-none"
                                              />
                                           ) : (
                                              <span className="text-[12px] font-black text-slate-800 uppercase cursor-text hover:text-indigo-600">{row.name}</span>
                                           )}
                                        </td>

                                        {/* Class Cell */}
                                        <td className="px-8 py-2" onClick={() => setEditingCell({ idx: i, field: 'classStr' })}>
                                           {editingCell?.idx === i && editingCell?.field === 'classStr' ? (
                                              <input 
                                                autoFocus
                                                value={row.classStr}
                                                onBlur={() => setEditingCell(null)}
                                                onChange={e => updateProcessedRow(i, { classStr: e.target.value.toUpperCase() })}
                                                className="w-full bg-white border border-indigo-400 rounded-lg px-2 py-1 text-[11px] font-black uppercase outline-none"
                                              />
                                           ) : (
                                              <span className={`text-[11px] font-black uppercase cursor-text hover:text-indigo-600 ${row.classStr.length < 4 ? 'text-red-400' : 'text-indigo-500'}`}>
                                                {row.classStr || '[MISSING]'}
                                              </span>
                                           )}
                                        </td>

                                        {/* Role Cell */}
                                        <td className="px-8 py-2" onClick={() => setEditingCell({ idx: i, field: 'role' })}>
                                           {editingCell?.idx === i && editingCell?.field === 'role' ? (
                                              <select 
                                                autoFocus
                                                value={row.role}
                                                onBlur={() => setEditingCell(null)}
                                                onChange={e => updateProcessedRow(i, { role: e.target.value })}
                                                className="w-full bg-white border border-indigo-400 rounded-lg px-2 py-1 text-[10px] font-black uppercase outline-none"
                                              >
                                                 {CLUB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                              </select>
                                           ) : (
                                              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border cursor-pointer hover:bg-slate-100 ${row.role !== 'Member' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                                                {row.role}
                                              </span>
                                           )}
                                        </td>

                                        {/* Result Display */}
                                        <td className="px-8 py-2">
                                           {row.isValid ? (
                                              <div className="flex items-center gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shadow-sm shrink-0">
                                                    {schoolStudents.find(s => s.id === row.matchedStudentId)?.photo_url ? (
                                                       <img src={schoolStudents.find(s => s.id === row.matchedStudentId)?.photo_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                       <UserIcon className="w-4 h-4 text-slate-300 m-auto mt-2" />
                                                    )}
                                                 </div>
                                                 <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase leading-none">VERIFIED MATCH</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">
                                                       {schoolStudents.find(s => s.id === row.matchedStudentId)?.reg_no || '---'}
                                                    </span>
                                                 </div>
                                              </div>
                                           ) : (
                                              <span className="text-[10px] font-black text-red-500 uppercase italic">UNRECOGNIZED IDENTITY OR CLASS</span>
                                           )}
                                        </td>
                                     </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </div>

                       <div className="p-6 bg-indigo-950 rounded-[2.5rem] shadow-2xl flex items-center justify-between px-10 border border-indigo-800 shrink-0">
                          <div className="flex items-center gap-6">
                             <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
                                <span className="text-[11px] font-black text-indigo-200 uppercase tracking-widest">
                                  Pipeline Ready: {processedImportRows.filter(r => r.isValid).length} candidates matching active registry.
                                </span>
                             </div>
                             <div className="h-4 w-px bg-indigo-800"></div>
                             <p className="text-[9px] font-bold text-indigo-400 uppercase italic">
                               Tip: Fix typos directly in the grid to resolve red indicators.
                             </p>
                          </div>
                          <div className="flex gap-4">
                             <button onClick={discardImport} className="px-8 py-3 text-[11px] font-black text-indigo-400 hover:text-white uppercase transition-colors">Abort Cycle</button>
                             <button 
                               onClick={handleFinalizeBulk}
                               disabled={submitting || processedImportRows.filter(r => r.isValid).length === 0}
                               className="px-12 py-4 bg-[#FACC15] text-indigo-950 rounded-2xl font-black uppercase tracking-[0.2em] text-[12px] shadow-xl hover:shadow-yellow-500/20 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                             >
                                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                Finalize Enrollment
                             </button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Add New Activity Modal (Dense 2-column) */}
      {showAddModal && (
        <div className="fixed inset-0 z-[500] bg-indigo-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center px-12">
                <div className="flex items-center gap-5">
                   <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-200">
                     <UserPlus className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Initialize Activity Node</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Creation protocol for institutional extracurriculars.</p>
                   </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-4 hover:bg-white rounded-[1.5rem] transition-all text-slate-300 hover:text-red-500 shadow-sm"><X className="w-8 h-8" /></button>
             </div>
             
             <form onSubmit={handleAddActivity} className="p-12 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Tag className="w-4 h-4" /> Activity Name</label>
                      <input 
                        required 
                        autoFocus
                        value={newActivity.name} 
                        onChange={e => setNewActivity({...newActivity, name: e.target.value.toUpperCase()})} 
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[2rem] font-black text-sm text-slate-700 outline-none transition-all shadow-inner" 
                        placeholder="E.G. WILDLIFE CLUB" 
                      />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><ArrowRight className="w-4 h-4" /> Activity Category</label>
                      <select 
                        required 
                        value={newActivity.category} 
                        onChange={e => setNewActivity({...newActivity, category: e.target.value})} 
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[2rem] font-black text-sm text-slate-700 outline-none transition-all shadow-inner appearance-none"
                      >
                         {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1.5 col-span-full">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Assign Patron (Teacher in Charge)</label>
                      <select 
                        value={newActivity.patron_id} 
                        onChange={e => setNewActivity({...newActivity, patron_id: e.target.value})} 
                        className="w-full px-8 py-5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-[2rem] font-black text-sm text-slate-700 outline-none transition-all shadow-inner"
                      >
                         <option value="">[ OPTIONAL: ASSIGN LATER ]</option>
                         {staff.map(s => (
                           <option key={s.id} value={s.id}>{s.full_name} • ({s.system_id})</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100 flex items-center gap-4">
                   <ShieldCheck className="w-6 h-6 text-emerald-500" />
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                      This activity will be synchronized across the institutional grid. Assigned personnel will see this activity in their service profile under 'Patronage'.
                   </p>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-[13px] shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                >
                   {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6 text-[#FACC15]" />}
                   Finalize Activity Record
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Activities;