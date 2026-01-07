import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FileUp, 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Table as TableIcon,
  ChevronRight,
  RefreshCw,
  Edit2,
  Database,
  Check,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export interface ImportField {
  key: string;
  label: string;
  required: boolean;
  description?: string;
  type?: 'string' | 'number' | 'array';
}

interface ImportWizardProps {
  title: string;
  fields: ImportField[];
  onComplete: (data: any[]) => Promise<void>;
  onCancel: () => void;
}

const ImportWizard: React.FC<ImportWizardProps> = ({ title, fields, onComplete, onCancel }) => {
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [fileData, setFileData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [transformedData, setTransformedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{idx: number, key: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) throw new Error("File is empty.");

        const firstRow = data[0] as any;
        const fileHeaders = Object.keys(firstRow);
        
        setFileData(data);
        setHeaders(fileHeaders);
        
        const initialMapping: Record<string, string> = {};
        (fields || []).forEach(field => {
          const match = (fileHeaders || []).find(h => {
            const hLower = (h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const labelLower = (field.label || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const keyLower = (field.key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            return hLower === labelLower || hLower === keyLower || hLower.includes(keyLower);
          });
          if (match) initialMapping[field.key] = match;
        });

        setMapping(initialMapping);
        setStep('map');
      } catch (err: any) {
        alert(err.message || "Failed to process file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const proceedToPreview = () => {
    const missing = (fields || []).filter(f => f.required && !mapping[f.key]);
    if (missing.length > 0) return;

    const transformed = (fileData || []).map(row => {
      const obj: any = {};
      (fields || []).forEach(f => {
        const header = mapping[f.key];
        let val = header ? row[header] : undefined;
        
        if (f.type === 'array' && val && typeof val === 'string') {
          val = val.split(',').map(s => (s || '').trim());
        }
        
        obj[f.key] = val;
      });
      return obj;
    });

    setTransformedData(transformed);
    setStep('preview');
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      await onComplete(transformedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isMappingValid = (fields || []).every(f => !f.required || mapping[f.key]);

  // Validation Logic for Duplicates
  const duplicateMap = useMemo(() => {
    const maps: Record<string, Set<string>> = {};
    const identifierKeys = ['code', 'reg_no', 'id', 'email'];
    
    fields.forEach(f => {
      if (identifierKeys.some(ik => f.key.toLowerCase().includes(ik))) {
        const seen = new Map<string, number[]>();
        transformedData.forEach((row, i) => {
          const val = String(row[f.key] || '').trim();
          if (val) {
            if (!seen.has(val)) seen.set(val, []);
            seen.get(val)?.push(i);
          }
        });
        
        const dupIndices = new Set<string>();
        seen.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach(idx => dupIndices.add(`${idx}-${f.key}`));
          }
        });
        maps[f.key] = dupIndices;
      }
    });
    return maps;
  }, [transformedData, fields]);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 ${step === 'preview' ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-500 ${step === 'preview' ? 'w-full h-full rounded-none' : 'w-full max-w-6xl h-[85vh] rounded-[3rem]'}`}>
        
        {/* Header Section */}
        <div className={`border-b border-slate-100 flex justify-between items-center bg-white shrink-0 ${step === 'preview' ? 'px-8 py-4 shadow-sm' : 'p-8 px-12'}`}>
          <div className="flex items-center gap-6">
            <div className={`bg-[#0F172A] text-white flex items-center justify-center shadow-xl shadow-slate-200 ${step === 'preview' ? 'p-2 rounded-xl' : 'p-3.5 rounded-2xl'}`}>
              <FileUp className={step === 'preview' ? 'w-5 h-5' : 'w-6 h-6'} />
            </div>
            <div>
              <h2 className={`${step === 'preview' ? 'text-base' : 'text-lg'} font-black text-slate-800 uppercase tracking-tighter`}>{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {['UPLOAD', 'MAP COLUMNS', 'PREVIEW'].map((s, i) => {
                  const currentIdx = ['upload', 'map', 'preview'].indexOf(step);
                  const isActive = i <= currentIdx;
                  return (
                    <React.Fragment key={s}>
                      <span className={`text-[9px] font-black tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {s}
                      </span>
                      {i < 2 && <ChevronRight className="w-3 h-3 text-slate-200" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
          {step === 'preview' && (
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase border border-indigo-100">
                {transformedData.length} Records Detected
              </div>
              <button onClick={onCancel} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          )}
          {step !== 'preview' && (
            <button onClick={onCancel} className="p-3 hover:bg-slate-50 rounded-2xl transition-colors">
              <X className="w-6 h-6 text-slate-300" />
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className={`flex-1 overflow-hidden bg-slate-50/30 flex flex-col ${step === 'preview' ? 'p-0' : 'p-0'}`}>
          {step === 'upload' && (
            <div className="flex-1 p-12 flex flex-col">
              <div className="flex-1 border-4 border-dashed border-slate-100 rounded-[4rem] bg-white flex flex-col items-center justify-center space-y-8 group hover:border-indigo-100 transition-all">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-400 rounded-[3rem] flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Database className="w-10 h-10" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Source Ingestion</p>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Select Spreadsheet Payload (.xlsx, .csv)</p>
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#0F172A] text-white px-12 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl hover:bg-black transition-all active:scale-95"
                >
                  Browse Local Storage
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
              </div>
            </div>
          )}

          {step === 'map' && (
            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                    <TableIcon className="w-3.5 h-3.5" /> Requirement Schema
                  </h3>
                  <div className="space-y-3">
                    {(fields || []).map(field => (
                      <div key={field.key} className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{field.label}</p>
                          {field.description && <p className="text-[9px] text-slate-400 font-bold mt-0.5">{field.description}</p>}
                        </div>
                        {field.required && (
                          <span className="text-[8px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded border border-red-100 uppercase">Mandatory</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Source Linkage
                  </h3>
                  <div className="space-y-3">
                    {(fields || []).map(field => (
                      <div key={field.key} className={`p-5 bg-white border-2 rounded-3xl shadow-sm transition-all group focus-within:border-indigo-600 ${mapping[field.key] ? 'border-indigo-50' : 'border-slate-50'}`}>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Source Column:</label>
                        <select 
                          value={mapping[field.key] || ''} 
                          onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-black text-[#0F172A] outline-none"
                        >
                          <option value="">[ IGNORE ]</option>
                          {(headers || []).map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
              {/* Validation Grid Area */}
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="overflow-auto flex-1 custom-scrollbar">
                  <table className="w-full text-left border-collapse table-auto min-w-full">
                    <thead className="sticky top-0 z-30 bg-slate-100 border-b border-slate-200">
                      <tr className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                        <th className="px-4 py-3 w-16 bg-slate-100 sticky left-0 z-40 border-r border-slate-200 text-center">S/N</th>
                        <th className="px-4 py-3 w-20 bg-slate-100 border-r border-slate-200 text-center">Status</th>
                        {(fields || []).map(f => (
                          <th key={f.key} className="px-4 py-3 min-w-[180px] border-r border-slate-200 whitespace-nowrap">
                            {f.label} {f.required && <span className="text-red-400">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(transformedData || []).map((row, i) => {
                        const hasErrors = fields.some(f => {
                          const val = row[f.key];
                          const isMissing = f.required && (val === undefined || val === '' || val === null);
                          const isDuplicate = duplicateMap[f.key]?.has(`${i}-${f.key}`);
                          return isMissing || isDuplicate;
                        });

                        return (
                          <tr key={i} className="hover:bg-slate-50 transition-colors group h-[35px]">
                            <td className="px-4 py-1 text-[11px] font-black text-slate-400 bg-slate-50/80 sticky left-0 z-20 border-r border-slate-200 text-center group-hover:text-indigo-600">{i + 1}</td>
                            <td className="px-4 py-1 text-center border-r border-slate-200">
                              {hasErrors ? (
                                <div className="flex justify-center"><AlertTriangle className="w-4 h-4 text-red-500" /></div>
                              ) : (
                                <div className="flex justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-500" /></div>
                              )}
                            </td>
                            {(fields || []).map(f => {
                              const val = row[f.key];
                              const isMissing = f.required && (val === undefined || val === '' || val === null);
                              const isDuplicate = duplicateMap[f.key]?.has(`${i}-${f.key}`);
                              const isEditing = editingCell?.idx === i && editingCell?.key === f.key;

                              return (
                                <td 
                                  key={f.key} 
                                  className={`px-4 py-1 border-r border-slate-100 relative cursor-text text-[12px] font-medium transition-colors ${
                                    isDuplicate ? 'bg-red-500 text-white' : 
                                    isMissing ? 'bg-red-50 text-red-600' : 'text-slate-700'
                                  }`}
                                  onClick={() => setEditingCell({ idx: i, key: f.key })}
                                >
                                  {isEditing ? (
                                    <input 
                                      autoFocus
                                      className="absolute inset-0 w-full h-full bg-white border-2 border-indigo-600 px-4 py-1 text-[12px] font-black uppercase outline-none z-40 shadow-2xl"
                                      value={Array.isArray(val) ? val.join(', ') : (val === undefined || val === null ? '' : val)}
                                      onBlur={() => setEditingCell(null)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') setEditingCell(null);
                                        if (e.key === 'Escape') setEditingCell(null);
                                      }}
                                      onChange={(e) => {
                                        const newData = [...transformedData];
                                        let newVal: any = e.target.value;
                                        if (f.type === 'array') newVal = e.target.value.split(',').map(s => s.trim());
                                        if (f.key === 'is_compulsory') {
                                           const lower = e.target.value.toLowerCase();
                                           newVal = ['yes', 'true', 'y', '1'].includes(lower);
                                        }
                                        newData[i][f.key] = newVal;
                                        setTransformedData(newData);
                                      }}
                                    />
                                  ) : (
                                    <div className="flex items-center justify-between group/cell h-full min-h-[25px]">
                                      <span className="truncate">
                                        {f.key === 'is_compulsory' ? (val ? 'YES' : 'NO') : 
                                         Array.isArray(val) ? (val || []).join(', ') : (val === undefined || val === null || val === '' ? '-' : val)}
                                      </span>
                                      <Edit2 className="w-2.5 h-2.5 text-slate-300 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0 ml-1" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className={`bg-white border-t border-slate-100 flex justify-between items-center shrink-0 ${step === 'preview' ? 'px-8 py-3' : 'p-8 px-12'}`}>
          <button 
            onClick={() => {
              if (step === 'upload') onCancel();
              else {
                setStep('upload');
                setFileData([]);
                setTransformedData([]);
                setEditingCell(null);
              }
            }}
            className="flex items-center gap-3 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-all group"
          >
            <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
            DISCARD & RESTART
          </button>

          {step === 'preview' && (
            <div className="flex items-center gap-4 text-slate-400">
               <AlertCircle className="w-4 h-4" />
               <p className="text-[10px] font-bold uppercase tracking-tight">
                  <span className="text-red-500 font-black">RED HIGHLIGHTS:</span> Resolve missing mandatory fields or duplicate identifiers before integration.
               </p>
            </div>
          )}

          <div className="flex gap-4">
            {step === 'map' && (
              <button 
                onClick={proceedToPreview}
                disabled={!isMappingValid}
                className="bg-[#0F172A] text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 shadow-xl hover:bg-black active:scale-95 transition-all disabled:opacity-30"
              >
                PROCEED TO PREVIEW <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {step === 'preview' && (
              <button 
                onClick={handleFinalize}
                disabled={loading}
                className="bg-emerald-600 text-white px-12 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] flex items-center gap-4 shadow-xl hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                {loading ? 'INTEGRATING...' : 'Finalize Integration'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportWizard;