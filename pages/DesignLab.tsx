import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Palette, Upload, Save, Loader2, X, Plus,
  ChevronRight, Type, ImageIcon, QrCode, Barcode as BarcodeIcon,
  Trash2, MousePointer2, Settings2, ShieldCheck, Play, 
  Layers, ChevronLeft, DownloadCloud, Monitor, Layout
} from 'lucide-react';
import { supabase } from '../supabase';
import { IDTemplate, OverlayVariable, Student } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';
import saveAs from 'file-saver';

// Lead Dev Instruction: Stable PDF Initialization
const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.mjs';

const REGISTRY_VARIABLES = [
  { key: '{{full_name}}', label: 'Full Name', type: 'text' },
  { key: '{{reg_no}}', label: 'Reg Number', type: 'text' },
  { key: '{{class_id}}', label: 'Class ID', type: 'text' },
  { key: '{{stream_id}}', label: 'Stream ID', type: 'text' },
  { key: '{{combination}}', label: 'A-Level Comb', type: 'text' },
  { key: '{{expiry_date}}', label: 'Expiry Date', type: 'text' },
  { key: '{{photo}}', label: 'Biometric Photo', type: 'photo' },
  { key: '{{signature}}', label: 'Student Signature', type: 'signature' },
  { key: '{{barcode}}', label: 'PDF417 Barcode', type: 'barcode' },
  { key: '{{qr}}', label: 'QR Matrix', type: 'qr' },
];

const DesignLab: React.FC<{ schoolId: string }> = ({ schoolId }) => {
  const [activeType, setActiveType] = useState<'ID' | 'Report' | 'Certificate'>('ID');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [templates, setTemplates] = useState<IDTemplate[]>([]);
  const [template, setTemplate] = useState<IDTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingMsg, setProcessingMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [selectedVarId, setSelectedVarId] = useState<string | null>(null);
  const [testResultUrl, setTestResultUrl] = useState<string | null>(null);
  
  const WORKSPACE_WIDTH = 800; 
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (schoolId) fetchTemplates();
  }, [schoolId, activeType]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('id_templates')
        .select('*')
        .eq('school_id', schoolId)
        .eq('type', activeType)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setTemplates(data);
        if (activeType !== 'Certificate') {
          setTemplate(data[0]);
        } else {
          setTemplate(null);
        }
      } else {
        setTemplates([]);
        if (activeType !== 'Certificate') {
           createNewTemplate();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const createNewTemplate = () => {
    const newT: IDTemplate = {
      id: Math.random().toString(36).substring(7),
      school_id: schoolId,
      name: `Institutional ${activeType} Node ${templates.length + 1}`,
      type: activeType,
      orientation: 'landscape',
      overlay_data: { variables: [], grid_mappings: [] },
      design_data: {
        front: { backgroundUrl: null },
        back: { backgroundUrl: null }
      },
      is_active: true
    };
    setTemplate(newT);
  };

  const handleEditTemplate = (t: IDTemplate) => {
    setTemplate(t);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File too heavy: Please optimize your design PDF to under 5MB for stable processing.');
      return;
    }

    setLoading(true);
    setProcessingMsg('Processing Document...');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      
      const page1 = await pdf.getPage(1);
      const viewport1 = page1.getViewport({ scale: 2.5 }); 
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.width = viewport1.width;
      canvas.height = viewport1.height;
      
      await page1.render({ canvasContext: context, viewport: viewport1 }).promise;
      const frontPng = canvas.toDataURL('image/png');
      const { width: p1W, height: p1H } = page1.getViewport({ scale: 1.0 });

      let backPng = null;
      let p2W = 0, p2H = 0;
      if (pdf.numPages >= 2) {
        setProcessingMsg('Rendering Reverse Layer...');
        const page2 = await pdf.getPage(2);
        const viewport2 = page2.getViewport({ scale: 2.5 });
        canvas.width = viewport2.width;
        canvas.height = viewport2.height;
        await page2.render({ canvasContext: context, viewport: viewport2 }).promise;
        backPng = canvas.toDataURL('image/png');
        const { width, height } = page2.getViewport({ scale: 1.0 });
        p2W = width; p2H = height;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result as string;
        setTemplate(prev => {
          if (!prev) return null;
          return {
            ...prev,
            pdf_base64: base64,
            design_data: {
              front: { backgroundUrl: frontPng, dimensions: { width: p1W, height: p1H } },
              back: { backgroundUrl: backPng, dimensions: { width: p2W || p1W, height: p2H || p1H } }
            }
          };
        });
      };
      reader.readAsDataURL(file);

    } catch (err) {
      console.error(err);
      alert('Node Sync Failure: PDF Conversion Protocol Aborted.');
    } finally {
      setLoading(false);
      setProcessingMsg('');
    }
  };

  const addVariable = (v: typeof REGISTRY_VARIABLES[0]) => {
    if (!template || !template.design_data?.front.backgroundUrl) {
      alert('Upload Master PDF before placing nodes.');
      return;
    }
    
    const isAsset = ['photo', 'signature', 'barcode', 'qr'].includes(v.type);
    const newVar: OverlayVariable = {
      id: Math.random().toString(36).substring(7),
      key: v.key,
      type: v.type as any,
      side: activeSide,
      x: 50,
      y: 50,
      width: isAsset ? (v.type === 'photo' ? 80 : 120) : 150,
      height: isAsset ? (v.type === 'photo' ? 100 : 40) : 20,
      style: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#000000',
        textAlign: 'left'
      }
    };

    setTemplate({
      ...template,
      overlay_data: {
        ...template.overlay_data,
        variables: [...template.overlay_data.variables, newVar]
      }
    });
    setSelectedVarId(newVar.id);
  };

  const updateVariable = (id: string, updates: Partial<OverlayVariable>) => {
    if (!template) return;
    setTemplate({
      ...template,
      overlay_data: {
        ...template.overlay_data,
        variables: template.overlay_data.variables.map(v => v.id === id ? { ...v, ...updates } : v)
      }
    });
  };

  const handleDrag = (id: string, e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const target = template?.overlay_data.variables.find(x => x.id === id);
    if (!target) return;

    const startX = e.clientX - rect.left - target.x;
    const startY = e.clientY - rect.top - target.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = Math.round(moveEvent.clientX - rect.left - startX);
      const y = Math.round(moveEvent.clientY - rect.top - startY);
      updateVariable(id, { x, y });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const saveTemplate = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const dimensions = template.design_data?.front.dimensions;
      if (!dimensions) throw new Error("Document dimensions missing. Re-upload Master PDF.");

      const workspaceRatio = dimensions.width / WORKSPACE_WIDTH;
      const mappedVars = template.overlay_data.variables.map(v => ({
        ...v,
        nx: v.x * workspaceRatio,
        ny: v.y * workspaceRatio 
      }));

      const { error } = await supabase.from('id_templates').upsert([{
        ...template,
        overlay_data: {
          ...template.overlay_data,
          variables: mappedVars
        }
      }]);
      
      if (error) throw error;

      // LOGGING: Template Sync
      await supabase.from('audit_logs').insert([{
        operator_email: session?.user.email,
        operator_type: 'System Operator',
        action: `TEMPLATE_SYNC_SUCCESS: ${template.name} (${activeType}) updated with ${mappedVars.length} nodes`,
        entity_id: schoolId,
        entity_type: 'SCHOOL'
      }]);

      alert('Institutional Design Synchronized.');
      fetchTemplates();
    } catch (err: any) {
      alert(`Sync Failure: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const runLiveTest = async () => {
    if (!template?.pdf_base64) return;
    setTesting(true);
    try {
      const { data: students } = await supabase.from('students').select('*').eq('school_id', schoolId).limit(1);
      const sample = students?.[0] || { full_name: 'SAMPLE STUDENT', reg_no: 'REG/001/2024', class_id: 'S.1', stream_id: 'WHITE' };

      const pdfBytesInput = template.pdf_base64.includes('base64,') 
        ? template.pdf_base64.split('base64,')[1] 
        : template.pdf_base64;

      const pdfDoc = await PDFDocument.load(pdfBytesInput);
      const pages = pdfDoc.getPages();
      const workspaceRatio = template.design_data!.front.dimensions!.width / WORKSPACE_WIDTH;

      for (const v of template.overlay_data.variables) {
        const sideIdx = v.side === 'back' && pages.length >= 2 ? 1 : 0;
        const page = pages[sideIdx];
        const { height: pdfHeight } = page.getSize();

        const pdfX = v.x * workspaceRatio;
        const pdfY = pdfHeight - (v.y * workspaceRatio) - (v.height * workspaceRatio);

        if (v.type === 'text') {
          const key = v.key.replace('{{', '').replace('}}', '');
          const val = String(sample[key as keyof Student] || v.key);
          page.drawText(val, {
            x: pdfX,
            y: pdfY + (v.height * workspaceRatio * 0.2), 
            size: v.style.fontSize * workspaceRatio,
            color: rgb(0, 0, 0)
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      setTestResultUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      alert('Test Engine Failure: Could not inject data nodes.');
    } finally {
      setTesting(false);
    }
  };

  const currentBackground = activeSide === 'front' ? template?.design_data?.front.backgroundUrl : template?.design_data?.back.backgroundUrl;
  const currentDimensions = activeSide === 'front' ? template?.design_data?.front.dimensions : template?.design_data?.back.dimensions;
  
  const displayHeight = useMemo(() => {
    if (!currentDimensions) return 600;
    const ratio = currentDimensions.height / currentDimensions.width;
    return WORKSPACE_WIDTH * ratio;
  }, [currentDimensions]);

  const selectedVar = useMemo(() => 
    template?.overlay_data.variables.find(v => v.id === selectedVarId),
    [selectedVarId, template]
  );

  return (
    <div className="flex flex-col h-[850px] animate-in fade-in duration-500 overflow-hidden bg-slate-50 rounded-[3rem] border border-slate-200">
      <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30 shadow-sm px-10">
        <div className="flex items-center gap-5">
           <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Palette className="w-6 h-6" /></div>
           <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Institutional Artifact Designer</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest">Master Layer Injection • {activeType} MODE</p>
           </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
           {(['ID', 'Report', 'Certificate'] as const).map(t => (
             <button key={t} onClick={() => { setActiveType(t); setTemplate(null); }} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeType === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}>{t}</button>
           ))}
        </div>

        {template ? (
          <div className="flex gap-3">
             <button onClick={() => { setTemplate(null); setSelectedVarId(null); }} className="px-5 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-slate-200 hover:bg-white transition-all">
                <ChevronLeft className="w-4 h-4" /> REPOSITORY
             </button>
             <input type="file" id="master-pdf" className="hidden" accept=".pdf" onChange={handlePdfUpload} />
             <label htmlFor="master-pdf" className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg cursor-pointer hover:bg-black transition-all">
                <Upload className="w-4 h-4" /> UPLOAD MASTER PDF
             </label>
             <button onClick={runLiveTest} disabled={!template?.pdf_base64 || testing} className="px-6 py-2.5 bg-[#FACC15] text-indigo-950 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50">
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} TEST INJECTION
             </button>
             <button onClick={saveTemplate} disabled={saving} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl active:scale-95">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} SYNC DESIGN
             </button>
          </div>
        ) : (
          <button onClick={createNewTemplate} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl">
             <Plus className="w-4 h-4" /> INITIALIZE TEMPLATE
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[100] flex flex-col items-center justify-center gap-4">
             <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
             <p className="text-sm font-black text-slate-800 uppercase tracking-widest animate-pulse">{processingMsg || 'Syncing Node...'}</p>
          </div>
        )}

        {template ? (
           <>
             <div className="w-72 border-r border-slate-200 bg-white p-6 space-y-8 overflow-y-auto no-scrollbar shadow-inner shrink-0">
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2"><Layers className="w-4 h-4" /> Registry Nodes</h4>
                   <div className="grid grid-cols-1 gap-2">
                      {REGISTRY_VARIABLES.map(v => (
                        <button key={v.key} onClick={() => addVariable(v)} className="w-full p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl transition-all group flex items-center justify-between">
                           <div className="text-left">
                             <p className="text-[10px] font-black text-slate-700 uppercase group-hover:text-indigo-600">{v.label}</p>
                             <p className="text-[8px] font-bold text-slate-400 mt-0.5">{v.key}</p>
                           </div>
                           {v.type === 'text' ? <Type className="w-4 h-4 text-slate-300" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                        </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 flex gap-1 bg-white p-1.5 rounded-2xl shadow-2xl border border-slate-200">
                <button onClick={() => setActiveSide('front')} className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSide === 'front' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'}`}><Monitor className="w-4 h-4" /> FRONT LAYER</button>
                <button disabled={!template.design_data?.back.backgroundUrl} onClick={() => setActiveSide('back')} className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeSide === 'back' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-indigo-600'} disabled:opacity-30 disabled:cursor-not-allowed`}><Layout className="w-4 h-4" /> BACK LAYER</button>
             </div>

             <div className="flex-1 bg-slate-100 p-24 overflow-auto flex flex-col items-center custom-scrollbar">
                <div ref={containerRef} className="bg-white shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] relative rounded-sm border border-slate-300 overflow-hidden shrink-0 transition-all duration-500" style={{ width: WORKSPACE_WIDTH, height: displayHeight }}>
                   {currentBackground ? <img src={currentBackground} className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none" draggable={false} /> : <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 space-y-4 animate-pulse bg-slate-50"><ImageIcon className="w-16 h-16" /><p className="text-[11px] font-black uppercase tracking-[0.5em]">Load Artifact Stationery</p></div>}
                   {template.overlay_data.variables.filter(v => v.side === activeSide || (!v.side && activeSide === 'front')).map(v => (
                     <div key={v.id} onMouseDown={(e) => { e.stopPropagation(); setSelectedVarId(v.id); handleDrag(v.id, e); }} className={`absolute flex items-center justify-center cursor-move transition-all border-2 border-dashed ${selectedVarId === v.id ? 'border-indigo-600 bg-indigo-50/40 ring-4 ring-indigo-500/10' : 'border-indigo-400/30 hover:border-indigo-400/60 bg-white/30'}`} style={{ left: `${v.x}px`, top: `${v.y}px`, width: `${v.width}px`, height: `${v.height}px`, fontSize: `${v.style.fontSize}px`, fontWeight: 'bold', color: v.style.color, zIndex: 20 }}>
                        <div className="text-center px-2"><p className="text-[8px] font-black uppercase tracking-tighter text-indigo-800 pointer-events-none truncate">{v.key}</p>{['barcode', 'qr'].includes(v.type) && <BarcodeIcon className="w-6 h-6 mx-auto mt-1 text-indigo-400 opacity-50" />}</div>
                        {selectedVarId === v.id && <button onClick={(e) => { e.stopPropagation(); setTemplate({ ...template, overlay_data: { ...template.overlay_data, variables: template.overlay_data.variables.filter(x => x.id !== v.id) }}); setSelectedVarId(null); }} className="absolute -top-3 -right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all"><X className="w-3 h-3" /></button>}
                     </div>
                   ))}
                </div>
             </div>

             <div className="w-80 border-l border-slate-200 bg-white p-8 space-y-10 shadow-inner shrink-0 overflow-y-auto no-scrollbar">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-4"><Settings2 className="w-4 h-4" /> Node Properties</h4>
                {selectedVar ? (
                  <div className="space-y-8 animate-in slide-in-from-right-4">
                     <div className="space-y-4">
                        <div className="flex justify-between items-center"><label className="text-[9px] font-black text-slate-500 uppercase">Font Scale</label><span className="text-[10px] font-black text-indigo-600">{selectedVar.style.fontSize}px</span></div>
                        <input type="range" min="6" max="48" value={selectedVar.style.fontSize} onChange={e => updateVariable(selectedVar.id, { style: { ...selectedVar.style, fontSize: parseInt(e.target.value) }})} className="w-full accent-indigo-600" />
                     </div>
                     <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100">
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Layer-X</label><input type="number" value={Math.round(selectedVar.x)} onChange={e => updateVariable(selectedVar.id, { x: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-black" /></div>
                        <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Layer-Y</label><input type="number" value={Math.round(selectedVar.y)} onChange={e => updateVariable(selectedVar.id, { y: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3 text-[10px] font-black" /></div>
                     </div>
                  </div>
                ) : (
                  <div className="py-32 text-center opacity-20 space-y-6"><MousePointer2 className="w-12 h-12 mx-auto" /><p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed">Choose a node<br/>on the workspace</p></div>
                )}
             </div>
           </>
        ) : (
          <div className="flex-1 p-16 overflow-y-auto custom-scrollbar bg-slate-50">
             <div className="max-w-6xl mx-auto space-y-12">
                <div className="flex justify-between items-end border-b border-slate-200 pb-8">
                   <div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Institutional Repository</h2>
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Authorized design nodes for school artifacts.</p>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                   {templates.map(t => (
                     <div key={t.id} className="bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl transition-all group flex flex-col h-[420px]">
                        <div className="flex-1 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                           {t.design_data?.front.backgroundUrl ? <img src={t.design_data.front.backgroundUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-100 transition-opacity" /> : <ImageIcon className="w-16 h-16 text-slate-200" />}
                           <div className="absolute top-6 right-6 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">{t.orientation}</div>
                        </div>
                        <div className="p-8 space-y-6 bg-white shrink-0">
                           <div>
                              <h4 className="text-base font-black text-slate-800 uppercase tracking-tight truncate">{t.name}</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t.overlay_data.variables.length} Verified Data Nodes</p>
                           </div>
                           <div className="grid grid-cols-1 gap-3">
                              <button onClick={() => handleEditTemplate(t)} className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"><Monitor className="w-4 h-4" /> ACCESS DESIGNER</button>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>

      {testResultUrl && (
        <div className="fixed inset-0 z-[500] bg-indigo-950/95 backdrop-blur-2xl flex items-center justify-center p-10 overflow-hidden">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-7xl h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl"><ShieldCheck className="w-7 h-7" /></div>
                    <div>
                       <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">Injection Sequence Verified</h2>
                       <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">Real-time Node Rendering with Institutional Registry Data.</p>
                    </div>
                 </div>
                 <button onClick={() => setTestResultUrl(null)} className="p-5 hover:bg-white rounded-[1.5rem] transition-all text-slate-300 hover:text-red-500 shadow-sm"><X className="w-8 h-8" /></button>
              </div>
              <div className="flex-1 bg-slate-200/50 p-12 overflow-hidden shadow-inner">
                 <iframe src={testResultUrl} className="w-full h-full rounded-[2rem] border border-slate-300 shadow-2xl bg-white" />
              </div>
              <div className="p-10 flex justify-center gap-6 bg-white border-t border-slate-100 shrink-0">
                 <a href={testResultUrl} download={`${template?.name}_Verification_Record.pdf`} className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl active:scale-95 transition-all flex items-center gap-4"><DownloadCloud className="w-6 h-6" /> Export Verification Record</a>
                 <button onClick={() => setTestResultUrl(null)} className="px-12 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] hover:bg-white border border-slate-200">Return to Node Config</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DesignLab;