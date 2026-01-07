
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  X, Loader2, Fingerprint, BookOpen, Activity, 
  ShieldCheck, ShieldAlert, Award, Calendar, Home, 
  Phone, Briefcase, Save, ChevronLeft, Camera, Mail, 
  Shield, UserCircle, Table, Trophy, Layers, Tag,
  Printer, FileText, Activity as ActivityIcon
} from 'lucide-react';
import { supabase } from '../supabase';
import { TeacherRegistry, MasterSubject, School } from '../types';

const StaffProfile: React.FC = () => {
  const { id: schoolId, staffId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [staff, setStaff] = useState<TeacherRegistry | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [patronActivities, setPatronActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStaff();
    fetchSupportData();
    fetchPatronActivities();
  }, [staffId]);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('teachers_registry').select('*').eq('id', staffId).single();
      if (data) {
        setStaff(data);
        const { data: schoolData } = await supabase.from('schools').select('*').eq('id', schoolId).single();
        if (schoolData) setSchool(schoolData);
      }
    } catch (err) {
      console.error("Load failed");
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportData = async () => {
    const [{ data: subData }] = await Promise.all([
      supabase.from('master_subject_bank').select('*').order('name')
    ]);
    setSubjects(subData || []);
  };

  const fetchPatronActivities = async () => {
    if (!staffId) return;
    const { data } = await supabase
      .from('school_activities')
      .select('name, category')
      .eq('patron_id', staffId);
    setPatronActivities(data || []);
  };

  const processPhoto = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          let width = img.width;
          let height = img.height;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); 
        };
      };
    });
  };

  const exportPersonnelPDF = async () => {
    if (!staff || !school) return;
    const jspdfLib = (window as any).jspdf;
    const html2canvasLib = (window as any).html2canvas;

    if (!jspdfLib || !html2canvasLib) {
      alert("Document engine is warming up. Please try again.");
      return;
    }

    setExportingPDF(true);
    try {
      const template = `
        <div style="font-family: 'Arial', sans-serif; padding: 40px; color: #0f172a; line-height: 1.4; width: 800px; background: white;">
          <!-- Header -->
          <table style="width: 100%; border-bottom: 2px solid #1e1b4b; padding-bottom: 20px; margin-bottom: 20px;">
            <tr>
              <td style="width: 80px;"><img src="{{school_logo}}" style="width: 70px; height: 70px; object-fit: contain;"></td>
              <td>
                <h1 style="margin: 0; font-size: 22px; color: #1e1b4b;">{{school_name}}</h1>
                <p style="margin: 0; font-size: 12px; text-transform: uppercase; font-weight: bold; color: #64748b;">Personnel Service Record</p>
              </td>
              <td style="text-align: right;">
                <div style="background: #f1f5f9; padding: 10px; border-radius: 8px;">
                  <p style="margin: 0; font-size: 10px; color: #64748b;">SYSTEM ID</p>
                  <p style="margin: 0; font-size: 16px; font-weight: 800;">{{system_id}}</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Identity Grid -->
          <h3 style="background: #f8fafc; padding: 8px; font-size: 12px; border-left: 4px solid #1e1b4b; margin-top: 30px;">IDENTITY & CONTACT</h3>
          <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="width: 33%; padding: 10px; border: 1px solid #f1f5f9;"><b>Full Name:</b><br>{{full_name}}</td>
              <td style="width: 33%; padding: 10px; border: 1px solid #f1f5f9;"><b>Email Address:</b><br>{{email}}</td>
              <td style="width: 33%; padding: 10px; border: 1px solid #f1f5f9;"><b>Phone(s):</b><br>{{phone_numbers}}</td>
            </tr>
          </table>

          <!-- Academic Profile -->
          <h3 style="background: #f8fafc; padding: 8px; font-size: 12px; border-left: 4px solid #1e1b4b; margin-top: 30px;">ACADEMIC ASSIGNMENT</h3>
          <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #f1f5f9;">
                <p style="margin-bottom: 8px;"><b>Teaching Category:</b> {{category}}</p>
                <p><b>HOD Status:</b> {{is_hod}} ({{hod_department}})</p>
              </td>
              <td style="width: 50%; vertical-align: top; padding: 10px; border: 1px solid #f1f5f9;">
                <b>Subjects:</b>
                <ul style="margin: 8px 0; padding-left: 20px;">
                  {{subjects_list}}
                </ul>
              </td>
            </tr>
          </table>

          <!-- Roles -->
          <h3 style="background: #f8fafc; padding: 8px; font-size: 12px; border-left: 4px solid #1e1b4b; margin-top: 30px;">INSTITUTIONAL ROLES</h3>
          <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
            <tr>
              <td style="width: 33%; padding: 10px; border: 1px solid #f1f5f9;"><b>Class Teacher:</b><br>{{class_teacher}}</td>
              <td style="width: 33%; padding: 10px; border: 1px solid #f1f5f9;"><b>House Teacher:</b><br>{{house_teacher}}</td>
              <td style="width: 33%; padding: 10px; border: 1px solid #f1f5f9;"><b>Patron of:</b><br>{{patron_of}}</td>
            </tr>
          </table>

          <!-- Footer -->
          <div style="margin-top: 80px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; text-align: center; color: #94a3b8;">
            This document is a certified extract from the SMS Uganda Operating System.<br>
            Generated on: {{generation_date}}
          </div>
        </div>
      `;

      const subjectsHtml = (staff.subjects_taught || [])
        .map((s: any) => `<li>${s.name} (${s.code}) - ${s.level}</li>`)
        .join('');

      const activitiesList = patronActivities.map(a => a.name).join(', ') || '---';

      const populatedHtml = template
        .replace('{{school_logo}}', school.logo_url || 'https://via.placeholder.com/100?text=LOGO')
        .replace('{{school_name}}', school.name)
        .replace('{{system_id}}', staff.system_id)
        .replace('{{full_name}}', staff.full_name)
        .replace('{{email}}', staff.email)
        .replace('{{phone_numbers}}', (staff.phone_numbers || []).join(', '))
        .replace('{{category}}', staff.category)
        .replace('{{is_hod}}', staff.is_hod ? 'YES' : 'NO')
        .replace('{{hod_department}}', staff.hod_department || 'N/A')
        .replace('{{subjects_list}}', subjectsHtml || '<li>No subjects assigned</li>')
        .replace('{{class_teacher}}', staff.additional_roles?.class_teacher || '---')
        .replace('{{house_teacher}}', staff.additional_roles?.house_teacher || '---')
        .replace('{{patron_of}}', activitiesList)
        .replace('{{generation_date}}', new Date().toLocaleString());

      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.innerHTML = populatedHtml;
      document.body.appendChild(container);

      const canvas = await html2canvasLib(container, { 
        scale: 2, 
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jspdfLib.jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`SERVICE_RECORD_${staff.system_id}.pdf`);
      
      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF Export Failure:", err);
      alert("Institutional Asset Generation Failed.");
    } finally {
      setExportingPDF(false);
    }
  };

  const handlePhotoUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !staff) return;
    setUploading(true);
    try {
      const base64 = await processPhoto(file);
      const { error } = await supabase.from('teachers_registry').update({ profile_photo_url: base64 }).eq('id', staffId);
      if (error) throw error;
      setStaff({ ...staff, profile_photo_url: base64 });
      alert("Biometric Photo Synced Successfully.");
    } catch (err) {
      alert("Photo sync failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('teachers_registry').update({
        full_name: staff.full_name,
        email: staff.email,
        phone_numbers: staff.phone_numbers,
        category: staff.category,
        levels_taught: staff.levels_taught,
        subjects_taught: staff.subjects_taught,
        is_hod: staff.is_hod,
        hod_department: staff.hod_department,
        additional_roles: staff.additional_roles,
        status: staff.status
      }).eq('id', staffId);
      if (error) throw error;
      alert("Personnel Record Updated.");
    } catch (err) {
      alert("Update failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>;
  if (!staff) return <div>Record Not Found</div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between px-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate(`/schools/${schoolId}?tab=${searchParams.get('tab') || 'PERSONNEL'}`)} 
            className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-white shadow-lg overflow-hidden relative group cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {staff.profile_photo_url ? <img src={staff.profile_photo_url} className="w-full h-full object-cover" /> : <UserCircle className="w-6 h-6 text-indigo-200 m-auto mt-4" />}
                {uploading && <div className="absolute inset-0 bg-indigo-900/40 flex items-center justify-center"><Loader2 className="w-4 h-4 text-white animate-spin" /></div>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                  <Camera className="w-4 h-4" />
                </div>
             </div>
             <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpdate} />
             <div>
                <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">{staff.full_name}</h1>
                <div className="flex gap-3 mt-1">
                   <span className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 uppercase shadow-sm">SYS_ID: {staff.system_id}</span>
                   <span className="text-[9px] font-black bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-100 uppercase shadow-sm">{staff.category}</span>
                </div>
             </div>
          </div>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={exportPersonnelPDF} 
             disabled={exportingPDF}
             className="px-8 py-3 bg-white border border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-sm active:scale-95 disabled:opacity-50"
           >
              {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              {exportingPDF ? 'PREPARING RECORD...' : 'DOWNLOAD SERVICE SUMMARY'}
           </button>
           <button onClick={handleSave} disabled={saving} className="bg-indigo-600 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
             {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} SYNC PERSONNEL
           </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Governance */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-[#1E1B4B] p-8 rounded-[3rem] shadow-2xl border border-indigo-900 text-white space-y-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 border-b border-indigo-800 pb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Authority Matrix</h4>
              
              <div className="space-y-4">
                 <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={staff.is_hod} onChange={e => setStaff({...staff, is_hod: e.target.checked})} className="w-5 h-5 rounded border-indigo-800 bg-indigo-950 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase group-hover:text-indigo-200">Executive HOD</span>
                 </label>
                 {staff.is_hod && (
                   <input 
                    placeholder="DEPARTMENT..." 
                    value={staff.hod_department || ''} 
                    onChange={e => setStaff({...staff, hod_department: e.target.value.toUpperCase()})}
                    className="w-full bg-indigo-900/50 border border-indigo-700 rounded-xl px-4 py-2 text-[10px] font-black text-[#FACC15] outline-none"
                   />
                 )}
              </div>

              <div className="space-y-4 pt-4 border-t border-indigo-800">
                 <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Institutional Roles</h5>
                 {[
                   { key: 'class_teacher', label: 'Class Teacher', icon: Table },
                   { key: 'house_teacher', label: 'House Teacher', icon: Home }
                 ].map(role => (
                   <div key={role.key} className="space-y-1.5">
                      <label className="text-[8px] font-black uppercase text-indigo-300/50 flex items-center gap-2 ml-1">
                        <role.icon className="w-3 h-3" /> {role.label}
                      </label>
                      <input 
                        value={staff.additional_roles?.[role.key] || ''} 
                        onChange={e => setStaff({...staff, additional_roles: { ...staff.additional_roles, [role.key]: e.target.value.toUpperCase() }})}
                        className="w-full bg-indigo-950/50 border border-indigo-800 rounded-xl px-4 py-2 text-[10px] font-black text-white outline-none"
                        placeholder="NONE"
                      />
                   </div>
                 ))}

                 {/* Teacher Patronage Display */}
                 <div className="space-y-2 mt-4">
                   <label className="text-[8px] font-black uppercase text-indigo-300/50 flex items-center gap-2 ml-1">
                      <Trophy className="w-3 h-3" /> Teacher in Charge (Patron of:)
                   </label>
                   <div className="flex flex-wrap gap-1">
                      {patronActivities.map((a, idx) => (
                        <span key={idx} className="px-2 py-1 bg-indigo-900/60 rounded-lg text-[8px] font-black text-[#FACC15] border border-indigo-700 uppercase">
                          {a.name}
                        </span>
                      ))}
                      {patronActivities.length === 0 && <span className="text-[8px] text-indigo-500 font-bold uppercase italic ml-1">No assignments found</span>}
                   </div>
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-50 pb-2">Record Status</h4>
              <select 
                value={staff.status} 
                onChange={e => setStaff({...staff, status: e.target.value as any})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[11px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-500"
              >
                 <option value="active">Active Service</option>
                 <option value="inactive">Inactive / On Leave</option>
              </select>
           </div>
        </div>

        {/* Center: Identity & Academic */}
        <div className="lg:col-span-6 space-y-6">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                 <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl"><Fingerprint className="w-6 h-6" /></div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Identity Section</h3>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 {[
                   { key: 'full_name', label: 'Legal Full Name', fullWidth: true },
                   { key: 'email', label: 'Official Communication' },
                   { key: 'phone_numbers', label: 'Verification Line', isPhone: true }
                 ].map(f => (
                   <div key={f.key} className={`space-y-1.5 ${f.fullWidth ? 'col-span-full' : ''}`}>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{f.label}</label>
                      <input 
                        value={f.isPhone ? staff.phone_numbers[0] || '' : String(staff[f.key as keyof TeacherRegistry] || '')} 
                        onChange={e => {
                          if (f.isPhone) {
                            setStaff({...staff, phone_numbers: [e.target.value]})
                          } else {
                            setStaff({...staff, [f.key]: e.target.value})
                          }
                        }}
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 outline-none transition-all shadow-inner"
                      />
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-10">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><BookOpen className="w-6 h-6" /></div>
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Academic Portfolio</h3>
              </div>
              <div className="space-y-8">
                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><Layers className="w-4 h-4" /> Teaching Scope</label>
                    <div className="flex gap-2">
                       {['Primary', 'O-Level', 'A-Level'].map(lvl => (
                         <button 
                           key={lvl} 
                           type="button" 
                           onClick={() => setStaff({...staff, levels_taught: staff.levels_taught.includes(lvl) ? staff.levels_taught.filter(x => x !== lvl) : [...staff.levels_taught, lvl]})} 
                           className={`flex-1 py-3.5 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${staff.levels_taught.includes(lvl) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-400'}`}
                         >{lvl}</button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1"><Tag className="w-4 h-4" /> Assigned Subjects</label>
                    <div className="bg-slate-50 rounded-[2rem] border-2 border-slate-100 p-6 max-h-56 overflow-y-auto custom-scrollbar shadow-inner grid grid-cols-2 gap-3">
                       {subjects.map(s => (
                         <label key={s.id} className="flex items-center gap-3 p-3 bg-white rounded-xl cursor-pointer hover:border-indigo-300 transition-all border border-slate-100 shadow-sm">
                            <input 
                              type="checkbox" 
                              checked={staff.subjects_taught.some(x => x.code === s.code)} 
                              onChange={() => {
                                const exists = staff.subjects_taught.find(x => x.code === s.code);
                                setStaff({...staff, subjects_taught: exists ? staff.subjects_taught.filter(x => x.code !== s.code) : [...staff.subjects_taught, { code: s.code, name: s.name, level: s.level }]});
                              }} 
                              className="w-5 h-5 rounded text-indigo-600" 
                            />
                            <div className="flex flex-col">
                               <span className="text-[11px] font-black text-slate-700 leading-none">{s.code}</span>
                               <span className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{s.name}</span>
                            </div>
                         </label>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column: Registry Checks */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-50 pb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Security Audit</h4>
              <div className="space-y-4">
                 <div className={`p-5 rounded-2xl border-2 flex items-center justify-between ${staff.needs_password_reset ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
                    <div className="flex items-center gap-3">
                       {staff.needs_password_reset ? <ShieldAlert className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                       <span className="text-[10px] font-black uppercase">{staff.needs_password_reset ? 'Pending Reset' : 'Account Secured'}</span>
                    </div>
                 </div>
                 <button type="button" onClick={() => setStaff({...staff, needs_password_reset: true})} className="w-full py-3 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl text-[9px] font-black uppercase transition-all">Force Password Mandate</button>
              </div>
           </div>
           
           <div className="p-8 bg-indigo-50/50 rounded-[3rem] border border-indigo-100">
              <p className="text-[9px] text-indigo-700 font-bold uppercase leading-relaxed tracking-widest">
                 This record is an active node of the school personnel registry. Modification logs are mirrored for ministerial compliance.
              </p>
           </div>
        </div>
      </form>
    </div>
  );
};

export default StaffProfile;
