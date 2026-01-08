import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CreditCard, Type, Image as ImageIcon, Save, Plus, Trash2, Loader2,
  X, MousePointer2, Move, Layout, FileText, Stamp, Layers, Search, 
  Settings2, Target, Eye, EyeOff, Table as TableIcon, Maximize, Crosshair,
  Upload, MousePointer, Palette, Users, Monitor, MonitorSmartphone,
  Download, QrCode, Barcode as BarcodeIcon, Bold, Italic, 
  ArrowUp, ArrowDown, MapPin, Building2, Phone, Sparkles, PenTool,
  CheckCircle2, Filter
} from 'lucide-react';
import { supabase } from '../supabase';
// Fix: MASTER_REGISTRY_FIELDS is the correct export name from types.ts. Added alias to match local usage.
import { School, MASTER_REGISTRY_FIELDS as STUDENT_FIELD_REGISTRY, CanvasElement } from '../types';
import * as Tesseract from 'tesseract.js';

interface BarcodeConfig {
  fields: string[];
  format: 'PSV' | 'JSON';
}

interface SideState {
  elements: CanvasElement[];
  backgroundUrl: string | null;
}

const IDDesigner: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [templateName, setTemplateName] = useState('Identity Standard Node');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewClass, setPreviewClass] = useState('');
  
  // Dual side state
  const [frontState, setFrontState] = useState<SideState>({ elements: [], backgroundUrl: null });
  const [backState, setBackState] = useState<SideState>({ elements: [], backgroundUrl: null });
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const canvasRefFront = useRef<HTMLDivElement>(null);
  const canvasRefBack = useRef<HTMLDivElement>(null);

  const currentSideState = activeSide === 'front' ? frontState : backState;
  const setSideState = activeSide === 'front' ? setFrontState : setBackState;

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    if (data) setSchools(data);
  };

  const handleSchoolSelect = async (id: string) => {
    setSelectedSchoolId(id);
    const { data } = await supabase.from('id_templates').select('*').eq('school_id', id).maybeSingle();
    if (data && data.design_data) {
      setFrontState(data.design_data.front || { elements: [], backgroundUrl: null });
      setBackState(data.design_data.back || { elements: [], backgroundUrl: null });
      setTemplateName(data.name);
      setOrientation(data.orientation || 'landscape');
    }
  };

  // --- LOCAL OCR ---
  const handleOcrDetection = async () => {
    if (!currentSideState.backgroundUrl) return;
    setAnalyzing(true);
    try {
      const result = await Tesseract.recognize(currentSideState.backgroundUrl, 'eng');
      const words = result.data.words;
      const newElements: CanvasElement[] = words.map((w, i) => {
        const bbox = w.bbox;
        return {
          id: `ocr-${Date.now()}-${i}`,
          type: 'text' as const,
          content: w.text,
          x: bbox.x0,
          y: bbox.y0,
          width: bbox.x1 - bbox.x0,
          height: bbox.y1 - bbox.y0,
          fontSize: Math.round((bbox.y1 - bbox.y0) * 0.8),
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#000000'
        };
      }).filter(el => el.content.length > 2);

      setSideState(prev => ({ ...prev, elements: [...prev.elements, ...newElements] }));
      alert(`Localized ${newElements.length} text blocks.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const addElement = (type: CanvasElement['type'], content: string) => {
    const isAsset = ['photo', 'barcode', 'qr', 'signature', 'officer_signature'].includes(type);
    const newEl: CanvasElement = {
      id: Math.random().toString(36).substring(7),
      type,
      content,
      x: 100,
      y: 100,
      width: isAsset ? (type === 'photo' ? 90 : 120) : 150,
      height: isAsset ? (type === 'photo' ? 110 : 40) : 25,
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      barcodeConfig: (type === 'barcode' || type === 'qr') ? {
        fields: ['full_name', 'reg_no', 'class_id'],
        format: 'PSV'
      } : undefined
    };
    setSideState(prev => ({ ...prev, elements: [...prev.elements, newEl] }));
    setSelectedElementId(newEl.id);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setFrontState(prev => ({ ...prev, elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el) }));
    setBackState(prev => ({ ...prev, elements: prev.elements.map(el => el.id === id ? { ...el, ...updates } : el) }));
  };

  const handleDrag = (id: string, e: React.MouseEvent, side: 'front' | 'back') => {
    const canvas = side === 'front' ? canvasRefFront.current : canvasRefBack.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const element = (side === 'front' ? frontState : backState).elements.find(el => el.id === id);
    if (!element) return;

    const startX = e.clientX - rect.left - element.x;
    const startY = e.clientY - rect.top - element.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const x = moveEvent.clientX - rect.left - startX;
      const y = moveEvent.clientY - rect.top - startY;
      updateElement(id, { x, y });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResize = (id: string, e: React.MouseEvent, corner: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    const element = [...frontState.elements, ...backState.elements].find(el => el.id === id);
    if (!element) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = element.width;
    const startH = element.height;
    const startPosX = element.x;
    const startPosY = element.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startW;
      let newHeight = startH;
      let newX = startPosX;
      let newY = startPosY;

      if (corner.includes('e')) newWidth = Math.max(20, startW + deltaX);
      if (corner.includes('s')) newHeight = Math.max(20, startH + deltaY);
      if (corner.includes('w')) {
        newWidth = Math.max(20, startW - deltaX);
        newX = startPosX + deltaX;
      }
      if (corner.includes('n')) {
        newHeight = Math.max(20, startH - deltaY);
        newY = startPosY + deltaY;
      }

      updateElement(id, { width: newWidth, height: newHeight, x: newX, y: newY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const saveTemplate = async () => {
    if (!selectedSchoolId) return;
    setSaving(true);
    try {
      await supabase.from('id_templates').upsert([{
        school_id: selectedSchoolId,
        name: templateName,
        orientation,
        design_data: { front: frontState, back: backState },
        type: 'ID',
        is_active: true
      }]);
      alert('Identity synchronized.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setSideState(prev => ({ ...prev, backgroundUrl: evt.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const selectedEl = useMemo(() => 
    [...frontState.elements, ...backState.elements].find(el => el.id === selectedElementId),
    [selectedElementId, frontState, backState]
  );

  const activeSchool = schools.find(s => s.id === selectedSchoolId);
  const availableClasses = useMemo(() => {
    if (!activeSchool) return [];
    const list: string[] = [];
    if (activeSchool.offered_levels?.includes('Primary')) list.push('P.1','P.2','P.3','P.4','P.5','P.6','P.7');
    if (activeSchool.offered_levels?.includes('O-Level')) list.push('S.1','S.2','S.3','S.4');
    if (activeSchool.offered_levels?.includes('A-Level')) list.push('S.5','S.6');
    return list;
  }, [activeSchool]);

  const renderCanvas = (side: 'front' | 'back', ref: React.RefObject<HTMLDivElement | null>) => {
    const state = side === 'front' ? frontState : backState;
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-between w-full px-2">
           <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{side} Matrix</span>
           <button onClick={() => { setActiveSide(side); setSelectedElementId(null); }} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${activeSide === side ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400'}`}>Target Side</button>
        </div>
        <div 
          ref={ref as React.RefObject<HTMLDivElement>}
          className={`bg-white shadow-2xl relative overflow-hidden border border-slate-200 transition-all cursor-crosshair ${orientation === 'landscape' ? 'id-card-landscape' : 'id-card-portrait'} ${activeSide === side ? 'ring-4 ring-indigo-500/20' : 'opacity-80 grayscale-[0.4]'}`}
          style={{ 
            backgroundImage: state.backgroundUrl ? `url(${state.backgroundUrl})` : 'none', 
            backgroundSize: '100% 100%',
            zoom: '0.8'
          }}
        >
          {state.elements.map(el => (
            <div 
              key={el.id}
              onMouseDown={(e) => { e.stopPropagation(); setActiveSide(side); setSelectedElementId(el.id); handleDrag(el.id, e, side); }}
              className={`absolute select-none flex items-center justify-center group ${selectedElementId === el.id ? 'ring-2 ring-indigo-600 bg-indigo-50/10' : 'hover:ring-1 hover:ring-indigo-300'}`}
              style={{ 
                left: `${el.x}px`, top: `${el.y}px`, width: `${el.width}px`, height: `${el.height}px`,
                fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight, fontStyle: el.fontStyle, color: el.color,
                zIndex: 10
              }}
            >
              <div className="w-full h-full flex items-center justify-center text-center overflow-hidden">
                {el.type === 'photo' ? <div className="w-full h-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300 text-slate-300"><Users className="w-8 h-8" /></div> : 
                 el.type === 'barcode' ? <BarcodeIcon className="w-full h-full opacity-40" /> :
                 el.type === 'qr' ? <QrCode className="w-full h-full opacity-40" /> :
                 el.type === 'signature' ? <PenTool className="w-6 h-6 opacity-30" /> :
                 el.type === 'officer_signature' ? <Stamp className="w-6 h-6 opacity-30" /> :
                 <span className="truncate w-full font-bold uppercase">{el.content.replace('{{', '').replace('}}', '').replace(/_/g, ' ')}</span>}
              </div>
              {selectedElementId === el.id && (
                <>
                  <div onMouseDown={(e) => handleResize(el.id, e, 'nw')} className="resize-handle resize-handle-nw" />
                  <div onMouseDown={(e) => handleResize(el.id, e, 'ne')} className="resize-handle resize-handle-ne" />
                  <div onMouseDown={(e) => handleResize(el.id, e, 'sw')} className="resize-handle resize-handle-sw" />
                  <div onMouseDown={(e) => handleResize(el.id, e, 'se')} className="resize-handle resize-handle-se" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700 max-w-[1700px] mx-auto pb-20">
      {/* Header Studio Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm px-10">
        <div className="flex items-center gap-6">
           <div className="p-4 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl"><Palette className="w-8 h-8" /></div>
           <div>
              <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Identity Studio Pro</h1>
              <div className="flex items-center gap-4 mt-1">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Synchronous Design Engine</p>
                 <div className="h-3 w-px bg-slate-200"></div>
                 <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)} className="bg-slate-50 border-none rounded-lg px-3 py-1 text-[10px] font-black text-indigo-600 outline-none w-48" />
              </div>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={saveTemplate} disabled={saving} className="bg-indigo-950 text-[#FACC15] px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl active:scale-95 transition-all">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} SYNC IDENTITY
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Toolbelt (Left) */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-[#1E1B4B] p-8 rounded-[3rem] shadow-2xl border border-indigo-900 space-y-6">
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">Institution Target</label>
                 <select value={selectedSchoolId} onChange={e => handleSchoolSelect(e.target.value)} className="w-full bg-indigo-950 border border-indigo-800 text-white rounded-xl p-3.5 text-xs font-bold outline-none">
                    <option value="">SELECT SCHOOL...</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                 </select>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                 <button onClick={() => setOrientation('landscape')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${orientation === 'landscape' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-900/40 text-indigo-400'}`}>Landscape</button>
                 <button onClick={() => setOrientation('portrait')} className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${orientation === 'portrait' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-indigo-900/40 text-indigo-400'}`}>Portrait</button>
              </div>

              <div className="pt-4 space-y-3">
                 <input type="file" id="bg-upload" className="hidden" onChange={handleBackgroundUpload} />
                 <label htmlFor="bg-upload" className="w-full py-4 bg-white text-indigo-950 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 cursor-pointer hover:bg-indigo-50 transition-all shadow-lg">
                    <Upload className="w-4 h-4" /> Load Stationery
                 </label>
                 {currentSideState.backgroundUrl && (
                    <button onClick={handleOcrDetection} disabled={analyzing} className="w-full py-4 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-500/40 transition-all">
                       {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Recognize Content
                    </button>
                 )}
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2"><Layers className="w-4 h-4" /> Placeholders</h4>
                 <div className="grid grid-cols-2 gap-2">
                    {STUDENT_FIELD_REGISTRY.slice(0, 14).map(v => (
                       <button key={v.key} onClick={() => addElement('placeholder', `{{${v.key}}}`)} className="p-3 bg-indigo-50 text-indigo-700 rounded-2xl text-[9px] font-black uppercase border border-indigo-100 hover:bg-indigo-100 transition-all text-center leading-tight">
                          {v.label.replace('Number', '').replace('ID', '').trim()}
                       </button>
                    ))}
                    <button onClick={() => addElement('text', 'STATIC_LABEL')} className="p-3 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-black transition-all col-span-2">
                       <Type className="w-3 h-3" /> Static Text
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-50 pb-2"><Maximize className="w-4 h-4" /> Media & Biometrics</h4>
                 <div className="grid grid-cols-1 gap-2">
                    <button onClick={() => addElement('photo', 'PHOTO_BLOCK')} className="p-4 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black uppercase flex items-center justify-between hover:bg-indigo-50 transition-all border border-slate-100">
                       <span>Student Photo</span>
                       <ImageIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('barcode', 'PDF417')} className="p-4 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black uppercase flex items-center justify-between hover:bg-indigo-50 transition-all border border-slate-100">
                       <span>PDF417 Barcode</span>
                       <BarcodeIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('qr', 'QR_MATRIX')} className="p-4 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black uppercase flex items-center justify-between hover:bg-indigo-50 transition-all border border-slate-100">
                       <span>QR Code</span>
                       <QrCode className="w-4 h-4" />
                    </button>
                    <button onClick={() => addElement('officer_signature', 'AUTH_SIGN')} className="p-4 bg-slate-50 text-slate-700 rounded-2xl text-[10px] font-black uppercase flex items-center justify-between hover:bg-indigo-50 transition-all border border-slate-100">
                       <span>Authority Signature</span>
                       <Stamp className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Workspace Dual Canvas */}
        <div className="lg:col-span-6 flex flex-col items-center">
           <div className="bg-slate-200/40 p-16 rounded-[4rem] border border-slate-200 shadow-inner w-full min-h-[900px] flex flex-col gap-24 items-center justify-center overflow-auto custom-scrollbar">
              {renderCanvas('front', canvasRefFront)}
              <div className="w-72 h-px bg-slate-300 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-200 px-6 py-1.5 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-[0.5em] shadow-sm">Splice</div>
              </div>
              {renderCanvas('back', canvasRefBack)}
           </div>
        </div>

        {/* Inspector Panel (Right) */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 min-h-[600px] flex flex-col">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-4 mb-8 flex items-center gap-2"><Settings2 className="w-4 h-4" /> Inspector</h3>
              
              <div className="mb-8 space-y-2">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1"><Filter className="w-3 h-3" /> Preview Class Data</label>
                 <select 
                    value={previewClass} 
                    onChange={e => setPreviewClass(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-600 transition-all"
                 >
                    <option value="">SELECT CLASS FOR PREVIEW...</option>
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>

              {selectedEl ? (
                <div className="space-y-8 animate-in slide-in-from-right-4 flex-1 overflow-y-auto no-scrollbar pr-1">
                   <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedEl.type}</span>
                      <button onClick={() => {
                        setFrontState(p => ({ ...p, elements: p.elements.filter(x => x.id !== selectedElementId) }));
                        setBackState(p => ({ ...p, elements: p.elements.filter(x => x.id !== selectedElementId) }));
                        setSelectedElementId(null);
                      }} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
                   </div>

                   {(selectedEl.type === 'barcode' || selectedEl.type === 'qr') && (
                     <div className="space-y-6 p-6 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                        <div className="flex items-center gap-3 mb-2">
                           <BarcodeIcon className="w-5 h-5 text-indigo-600" />
                           <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Verification Matrix</p>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                           {STUDENT_FIELD_REGISTRY.slice(0, 10).map(f => (
                             <label key={f.key} className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:border-indigo-300 transition-all shadow-sm">
                                <input 
                                  type="checkbox" 
                                  checked={selectedEl.barcodeConfig?.fields.includes(f.key)}
                                  onChange={() => {
                                    const fields = selectedEl.barcodeConfig?.fields || [];
                                    const newFields = fields.includes(f.key) ? fields.filter(x => x !== f.key) : [...fields, f.key];
                                    updateElement(selectedEl.id, { barcodeConfig: { ...selectedEl.barcodeConfig!, fields: newFields } });
                                  }}
                                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-0"
                                />
                                <span className="text-[10px] font-bold text-slate-700 uppercase">{f.label}</span>
                             </label>
                           ))}
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                           <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2"><Target className="w-3 h-3" /> Data Stream (PSV)</p>
                           <div className="p-4 bg-indigo-950 rounded-xl text-[8px] font-mono text-indigo-300 break-all leading-relaxed shadow-inner">
                              {(selectedEl.barcodeConfig?.fields || []).map(f => `{{${f}}}`).join('|')}
                           </div>
                        </div>
                     </div>
                   )}

                   {['placeholder', 'text'].includes(selectedEl.type) && (
                     <div className="space-y-6">
                        {selectedEl.type === 'text' && (
                           <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Static Content</label>
                              <input value={selectedEl.content} onChange={e => updateElement(selectedEl.id, { content: e.target.value.toUpperCase() })} className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-xl p-3 text-xs font-bold outline-none" />
                           </div>
                        )}
                        <div className="flex gap-2">
                           <button onClick={() => updateElement(selectedEl.id, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })} className={`p-4 rounded-2xl border flex-1 transition-all ${selectedEl.fontWeight === 'bold' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}><Bold className="w-5 h-5 mx-auto" /></button>
                           <button onClick={() => updateElement(selectedEl.id, { fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' })} className={`p-4 rounded-2xl border flex-1 transition-all ${selectedEl.fontStyle === 'italic' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}><Italic className="w-5 h-5 mx-auto" /></button>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase">Scale</label><span className="text-[11px] font-black text-indigo-600">{selectedEl.fontSize}px</span></div>
                           <input type="range" min="6" max="64" value={selectedEl.fontSize} onChange={e => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) })} className="w-full accent-indigo-600" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase">Hex Color</label>
                           <input type="color" value={selectedEl.color} onChange={e => updateElement(selectedEl.id, { color: e.target.value })} className="w-full h-14 rounded-2xl cursor-pointer bg-slate-50 p-2 border-none shadow-inner" />
                        </div>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-8">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">X</label><input type="number" value={Math.round(selectedEl.x)} onChange={e => updateElement(selectedEl.id, { x: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-[11px] font-black" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Y</label><input type="number" value={Math.round(selectedEl.y)} onChange={e => updateElement(selectedEl.id, { y: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-[11px] font-black" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Width</label><input type="number" value={Math.round(selectedEl.width)} onChange={e => updateElement(selectedEl.id, { width: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-[11px] font-black" /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Height</label><input type="number" value={Math.round(selectedEl.height)} onChange={e => updateElement(selectedEl.id, { height: parseInt(e.target.value) || 0 })} className="w-full bg-slate-50 border-none rounded-xl p-3.5 text-[11px] font-black" /></div>
                   </div>
                </div>
              ) : (
                <div className="py-32 text-center space-y-6 opacity-25">
                   <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-inner"><MousePointer2 className="w-10 h-10" /></div>
                   <p className="text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed">Select a block<br/>to edit properties</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default IDDesigner;