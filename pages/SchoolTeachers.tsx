import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserPlus, Upload, FileSpreadsheet, Loader2, Save, Trash2, 
  X, ShieldCheck, Mail, Phone, Tag, Layers, BookOpen, 
  CheckCircle2, PlusCircle, Search, ChevronRight, Briefcase,
  Printer
} from 'lucide-react';
import { supabase } from '../supabase';
import { TeacherRegistry, MasterSubject, School } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

interface SchoolTeachersProps {
  schoolId: string;
  staff: TeacherRegistry[];
  subjects: MasterSubject[];
  school: School | null;
  onRefresh: () => void;
}

const SchoolTeachers: React.FC<SchoolTeachersProps> = ({ 
  schoolId, staff, subjects, school, onRefresh 
}) => {
  const navigate = useNavigate();
  const [exportingExcel, setExportingExcel] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [rawImportData, setRawImportData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [processedImportData, setProcessedImportData] = useState<any[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [importLoading, setImportLoading] = useState(false);

  const [newStaff, setNewStaff] = useState({ 
    full_name: '', 
    email: '', 
    phone_numbers: [''],
    category: 'Teaching' as 'Teaching' | 'Non-Teaching',
    levels_taught: [] as string[],
    subjects_taught: [] as any[],
    is_hod: false,
    hod_department: '',
    additional_roles: {} as Record<string, string>
  });

  const generateSystemID = () => `STF-${Math.floor(100000 + Math.random() * 900000)}`;
  const generatePassword = () => {
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let ret = "";
    for(let i=0; i<8; i++) ret += charset.charAt(Math.floor(Math.random() * charset.length));
    return ret;
  };

  const dispatchCredentialEmail = async (person: any, password: string) => {
    const serviceId = 'service_s2bvvh2';
    const publicKey = 'psRo0pR25zPBvGgeD';
    const templateId = 'template_ysfduyo';
    const downloadLink = 'https://sms-portal.gov/downloads/SMS_Admin_Console_v4_Setup.exe';

    const params = {
      admin_name: person.full_name,
      assigned_role: person.role || (person.category === 'Teaching' ? 'Educator' : 'Staff'),
      school_name: school?.name || 'Institutional Administrator',
      school_admin_email: person.email.toLowerCase(),
      generated_password: password,
      download_link: downloadLink
    };

    try {
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: serviceId,
          template_id: templateId,
          user_id: publicKey,
          template_params: params
        })
      });
      return response.ok;
    } catch (err) {
      console.error("Email dispatch failure:", err);
      return false;
    }
  };

  const handleStaffOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newStaff.email)) {
      alert("Full name and verified email are mandatory.");
      return;
    }

    setOnboardLoading(true);
    try {
      const password = generatePassword();
      const systemId = generateSystemID();

      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email: newStaff.email.toLowerCase(),
        password,
        options: { data: { full_name: newStaff.full_name, system_id: systemId } }
      });

      let userId = auth.user?.id;
      if (authErr) {
          if (authErr.message.toLowerCase().includes('already registered')) {
              const { data: existing } = await supabase.from('teachers_registry').select('id').eq('email', newStaff.email.toLowerCase()).maybeSingle();
              userId = existing?.id;
          } else {
              throw authErr;
          }
      }

      if (!userId) throw new Error("Sync Error: UUID Lock Failed.");

      const { error: regErr } = await supabase.from('teachers_registry').upsert([{
        id: userId,
        school_id: schoolId,
        system_id: systemId,
        full_name: newStaff.full_name.toUpperCase(),
        email: newStaff.email.toLowerCase(),
        phone_numbers: newStaff.phone_numbers.filter(p => p.trim() !== '').map(p => `+256${p}`),
        category: newStaff.category,
        levels_taught: newStaff.levels_taught,
        subjects_taught: newStaff.subjects_taught,
        is_hod: newStaff.is_hod,
        hod_department: newStaff.is_hod ? newStaff.hod_department : null,
        additional_roles: newStaff.additional_roles,
        needs_password_reset: true,
        status: 'active'
      }]);
      if (regErr) throw regErr;

      await dispatchCredentialEmail({ ...newStaff, role: newStaff.category === 'Teaching' ? 'Educator' : 'Staff' }, password);

      setShowStaffModal(false);
      setNewStaff({ full_name: '', email: '', phone_numbers: [''], category: 'Teaching', levels_taught: [], subjects_taught: [], is_hod: false, hod_department: '', additional_roles: {} });
      onRefresh();
      alert(`Provisioning successful for ${newStaff.full_name}. Credentials dispatched.`);
    } catch (err: any) {
      alert(`Provisioning failed: ${err.message}`);
    } finally {
      setOnboardLoading(false);
    }
  };

  const downloadStaffExcel = async () => {
    if (!school || staff.length === 0) return;
    setExportingExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Staff Registry');
      const headerRow = worksheet.getRow(1);
      headerRow.values = ['S/N', 'SYSTEM ID', 'FULL NAME', 'EMAIL', 'CATEGORY', 'HOD STATUS', 'DEPT'];
      headerRow.font = { bold: true };
      staff.forEach((s, i) => {
        worksheet.addRow([i + 1, s.system_id, s.full_name, s.email, s.category, s.is_hod ? 'YES' : 'NO', s.hod_department || '---']);
      });
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `STAFF_REGISTRY_${school.id}.xlsx`);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-2 shadow-sm">
      <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Briefcase className="w-6 h-6" /></div>
          <div>
             <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">School Personnel Registry</h3>
             <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{staff.length} Active Node Records</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={downloadStaffExcel} className="px-6 py-3 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm transition-all hover:bg-indigo-50">
            <Printer className="w-4 h-4" /> Export Excel
          </button>
          <button onClick={() => setShowStaffModal(true)} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">
            <UserPlus className="w-4 h-4" /> Add Personnel
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto min-h-[500px]">
        <table className="w-full text-left table-dense">
          <thead>
            <tr className="bg-slate-50 text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
              <th className="px-10 py-5">System ID</th>
              <th className="px-10 py-5">Personnel Identity</th>
              <th className="px-10 py-5">Classification</th>
              <th className="px-10 py-5">Role Assignment</th>
              <th className="px-10 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {staff.map(s => (
              <tr key={s.id} onClick={() => navigate(`/schools/${schoolId}/staff/${s.id}?tab=PERSONNEL`)} className="hover:bg-slate-50/50 transition-colors group cursor-pointer h-[60px]">
                <td className="px-10"><span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">{s.system_id}</span></td>
                <td className="px-10">
                  <p className="text-[12px] font-black text-slate-800 uppercase leading-none">{s.full_name}</p>
                  <p className="text-[10px] font-bold text-slate-400 lowercase mt-1.5">{s.email}</p>
                </td>
                <td className="px-10"><span className={`text-[9px] font-black uppercase tracking-tight ${s.category === 'Teaching' ? 'text-indigo-600' : 'text-amber-600'}`}>{s.category}</span></td>
                <td className="px-10">{s.is_hod && <span className="px-3 py-1 bg-[#1E1B4B] text-[#FACC15] rounded-xl text-[8px] font-black uppercase tracking-widest border border-indigo-900 shadow-sm">HOD: {s.hod_department}</span>}</td>
                <td className="px-10 text-right"><button className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-xl"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showStaffModal && (
        <div className="fixed inset-0 z-[200] bg-indigo-950/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[95vh]">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0 px-12">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200"><UserPlus className="w-6 h-6" /></div>
                    <div><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Personnel Provisioning</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Institutional record lock protocol.</p></div>
                 </div>
                 <button onClick={() => setShowStaffModal(false)} className="p-4 hover:bg-white rounded-[1.5rem] transition-all text-slate-300 hover:text-red-500 shadow-sm"><X className="w-7 h-7" /></button>
              </div>
              <form onSubmit={handleStaffOnboard} className="p-12 space-y-12 overflow-y-auto custom-scrollbar flex-1">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label><input required value={newStaff.full_name} onChange={e => setNewStaff({...newStaff, full_name: e.target.value.toUpperCase()})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authorized Email</label><input required type="email" value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value.toLowerCase()})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-sm" /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label><input value={newStaff.phone_numbers[0]} onChange={e => setNewStaff({...newStaff, phone_numbers: [e.target.value]})} className="w-full px-6 py-4 bg-white border-2 border-slate-100 focus:border-indigo-600 rounded-[1.5rem] font-bold text-xs outline-none transition-all shadow-sm" placeholder="7XXXXXXXX" /></div>
                 </div>
                 <div className="pt-6 flex justify-end">
                    <button type="submit" disabled={onboardLoading} className="px-16 py-5 bg-indigo-600 text-white rounded-[2rem] text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-4 active:scale-95 disabled:opacity-50">
                       {onboardLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5 text-[#FACC15]" />} SYNC PERSONNEL NODE
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default SchoolTeachers;