import React, { useState, useEffect, useRef, useMemo } from 'react';
/* Fix: Added missing ShieldAlert icon to the lucide-react imports */
import { 
  Camera, PenTool, Upload, Search, X, Loader2, 
  CheckCircle2, AlertCircle, RefreshCw, Save, 
  Database, UserCircle, ShieldCheck, ArrowRight,
  Filter, ChevronRight, Image as ImageIcon, Trash2, ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabase';
import { Student } from '../types';

interface BiometricEngineProps {
  schoolId: string;
}

interface MatchingResult {
  id: string;
  filename: string;
  file: File;
  preview: string;
  matchedStudentId: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'NONE';
  status: 'PENDING' | 'READY' | 'UNMATCHED';
  type: 'PHOTO' | 'SIGNATURE';
}

const BiometricEngine: React.FC<BiometricEngineProps> = ({ schoolId }) => {
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Selection State
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [availableStreams, setAvailableStreams] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState('');
  
  // Data State
  const [targetStudents, setTargetStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<MatchingResult[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchClassContext();
  }, [schoolId]);

  const fetchClassContext = async () => {
    setLoading(true);
    try {
      // Fetch unique classes that actually have students
      const { data } = await supabase
        .from('students')
        .select('class_id')
        .eq('school_id', schoolId);
      
      if (data) {
        const unique = Array.from(new Set(data.map(s => s.class_id))).filter(Boolean).sort();
        setAvailableClasses(unique as string[]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (cid: string) => {
    setSelectedClass(cid);
    setSelectedStream('');
    setTargetStudents([]);
    
    const { data } = await supabase
      .from('students')
      .select('stream_id')
      .eq('school_id', schoolId)
      .eq('class_id', cid);
    
    if (data) {
      const unique = Array.from(new Set(data.map(s => s.stream_id))).filter(Boolean).sort();
      setAvailableStreams(unique as string[]);
    }
  };

  const loadTargetPool = async (stream: string) => {
    setSelectedStream(stream);
    const { data } = await supabase
      .from('students')
      // Add school_id to selected fields to match Student interface
      .select('id, school_id, full_name, reg_no, class_id, stream_id, photo_url, signature_url')
      .eq('school_id', schoolId)
      .eq('class_id', selectedClass)
      .eq('stream_id', stream)
      .order('full_name');
    if (data) setTargetStudents(data);
  };

  const normalize = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const processImage = async (file: File, type: 'PHOTO' | 'SIGNATURE'): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          if (type === 'PHOTO') {
            const scale = 300 / img.width;
            canvas.width = 300;
            canvas.height = img.height * scale;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          } else {
            // Signature Purification: Pure Black Ink Logic
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              // Calculate luminance
              const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
              
              if (luma > 140) { // Background Threshold
                data[i + 3] = 0; // Transparent
              } else {
                data[i] = 0; data[i+1] = 0; data[i+2] = 0; // Pure Black
              }
            }
            ctx.putImageData(imageData, 0, 0);
            
            // Re-scale purified signature
            const finalCanvas = document.createElement('canvas');
            const finalCtx = finalCanvas.getContext('2d')!;
            const scale = Math.min(1, 400 / canvas.width);
            finalCanvas.width = canvas.width * scale;
            finalCanvas.height = canvas.height * scale;
            finalCtx.drawImage(canvas, 0, 0, finalCanvas.width, finalCanvas.height);
            resolve(finalCanvas.toDataURL('image/png'));
          }
        };
      };
    });
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'PHOTO' | 'SIGNATURE') => {
    // Fix: Explicitly cast Array.from result to File[] to avoid 'unknown' type errors during iteration.
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setProcessing(true);
    setStep(2);
    
    const newResults: MatchingResult[] = [];
    let processed = 0;

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      const filename = file.name.split('.')[0];
      const normFilename = normalize(filename);
      
      // Triple-Check Matching Logic
      let matchedId = null;
      let confidence: 'HIGH' | 'MEDIUM' | 'NONE' = 'NONE';

      // 1. Reg No Match
      const regMatch = targetStudents.find(s => normalize(s.reg_no || '') === normFilename);
      if (regMatch) {
        matchedId = regMatch.id;
        confidence = 'HIGH';
      } else {
        // 2. Fuzzy Name Match
        const nameMatch = targetStudents.find(s => normalize(s.full_name) === normFilename);
        if (nameMatch) {
          matchedId = nameMatch.id;
          confidence = 'MEDIUM';
        }
      }

      const base64 = await processImage(file, type);

      newResults.push({
        id: Math.random().toString(36).substring(7),
        filename: file.name,
        file,
        preview: base64,
        matchedStudentId: matchedId,
        confidence,
        status: matchedId ? 'READY' : 'UNMATCHED',
        type
      });

      processed++;
      setProgress(Math.round((processed / files.length) * 100));
    }

    setResults(prev => [...prev, ...newResults]);
    setProcessing(false);
    setProgress(0);
  };

  const handleManualMatch = (resultId: string, studentId: string) => {
    setResults(prev => prev.map(r => r.id === resultId ? {
      ...r,
      matchedStudentId: studentId,
      confidence: 'MEDIUM',
      status: 'READY'
    } : r));
  };

  const handleFinalize = async () => {
    const ready = results.filter(r => r.status === 'READY' && r.matchedStudentId);
    if (ready.length === 0) return;

    setProcessing(true);
    try {
      for (const res of ready) {
        const updateObj = res.type === 'PHOTO' 
          ? { photo_url: res.preview } 
          : { signature_url: res.preview };
        
        await supabase
          .from('students')
          .update(updateObj)
          .eq('id', res.matchedStudentId);
      }
      alert(`Synchronized ${ready.length} biometric assets to registry.`);
      setResults([]);
      setStep(1);
    } catch (err) {
      alert("Batch write failed. Verify connection.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Context Selection Bar */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
           <div className="p-3 bg-indigo-600 text-white rounded-2xl"><Filter className="w-6 h-6" /></div>
           <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter">1. Contextual Selection</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Define the target registry node pool</p>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Target Class</label>
              <select 
                value={selectedClass} 
                onChange={e => handleClassChange(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-black text-sm uppercase transition-all"
              >
                <option value="">[ SELECT CLASS ]</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Registry Stream</label>
              <select 
                disabled={!selectedClass}
                value={selectedStream} 
                onChange={e => loadTargetPool(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-black text-sm uppercase transition-all disabled:opacity-30"
              >
                <option value="">[ SELECT STREAM ]</option>
                {availableStreams.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
        </div>
      </div>

      {step === 1 && (
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-opacity ${!selectedStream ? 'opacity-30 pointer-events-none' : ''}`}>
           <div className="bg-white p-12 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-6 group hover:border-indigo-400 transition-all">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                 <Camera className="w-10 h-10" />
              </div>
              <div className="text-center">
                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Upload Photo Folder</h4>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Images auto-scaled to 300px width</p>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                //@ts-ignore
                webkitdirectory="" 
                directory="" 
                onChange={e => handleFolderUpload(e, 'PHOTO')} 
              />
              <button onClick={() => fileInputRef.current?.click()} className="px-12 py-4 bg-[#0F172A] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-black transition-all">Initialize Photo Ingress</button>
           </div>

           <div className="bg-white p-12 rounded-[4rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center space-y-6 group hover:border-emerald-400 transition-all">
              <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-[2.5rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                 <PenTool className="w-10 h-10" />
              </div>
              <div className="text-center">
                 <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Upload Signatures</h4>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Background remover & Ink purification active</p>
              </div>
              <input 
                type="file" 
                ref={sigInputRef} 
                className="hidden" 
                //@ts-ignore
                webkitdirectory="" 
                directory="" 
                onChange={e => handleFolderUpload(e, 'SIGNATURE')} 
              />
              <button onClick={() => sigInputRef.current?.click()} className="px-12 py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-emerald-700 transition-all">Initialize Signature Ingress</button>
           </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-in slide-in-from-bottom-6">
           {/* Progress Indicator */}
           {processing && (
             <div className="bg-[#1E1B4B] p-8 rounded-[3rem] shadow-2xl border border-indigo-900 text-white space-y-4">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                      <Loader2 className="w-6 h-6 text-[#FACC15] animate-spin" />
                      <span className="text-[11px] font-black uppercase tracking-[0.3em]">Institutional Asset Engine: Processing...</span>
                   </div>
                   <span className="text-xl font-black text-[#FACC15]">{progress}%</span>
                </div>
                <div className="h-3 w-full bg-indigo-950 rounded-full overflow-hidden border border-indigo-800">
                   <div className="h-full bg-[#FACC15] transition-all duration-300 shadow-[0_0_15px_rgba(250,204,21,0.5)]" style={{ width: `${progress}%` }}></div>
                </div>
             </div>
           )}

           <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center shrink-0 px-12">
                 <div className="flex items-center gap-5">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100"><Database className="w-6 h-6" /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Ingestion Audit Grid</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Matching {results.length} files against {targetStudents.length} candidates in {selectedClass} {selectedStream}</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => { setResults([]); setStep(1); }} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">Abort Batch</button>
                    <button 
                      onClick={handleFinalize}
                      disabled={processing || results.filter(r => r.status === 'READY').length === 0}
                      className="px-10 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                       <ShieldCheck className="w-4 h-4" /> Finalize Assets
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-x-auto custom-scrollbar">
                 <table className="w-full text-left table-dense">
                    <thead>
                       <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                          <th className="px-10 py-5">Source Preview</th>
                          <th className="px-10 py-5">File Label</th>
                          <th className="px-10 py-5">Matched Institutional Identity</th>
                          <th className="px-10 py-5">Audit Confidence</th>
                          <th className="px-10 py-5 text-right">Registry Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {results.map((res) => (
                         <tr key={res.id} className={`hover:bg-slate-50 transition-colors group ${res.status === 'UNMATCHED' ? 'bg-red-50/10' : ''}`}>
                            <td className="px-10 py-4">
                               <div className="w-12 h-12 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm group-hover:scale-125 transition-transform duration-300">
                                  <img src={res.preview} className="w-full h-full object-contain" />
                               </div>
                            </td>
                            <td className="px-10 py-4">
                               <span className="text-[11px] font-bold text-slate-500 font-mono truncate max-w-[150px] block">{res.filename}</span>
                            </td>
                            <td className="px-10 py-4">
                               {res.status === 'READY' ? (
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center"><UserCircle className="w-5 h-5 text-indigo-400" /></div>
                                    <div>
                                       <p className="text-[12px] font-black text-slate-800 uppercase leading-none">
                                          {targetStudents.find(s => s.id === res.matchedStudentId)?.full_name}
                                       </p>
                                       <p className="text-[9px] font-bold text-indigo-400 uppercase mt-1">
                                          ID: {targetStudents.find(s => s.id === res.matchedStudentId)?.reg_no}
                                       </p>
                                    </div>
                                    <button onClick={() => setResults(prev => prev.map(r => r.id === res.id ? {...r, matchedStudentId: null, status: 'UNMATCHED', confidence: 'NONE'} : r))} className="p-1 text-slate-300 hover:text-red-500 ml-2 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                                 </div>
                               ) : (
                                 <div className="flex items-center gap-3">
                                    <select 
                                      className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase text-red-600 outline-none"
                                      onChange={e => handleManualMatch(res.id, e.target.value)}
                                    >
                                       <option value="">[ MANUAL LINK ]</option>
                                       {targetStudents.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.reg_no})</option>)}
                                    </select>
                                 </div>
                               )}
                            </td>
                            <td className="px-10 py-4">
                               <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5 w-fit ${
                                 res.confidence === 'HIGH' ? 'bg-emerald-50 text-emerald-600' : 
                                 res.confidence === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 
                                 'bg-red-50 text-red-600'
                               }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${res.confidence === 'HIGH' ? 'bg-emerald-500' : res.confidence === 'MEDIUM' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                                  {res.confidence} CONFIDENCE
                               </span>
                            </td>
                            <td className="px-10 py-4 text-right">
                               {res.status === 'READY' ? (
                                 <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center justify-end gap-2"><CheckCircle2 className="w-4 h-4" /> VERIFIED</span>
                               ) : (
                                 <span className="text-[10px] font-black text-red-400 uppercase flex items-center justify-end gap-2 animate-pulse"><AlertCircle className="w-4 h-4" /> LINK REQUIRED</span>
                               )}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      )}

      {/* Helper Notice */}
      <div className="bg-indigo-50/50 p-8 rounded-[3rem] border border-indigo-100 flex items-start gap-4">
         {/* Fix: Usage of ShieldAlert which was missing from imports at line 12 */}
         <ShieldAlert className="w-6 h-6 text-indigo-500 shrink-0 mt-1" />
         <div>
            <h4 className="text-[11px] font-black text-indigo-900 uppercase tracking-widest">Biometric Processing Protocol</h4>
            <p className="text-[10px] text-indigo-700 font-bold leading-relaxed mt-1 uppercase">
               The engine uses automated thresholding for signatures. If paper textures persist, consider re-capturing in natural light. 
               All assets are compressed client-side to ensure registry speed and low database overhead.
            </p>
         </div>
      </div>
    </div>
  );
};

export default BiometricEngine;