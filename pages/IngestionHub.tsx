import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DatabaseZap, Upload, Search, CheckCircle2, AlertCircle, 
  Loader2, FileSpreadsheet, X, ChevronRight, Check, 
  Settings2, Zap, ArrowDown, Info, ShieldCheck, 
  ChevronLeft, Layout, Table, Save, AlertTriangle, RefreshCw,
  Edit2
} from 'lucide-react';
import { supabase } from '../supabase';
import { School, MASTER_REGISTRY_FIELDS, MasterSubject, Student } from '../types';
import * as XLSX from 'xlsx';

/**
 * Standardizes date to dd/mm/yyyy.
 */
const parseDOB = (input: any): string | null => {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;
  const ddmm = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
  if (ddmm.test(s)) return s;
  let date: Date;
  if (!isNaN(Number(input))) {
    date = new Date(Math.round((input - 25569) * 86400 * 1000));
  } else {
    date = new Date(s);
  }
  if (isNaN(date.getTime())) return null;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Normalizes Ugandan phone numbers to +256 format.
 */
const normalizePhone = (val: any): string => {
  if (!val) return "";
  let s = String(val).replace(/\D/g, "");
  if (s.startsWith("256") && s.length === 12) return "+" + s;
  if (s.startsWith("0") && s.length === 10) return "+256" + s.substring(1);
  if (s.length === 9) return "+256" + s;
  return s ? "+" + s : "";
};

const IngestionHub: React.FC = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [activeSchool, setActiveSchool] = useState<School | null>(null);
  const [subjectBank, setSubjectBank] = useState<MasterSubject[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [targetClass, setTargetClass] = useState<string>('');
  const [targetStream, setTargetStream] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  const [rawFileData, setRawFileData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [editingCell, setEditingCell] = useState<{idx: number, key: string} | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSchools();
    fetchSubjectBank();
  }, []);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    if (data) setSchools(data);
  };

  const fetchSubjectBank = async () => {
    const { data } = await supabase.from('master_subject_bank').select('*');
    if (data) setSubjectBank(data);
  };

  const handleSchoolSelect = async (id: string) => {
    setSelectedSchoolId(id);
    const school = schools.find(s => s.id === id) || null;
    setActiveSchool(school);
  };

  const availableClasses = useMemo(() => {
    if (!activeSchool) return [];
    const list: string[] = [];
    if (activeSchool.offered_levels?.includes('Primary')) list.push('P.1','P.2','P.3','P.4','P.5','P.6','P.7');
    if (activeSchool.offered_levels?.includes('O-Level')) list.push('S.1','S.2','S.3','S.4');
    if (activeSchool.offered_levels?.includes('A-Level')) list.push('S.5','S.6');
    return list;
  }, [activeSchool]);

  const isSecondary = useMemo(() => targetClass.startsWith('S'), [targetClass]);
  const isAlevel = useMemo(() => targetClass === 'S.5' || targetClass === 'S.6', [targetClass]);

  const filteredMapperFields = useMemo(() => {
    return MASTER_REGISTRY_FIELDS.filter(f => {
      if (f.category === 'Primary School Background' && !isSecondary) return false;
      if (f.category === 'O-Level Background' && !isAlevel) return false;
      return true;
    });
  }, [isSecondary, isAlevel]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      if (data.length > 0) {
        setRawFileData(data);
        const headers = Object.keys(data[0] as any);
        setFileHeaders(headers);
        const autoMap: Record<string, string> = {};
        filteredMapperFields.forEach(field => {
          const match = headers.find(h => {
            const hLow = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
            const fKeyLow = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
            return hLow === fKeyLow || hLow.includes(fKeyLow);
          });
          if (match) autoMap[field.key] = match;
        });
        setMappings(autoMap);
        setStep(2);
      }
    };
    reader.readAsBinaryString(file);
  };

  const prepareWorkspace = () => {
    const processed = rawFileData.map((row) => {
      const student: any = { 
        class_id: targetClass, 
        stream_id: targetStream,
        school_id: selectedSchoolId,
        enrollment_status: 'active',
        ple_info: { school: "", "subject aggregates": "", "total aggregates": "" },
        uce_info: { school: "", "subject aggregates": "", "total aggregates": "" },
        optional_subjects: [],
        _subject_errors: []
      };
      
      filteredMapperFields.forEach(field => {
        const header = mappings[field.key];
        let val = header ? row[header] : '';

        if (field.key === 'date_of_birth') {
          student[field.key] = parseDOB(val);
        } else if (field.key === 'optional_subjects') {
          student[field.key] = val;
        } else if (field.key === 'guardian_phone_primary') {
          const phones = String(val || "").split(",").map(p => p.trim()).filter(Boolean);
          student.guardian_phone_primary = normalizePhone(phones[0]);
          student.guardian_phone_secondary = normalizePhone(phones[1]);
        } else if (field.key === 'guardian2_phone_primary') {
          const phones = String(val || "").split(",").map(p => p.trim()).filter(Boolean);
          student.guardian2_phone_primary = normalizePhone(phones[0]);
          student.guardian2_phone_secondary = normalizePhone(phones[1]);
        } else if (field.key === 'ple_total') {
          student.ple_info["total aggregates"] = String(val || "");
        } else if (field.key === 'uce_total') {
          student.uce_info["total aggregates"] = String(val || "");
        } else {
          student[field.key] = val;
        }
      });

      const surname = student.last_name || "";
      const fname = student.first_name || "";
      student.full_name = `${surname} ${fname}`.trim().toUpperCase();

      return student;
    });

    setProcessedData(processed);
    setStep(3);
  };

  const updateCell = (idx: number, key: string, val: string) => {
    const updated = [...processedData];
    const s = updated[idx];
    if (key === 'ple_total') s.ple_info["total aggregates"] = val;
    else if (key === 'uce_total') s.uce_info["total aggregates"] = val;
    else if (key.includes('phone')) {
      s[key] = normalizePhone(val);
    } else {
      s[key] = val;
      if (key === 'first_name' || key === 'last_name') {
        s.full_name = `${s.last_name || ''} ${s.first_name || ''}`.trim().toUpperCase();
      }
    }
    setProcessedData(updated);
  };

  const handleFinalIntegration = async () => {
    const invalid = processedData.some(s => !s.full_name || !s.registration_number);
    if (invalid) {
      alert("Integrity Error: Every record must have a Full Name and Registration Number.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const toArray = (val: any): string[] => {
        if (Array.isArray(val)) return val;
        if (!val || typeof val !== 'string') return [];
        return val.split(',').map(item => item.trim()).filter(Boolean);
      };

      const payload = processedData.map(s => {
        const student = { ...s };
        const numericFields = ['fees_balance', 'age', 'total_fees', 'fees_paid', 'transport_fee'];
        numericFields.forEach(field => {
          const raw = String(student[field] || "").replace(/,/g, '');
          student[field] = isNaN(Number(raw)) ? 0 : Number(raw);
        });
        const booleanFields = ['disability_status', 'is_leader', 'transport_required'];
        booleanFields.forEach(field => {
          const raw = String(student[field] || "").trim().toLowerCase();
          student[field] = ['yes', 'y', 'true', '1'].includes(raw);
        });
        student.optional_subjects = toArray(student.optional_subjects);
        student.reg_no = student.registration_number;
        delete student.registration_number;
        delete student.ple_total;
        delete student.uce_total;
        delete student._subject_errors;
        return student;
      });

      const { error } = await supabase.from('students').insert(payload);
      if (error) throw error;

      // LOGGING: Bulk Ingestion Event
      await supabase.from('audit_logs').insert([{
        operator_email: session?.user.email,
        operator_type: 'System Operator',
        action: `BULK_INGESTION_SUCCESS: ${payload.length} students enrolled from '${uploadedFileName}'`,
        entity_id: selectedSchoolId,
        entity_type: 'SCHOOL'
      }]);

      alert(`Integration Complete: ${payload.length} records published.`);
      navigate(`/schools/${selectedSchoolId}?tab=REGISTRY`);
    } catch (err: any) {
      alert("Integration sequence failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isFinalizable = processedData.length > 0 && processedData.every(s => s.full_name && s.registration_number);

  const categories = useMemo(() => {
    const cats = ['Core Identity', 'Identifiers', 'Geography', 'Guardian 1', 'Guardian 2', 'Health', 'Financial/Other'];
    if (isSecondary) cats.push('Primary School Background');
    if (isAlevel) cats.push('O-Level Background');
    return cats;
  }, [isSecondary, isAlevel]);

  const gridFields = useMemo(() => {
    return filteredMapperFields.filter(f => f.key !== 'full_name');
  }, [filteredMapperFields]);

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter']">
      <div className="bg-[#1E1B4B] border-b border-indigo-900 sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-6 h-14 flex items-center justify-between">
           <div className="flex items-center gap-4 text-white">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg"><DatabaseZap className="w-5 h-5" /></div>
              <div>
                <h1 className="text-[12px] font-black uppercase tracking-tighter">Student Admission Hub</h1>
                <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Protocol: Sequential Batch Load</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <select value={selectedSchoolId} onChange={e => handleSchoolSelect(e.target.value)} className="bg-indigo-950 border border-indigo-800 text-white rounded-lg px-4 py-1.5 text-[10px] font-black outline-none w-64 uppercase">
                 <option value="">Target School Selection...</option>
                 {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {step === 3 && (
                <button disabled={!isFinalizable || loading} onClick={handleFinalIntegration} className="bg-[#FACC15] text-indigo-950 px-8 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-yellow-500 active:scale-95 disabled:opacity-30 transition-all">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Finalize Batch Enrollment
                </button>
              )}
           </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto p-6">
        {step === 1 && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 animate-in fade-in duration-500">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><Layout className="w-5 h-5" /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Phase 1: Enforce Registry Context</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Target Class Batch</label>
                  <select disabled={!selectedSchoolId} value={targetClass} onChange={e => setTargetClass(e.target.value)} className="w-full px-6 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-black text-sm outline-none transition-all appearance-none">
                    <option value="">[ SELECT BATCH ]</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c} Registry</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assigned Stream ID</label>
                  <input disabled={!targetClass} value={targetStream} onChange={e => setTargetStream(e.target.value.toUpperCase())} placeholder="ENTER LABEL (E.G. BLUE, NORTH, A)" className="w-full px-6 py-3.5 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-black text-sm text-slate-700 outline-none transition-all uppercase" />
                </div>
             </div>
             <div className="mt-12 border-t border-slate-50 pt-12 flex flex-col items-center justify-center space-y-8">
                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-700 ${targetStream ? 'bg-indigo-600 text-white shadow-2xl scale-110' : 'bg-indigo-50 text-indigo-200 opacity-30 scale-95'}`}><Upload className="w-10 h-10" /></div>
                <div className="text-center">
                   <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Initialize Registry Ingress</h4>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Accepting spreadsheets, student photos & signatures</p>
                </div>
                <input type="file" id="batch-file" className="hidden" accept=".xlsx,.csv" disabled={!targetStream} onChange={handleFileUpload} />
                <label htmlFor="batch-file" className={`px-16 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl transition-all cursor-pointer ${targetStream ? 'bg-[#0F172A] text-white hover:bg-black hover:-translate-y-0.5 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Select Local Source File</label>
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-500 pb-20">
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Table className="w-7 h-7" /></div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Phase 2: Data Component Mapping</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Linking source spreadsheet headers to Institutional Database nodes</p>
                  </div>
                </div>
                <button onClick={prepareWorkspace} className="bg-[#0F172A] text-white px-12 py-4 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all flex items-center gap-3 active:scale-95">Initialize Preview Grid <ChevronRight className="w-4 h-4" /></button>
             </div>
             <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-12">
                {categories.map(cat => (
                  <div key={cat} className="space-y-6">
                    <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] border-b border-slate-50 pb-3 ml-2 flex items-center gap-3"><div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>{cat}</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {MASTER_REGISTRY_FIELDS.filter(f => f.category === cat).map(field => (
                        <div key={field.key} className={`p-5 rounded-[1.5rem] border-2 transition-all flex items-center justify-between gap-6 ${mappings[field.key] ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white border-slate-50 hover:border-slate-100'}`}>
                          <div className="flex-1 min-w-0">
                            <label className="text-[10px] font-black text-slate-800 uppercase truncate block mb-1">{field.label}</label>
                            {field.required && <span className="text-[7px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100">Mandatory</span>}
                          </div>
                          <select value={mappings[field.key] || ''} onChange={e => setMappings({...mappings, [field.key]: e.target.value})} className="bg-transparent border-none p-0 text-[11px] font-black text-indigo-600 outline-none appearance-none cursor-pointer max-w-[200px] text-right">
                            <option value="">[ SKIP COMPONENT ]</option>
                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {step === 3 && (
          <div className="fixed inset-0 z-[60] bg-white flex flex-col font-['Plus_Jakarta_Sans'] animate-in fade-in duration-300">
             <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-6">
                   <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><FileSpreadsheet className="w-5 h-5" /></div>
                   <div>
                      <h2 className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Phase 3: Administrative Preview Workspace</h2>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Found {processedData.length} records for Batch {targetClass} • Stream {targetStream}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                   <button onClick={() => setStep(2)} className="px-8 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                     <ChevronLeft className="w-4 h-4" /> Return to Mapper
                   </button>
                   <button disabled={!isFinalizable || loading} onClick={handleFinalIntegration} className="bg-emerald-600 text-white px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-30 transition-all active:scale-95">
                     {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Finalize Enrollment
                   </button>
                </div>
             </div>

             <div className="flex-1 overflow-auto bg-slate-100/50 custom-scrollbar relative">
                <table className="border-collapse table-fixed min-w-full">
                  <thead className="sticky top-0 z-40 bg-slate-800 shadow-md">
                    <tr className="text-white text-[10px] font-black uppercase tracking-widest">
                       <th className="w-14 h-10 border-r border-slate-700 sticky left-0 z-50 bg-slate-800 text-center">S/N</th>
                       <th className="w-[200px] border-r border-slate-700 px-3 text-left sticky left-14 z-50 bg-slate-800">FULL NAME (AUTO)</th>
                       {gridFields.map(f => (
                         <th key={f.key} className="w-[180px] border-r border-slate-700 px-3 text-left whitespace-nowrap overflow-hidden text-ellipsis">{f.label.toUpperCase()}</th>
                       ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {processedData.map((row, i) => (
                      <tr key={i} className="hover:bg-indigo-50/30 transition-colors border-b border-slate-100">
                        <td className="h-8 border-r border-slate-200 sticky left-0 z-30 bg-slate-50 text-center text-[10px] font-black text-slate-400">{i + 1}</td>
                        <td className="border-r border-slate-200 sticky left-14 z-30 bg-white text-[11px] font-extrabold text-indigo-900 uppercase truncate px-2">{row.full_name}</td>
                        {gridFields.map(f => {
                          const val = f.key === 'ple_total' ? row.ple_info["total aggregates"] : f.key === 'uce_total' ? row.uce_info["total aggregates"] : row[f.key];
                          const isEditing = editingCell?.idx === i && editingCell?.key === f.key;
                          return (
                            <td key={f.key} onClick={() => setEditingCell({ idx: i, key: f.key })} className={`border-r border-slate-100 text-[11px] font-medium truncate relative cursor-text group/cell px-2 ${f.required && !val ? 'bg-red-50' : 'text-slate-600'}`}>
                              {isEditing ? (
                                <input ref={inputRef} value={val || ''} onBlur={() => setEditingCell(null)} onKeyDown={e => e.key === 'Enter' && setEditingCell(null)} onChange={e => updateCell(i, f.key, e.target.value)} className="absolute inset-0 w-full h-full bg-indigo-600 text-white font-black px-2 outline-none border-none z-50 text-[11px] uppercase shadow-2xl" />
                              ) : (
                                <div className="flex items-center justify-between h-full">
                                  <span className="uppercase truncate">{val || (f.required ? 'MISSING' : '')}</span>
                                  <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/cell:opacity-40" />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
             <div className="h-10 bg-slate-900 border-t border-indigo-800 px-8 flex items-center justify-between shrink-0 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] shadow-2xl z-50">
                <div className="flex gap-6">
                   <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-400 rounded-full"></div><span>Phones Normalized: +256</span></div>
                   <div className="flex items-center gap-2"><div className="w-2 h-2 bg-[#FACC15] rounded-full"></div><span>Split Logic: Comma Detected</span></div>
                </div>
                <span>ISO Format: DD/MM/YYYY • Workspace Secure</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngestionHub;