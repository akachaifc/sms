
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Layers, 
  Calendar, 
  Settings2, 
  Plus, 
  FileUp, 
  Search, 
  Trash2,
  Edit2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trophy,
  X,
  CalendarDays,
  Tag,
  Save,
  ArrowRight,
  Umbrella,
  Download,
  Filter,
  CalendarCheck,
  Zap,
  ChevronDown,
  Layers3,
  Hash,
  HelpCircle,
  Eye,
  Edit,
  Star,
  Check,
  ShieldCheck,
  Info
} from 'lucide-react';
import { supabase } from '../supabase';
import { MasterSubject, AcademicTerm, ALevelCombination, GlobalSettings, AcademicHoliday, Extracurricular, ExtracurricularCategory, FAQArticle } from '../types';
import ImportWizard, { ImportField } from '../components/ImportWizard';

const KnowledgeBank: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'subjects' | 'combinations' | 'calendar' | 'exams' | 'activities' | 'faqs'>('subjects');
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = async () => {
    setLoadingSettings(true);
    try {
      const { data, error } = await supabase.from('global_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      
      if (!data) {
        const initialSettings: GlobalSettings = {
          id: 1,
          a_level_combinations: [],
          terms: [],
          holidays: [],
          exam_definitions: ['BOT', 'MOT', 'EOT', 'MOCKS'],
          global_extracurriculars: []
        };
        const { data: newData, error: insertError } = await supabase.from('global_settings').insert([initialSettings]).select().single();
        if (!insertError) setGlobalSettings(newData);
      } else {
        setGlobalSettings(data);
      }
    } catch (err) {
      console.error('Error fetching global settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const updateGlobalSettings = async (updates: Partial<GlobalSettings>) => {
    if (!globalSettings) return;
    
    const { error } = await supabase.from('global_settings').update(updates).eq('id', 1);
    
    if (error) {
      console.error('Database Sync Failed:', error);
      alert(`Academic Standard Broadcast Failed: ${error.message}`);
      fetchGlobalSettings(); 
    } else {
      setGlobalSettings({ ...globalSettings, ...updates });
      setSaveStatus('Registry Synced Successfully');
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[1700px] mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[#0F172A] tracking-tight flex items-center gap-3">
            <div className="p-2 bg-[#0F172A] text-white rounded-lg shadow-lg shadow-slate-200">
              <BookOpen className="w-5 h-5" />
            </div>
            Academic Standard & Subject Bank
          </h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Institutional Governance Center for Academic Matrix & Registry.</p>
        </div>
        {saveStatus && (
          <div className="bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 animate-in slide-in-from-right-4 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {saveStatus}
          </div>
        )}
      </div>

      <div className="flex items-center gap-0.5 bg-white p-1 rounded-xl shadow-sm border border-slate-100 overflow-x-auto no-scrollbar">
        {[
          { id: 'subjects', label: 'Subject Bank', icon: BookOpen },
          { id: 'combinations', label: 'Matrix Registry', icon: Layers },
          { id: 'calendar', label: 'Timeline', icon: Calendar },
          { id: 'exams', label: 'Assessments', icon: Tag },
          { id: 'activities', label: 'Activities', icon: Trophy },
          { id: 'faqs', label: 'Knowledge Base', icon: HelpCircle },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === tab.id 
              ? 'bg-[#0F172A] text-white shadow-md' 
              : 'text-slate-400 hover:text-[#0F172A] hover:bg-slate-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[600px]">
        {loadingSettings ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-8 h-8 text-[#0F172A] animate-spin" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Warming Registry Nodes...</p>
          </div>
        ) : (
          <>
            {activeTab === 'subjects' && <MasterSubjectBank />}
            {activeTab === 'combinations' && (
              <ALevelCombinations 
                combinations={globalSettings?.a_level_combinations || []} 
                onUpdate={(combs) => updateGlobalSettings({ a_level_combinations: combs })}
              />
            )}
            {activeTab === 'calendar' && (
              <GlobalCalendar 
                terms={globalSettings?.terms || []} 
                holidays={globalSettings?.holidays || []}
                onUpdate={(terms, holidays) => updateGlobalSettings({ terms, holidays })}
              />
            )}
            {activeTab === 'exams' && (
              <ExamStandards 
                exams={globalSettings?.exam_definitions || []} 
                onUpdate={(exams) => updateGlobalSettings({ exam_definitions: exams })}
              />
            )}
            {activeTab === 'activities' && (
              <ActivityRepository 
                activities={globalSettings?.global_extracurriculars || []}
                onUpdate={(clubs) => updateGlobalSettings({ global_extracurriculars: clubs })}
              />
            )}
            {activeTab === 'faqs' && <FAQManager />}
          </>
        )}
      </div>
    </div>
  );
};

// --- MODULE 1: MASTER SUBJECT BANK ---
const MasterSubjectBank = () => {
  const [subjects, setSubjects] = useState<MasterSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedBulkLevel, setSelectedBulkLevel] = useState<string>('');
  
  const [newSubject, setNewSubject] = useState<MasterSubject>({ 
    name: '', 
    code: '', 
    level: 'O-Level',
    papers: [] as string[],
    short_forms: [] as string[],
    is_compulsory: false
  });

  useEffect(() => { fetchSubjects(); }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('master_subject_bank')
      .select('*')
      .order('level', { ascending: true })
      .order('name', { ascending: true });
    if (!error) setSubjects(data || []);
    setLoading(false);
  };

  const handleLevelSelect = (level: string) => {
    setSelectedBulkLevel(level);
    setShowLevelSelect(false);
    setShowWizard(true);
  };

  const handleBulk = async (data: any[]) => {
    const formatted = data.map(s => {
      const papersRaw = s.papers;
      const papers = Array.isArray(papersRaw) 
        ? papersRaw.map(p => String(p).trim()).filter(Boolean)
        : typeof papersRaw === 'string' 
          ? papersRaw.split(',').map(p => p.trim()).filter(Boolean)
          : [];

      const shortFormsRaw = s.short_forms;
      const shortForms = Array.isArray(shortFormsRaw)
        ? shortFormsRaw.map(f => String(f).trim()).filter(Boolean)
        : typeof shortFormsRaw === 'string'
          ? shortFormsRaw.split(',').map(f => f.trim()).filter(Boolean)
          : [];

      let is_compulsory = false;
      if (typeof s.is_compulsory === 'boolean') {
        is_compulsory = s.is_compulsory;
      } else {
        const compRaw = String(s.is_compulsory || '').toLowerCase();
        is_compulsory = ['yes', 'true', 'y', '1'].includes(compRaw);
      }

      return {
        name: String(s.name || '').trim().toUpperCase(),
        code: String(s.code || '').trim().toUpperCase(),
        level: (selectedBulkLevel || s.level || 'O-Level') as MasterSubject['level'],
        papers: papers,
        short_forms: shortForms,
        is_compulsory
      };
    }).filter(s => s.name && s.code);
    
    if (formatted.length > 0) {
      const { error } = await supabase.from('master_subject_bank').insert(formatted);
      if (error) {
        console.error('Subject Bulk Insert Error:', error);
        alert(`Registry Integration Aborted: ${error.message}`);
        return;
      }
      
      await fetchSubjects();
      setShowWizard(false);
      setSelectedBulkLevel('');
      alert(`Synchronized ${formatted.length} subjects to the Registry.`);
    } else {
      alert("Validation Error: No valid subjects with name and code detected.");
    }
  };

  const filtered = subjects.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.short_forms || []).some(f => (f || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = levelFilter === 'all' || s.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const subjectFields: ImportField[] = [
    { key: 'name', label: 'Subject Name', required: true },
    { key: 'code', label: 'Subject Code', required: true },
    { key: 'papers', label: 'Papers', required: false, type: 'array' },
    { key: 'short_forms', label: 'Short Forms', required: false, type: 'array' },
    { key: 'is_compulsory', label: 'Is Compulsory', required: false }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between gap-3">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search subject bank..." className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold focus:ring-1 focus:ring-[#0F172A]"
            />
          </div>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} className="bg-slate-50 border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:ring-1 focus:ring-[#0F172A] appearance-none min-w-[120px]">
            <option value="all">Global Scope</option>
            <option value="Primary">Primary</option>
            <option value="O-Level">O-Level</option>
            <option value="A-Level">A-Level</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLevelSelect(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileUp className="w-3.5 h-3.5" /> Bulk Import
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-[#0F172A] text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Add Registry Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? <div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F172A]" /></div> : (
          <table className="w-full text-left table-dense">
            <thead>
              <tr className="bg-slate-50 text-[8px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 font-black">
                <th className="px-6 py-2">Code</th>
                <th className="px-6 py-2">Standard Name</th>
                <th className="px-6 py-2">Classification</th>
                <th className="px-6 py-2">Scope</th>
                <th className="px-6 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group h-[35px]">
                  <td className="px-6 py-1 text-[11px] font-black text-[#0F172A]">{s.code}</td>
                  <td className="px-6 py-1 text-[11px] font-black text-slate-700 uppercase">{s.name}</td>
                  <td className="px-6 py-1">
                    {s.is_compulsory ? (
                      <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0F172A] text-[#FACC15] text-[8px] font-black rounded border border-[#0F172A] uppercase">
                        <Star className="w-2.5 h-2.5 fill-current" /> Compulsory
                      </span>
                    ) : (
                      <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Elective</span>
                    )}
                  </td>
                  <td className="px-6 py-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      s.level === 'Primary' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      s.level === 'O-Level' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {s.level}
                    </span>
                  </td>
                  <td className="px-6 py-1 text-right">
                    <button onClick={async () => { if(confirm('Purge item from bank?')) { await supabase.from('master_subject_bank').delete().eq('id', s.id); fetchSubjects(); } }} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showLevelSelect && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-sm overflow-hidden p-8 space-y-6 animate-in zoom-in-95">
            <div className="text-center">
              <h3 className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Import Workflow</h3>
              <p className="text-sm font-black text-[#0F172A]">Define Academic Scope</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {['Primary', 'O-Level', 'A-Level'].map(lvl => (
                <button 
                  key={lvl} 
                  onClick={() => handleLevelSelect(lvl)}
                  className="w-full py-4 rounded-xl bg-slate-50 hover:bg-[#0F172A] hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-slate-100 shadow-sm"
                >
                  {lvl} Batch
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showWizard && (
        <ImportWizard 
          title={`Subject Ingestion: ${selectedBulkLevel}`}
          fields={subjectFields}
          onComplete={handleBulk}
          onCancel={() => { setShowWizard(false); setSelectedBulkLevel(''); }}
        />
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 p-8 space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Add Bank Record</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Subject Name</label>
                <input type="text" placeholder="Official Label..." value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Unique Code</label>
                  <input type="text" placeholder="e.g. P530" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Level Scope</label>
                  <select value={newSubject.level} onChange={e => setNewSubject({...newSubject, level: e.target.value as any})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black uppercase text-[10px] appearance-none">
                    <option value="Primary">Primary</option>
                    <option value="O-Level">O-Level</option>
                    <option value="A-Level">A-Level</option>
                  </select>
                </div>
              </div>
              <button onClick={async () => { 
                if(!newSubject.name || !newSubject.code) return alert('Mandatory data missing.');
                const { error } = await supabase.from('master_subject_bank').insert([newSubject]); 
                if (error) return alert(`Sync Error: ${error.message}`);
                setShowAddModal(false); 
                fetchSubjects(); 
                setNewSubject({ name: '', code: '', level: 'O-Level', papers: [] as string[], short_forms: [] as string[], is_compulsory: false });
              }} className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Publish Subject Node</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODULE 2: A-LEVEL COMBINATIONS (OVERHAULED) ---
const ALevelCombinations = ({ combinations, onUpdate }: { combinations: ALevelCombination[], onUpdate: (combs: ALevelCombination[]) => void }) => {
  const [showModal, setShowModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [subjectBank, setSubjectBank] = useState<MasterSubject[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  
  // Modal State
  const [newComb, setNewComb] = useState<{
    code: string;
    principals: string[];
    subsidiaries: string[];
  }>({ code: '', principals: ['', '', ''], subsidiaries: [] });

  useEffect(() => {
    fetchBank();
  }, []);

  const fetchBank = async () => {
    setLoadingBank(true);
    const { data } = await supabase.from('master_subject_bank').select('*').eq('level', 'A-Level');
    if (data) setSubjectBank(data);
    setLoadingBank(false);
  };

  const principalSubjects = useMemo(() => subjectBank.filter(s => !s.code.startsWith('S')), [subjectBank]);
  const subsidiarySubjects = useMemo(() => subjectBank.filter(s => s.code.startsWith('S')), [subjectBank]);

  const canonicalSort = (code: string) => (code || '').toUpperCase().split('').sort().join('');

  const handleBulk = async (data: any[]) => {
    const results: ALevelCombination[] = [];
    const errors: string[] = [];

    data.forEach((row, i) => {
      const pCodes = String(row.principal_codes || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
      const sCodes = String(row.subsidiary_codes || '').split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
      const codeInput = String(row.code || '').toUpperCase();

      // Validations
      const validPrincipals = pCodes.every(pc => subjectBank.some(s => s.code === pc && !s.code.startsWith('S')));
      const validSubsidiaries = sCodes.every(sc => subjectBank.some(s => s.code === sc && s.code.startsWith('S')));

      if (pCodes.length !== 3) errors.push(`Row ${i+1}: Exactly 3 principals required.`);
      if (sCodes.length > 2) errors.push(`Row ${i+1}: Max 2 subsidiaries allowed.`);
      if (!validPrincipals) errors.push(`Row ${i+1}: One or more invalid principal codes.`);
      if (!validSubsidiaries) errors.push(`Row ${i+1}: One or more invalid subsidiary codes.`);

      if (pCodes.length === 3 && sCodes.length <= 2 && validPrincipals && validSubsidiaries) {
        results.push({
          id: Math.random().toString(36).substring(7),
          code: canonicalSort(codeInput),
          principal_subject_codes: pCodes,
          subsidiaries: sCodes
        });
      }
    });

    if (errors.length > 0) {
      alert(`Registry Conflict Detected:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length-3} more.` : ''}`);
    }

    if (results.length > 0) {
      const merged = [...combinations];
      let added = 0;
      results.forEach(res => {
        if (!merged.some(m => m.code === res.code)) {
          merged.push(res);
          added++;
        }
      });
      onUpdate(merged);
      setShowWizard(false);
      alert(`Synchronized ${added} academic standards to the matrix registry.`);
    }
  };

  const combFields: ImportField[] = [
    { key: 'code', label: 'Combination Code', required: true, description: 'e.g. BCM' },
    { key: 'principal_codes', label: 'Principal Codes', required: true, description: '3 comma-separated codes' },
    { key: 'subsidiary_codes', label: 'Subsidiary Codes', required: false, description: 'Max 2 codes starting with S' }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center px-6">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#0F172A] flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Academic Standard Matrix Registry</span>
        <div className="flex gap-2">
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileUp className="w-3.5 h-3.5" /> Bulk Ingest
          </button>
          <button onClick={() => setShowModal(true)} className="bg-[#0F172A] text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md active:scale-95 transition-all">
            <Plus className="w-3.5 h-3.5" /> Define Standard Item
          </button>
        </div>
      </div>
      
      {showWizard && (
        <ImportWizard 
          title="Matrix Data Mapper"
          fields={combFields}
          onComplete={handleBulk}
          onCancel={() => setShowWizard(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left table-dense">
          <thead>
            <tr className="bg-slate-50 text-[8px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 font-black">
              <th className="px-8 py-2">Combination</th>
              <th className="px-8 py-2">Principal Academic Standards</th>
              <th className="px-8 py-2">Subsidiary Codes</th>
              <th className="px-8 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {combinations.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group h-[35px]">
                <td className="px-8 py-1">
                   <span className="text-[13px] font-black text-[#0F172A] tracking-tighter">{c.code}</span>
                </td>
                <td className="px-8 py-1">
                  <div className="flex gap-2">
                    {c.principal_subject_codes.map(code => {
                      const subj = subjectBank.find(s => s.code === code);
                      return (
                        <div key={code} className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                          <span className="text-[9px] font-black text-indigo-600">{code}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[80px]">{subj?.name || 'Unknown'}</span>
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="px-8 py-1">
                  <div className="flex gap-1.5">
                    {(c.subsidiaries || []).map(s => (
                      <span key={s} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[8px] font-black border border-amber-100 rounded uppercase">
                        {s}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-1 text-right">
                  <button onClick={() => onUpdate(combinations.filter(x => x.id !== c.id))} className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </td>
              </tr>
            ))}
            {combinations.length === 0 && (
              <tr><td colSpan={4} className="py-20 text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.5em]">Matrix Registry Empty</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Initialize Academic Standard</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Identity Code (e.g. PCM)</label>
                <input 
                  type="text" 
                  value={newComb.code} 
                  onChange={e => setNewComb({...newComb, code: e.target.value.toUpperCase()})} 
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black text-sm tracking-widest text-indigo-600" 
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                   <h4 className="text-[10px] font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-500" /> Principal Subjects (Exactly 3)</h4>
                   <span className="text-[8px] font-black text-indigo-400 px-2 py-0.5 bg-indigo-50 rounded uppercase">{newComb.principals.filter(p => p).length} / 3 Nodes</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="relative group">
                       <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                       <select 
                         value={newComb.principals[i]} 
                         onChange={e => {
                           const updated = [...newComb.principals];
                           updated[i] = e.target.value;
                           setNewComb({...newComb, principals: updated});
                         }}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold outline-none focus:border-indigo-600 appearance-none"
                       >
                          <option value="">Search Principal Code...</option>
                          {principalSubjects.map(s => (
                            <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                          ))}
                       </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                   <h4 className="text-[10px] font-black text-[#0F172A] uppercase tracking-widest flex items-center gap-2"><Tag className="w-4 h-4 text-amber-500" /> Mandatory Subsidiaries (Max 2)</h4>
                   <span className="text-[8px] font-black text-amber-600 px-2 py-0.5 bg-amber-50 rounded uppercase">{newComb.subsidiaries.length} / 2 Nodes</span>
                </div>
                <div className="flex flex-wrap gap-2">
                   {subsidiarySubjects.map(s => (
                     <button 
                       key={s.code} 
                       onClick={() => {
                         const list = newComb.subsidiaries.includes(s.code) 
                           ? newComb.subsidiaries.filter(x => x !== s.code) 
                           : (newComb.subsidiaries.length < 2 ? [...newComb.subsidiaries, s.code] : newComb.subsidiaries);
                         setNewComb({...newComb, subsidiaries: list});
                       }}
                       className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${newComb.subsidiaries.includes(s.code) ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200'}`}
                     >
                       {s.code} - {s.name}
                     </button>
                   ))}
                </div>
              </div>

              <button 
                onClick={() => { 
                  if(!newComb.code || newComb.principals.filter(p => p).length !== 3) return alert('Exactly 3 principal standards required.');
                  const sortedCode = canonicalSort(newComb.code);
                  if (combinations.some(c => c.code === sortedCode)) return alert(`Registry Redundancy: Matrix ${sortedCode} already active.`);
                  
                  onUpdate([...combinations, {
                    id: Math.random().toString(36).substring(7),
                    code: sortedCode,
                    principal_subject_codes: newComb.principals,
                    subsidiaries: newComb.subsidiaries
                  }]); 
                  setShowModal(false); 
                  setNewComb({ code: '', principals: ['', '', ''], subsidiaries: [] });
                }} 
                className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                <Zap className="w-4 h-4 text-[#FACC15]" /> Register Standard Node
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODULE 3: CALENDAR + HOLIDAYS ---
const GlobalCalendar = ({ terms, holidays, onUpdate }: { terms: AcademicTerm[], holidays: AcademicHoliday[], onUpdate: (terms: AcademicTerm[], holidays: AcademicHoliday[]) => void }) => {
  const [showHolidayWizard, setShowHolidayWizard] = useState(false);
  const [view, setView] = useState<'config' | 'summary'>('summary');
  const [localTerms, setLocalTerms] = useState<AcademicTerm[]>(terms);
  const [localHolidays, setLocalHolidays] = useState<AcademicHoliday[]>(holidays);

  useEffect(() => { setLocalTerms(terms || []); }, [terms]);
  useEffect(() => { setLocalHolidays(holidays || []); }, [holidays]);

  const holidayFields: ImportField[] = [
    { key: 'label', label: 'Holiday Title', required: true },
    { key: 'start_date', label: 'Start Date', required: true },
    { key: 'end_date', label: 'End Date', required: true }
  ];

  const handleHolidayBulk = async (data: any[]) => {
    const list = data.map(h => ({
      id: Math.random().toString(36).substring(7),
      label: h.label,
      start_date: h.start_date,
      end_date: h.end_date
    })).filter(h => h.label && h.start_date && h.end_date);
    setLocalHolidays(prev => [...prev, ...list]);
    setShowHolidayWizard(false);
  };

  const handleSave = () => {
    onUpdate(localTerms, localHolidays);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex gap-1">
          <button onClick={() => setView('summary')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'summary' ? 'bg-[#0F172A] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Aggregate View</button>
          <button onClick={() => setView('config')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'config' ? 'bg-[#0F172A] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>Sequence Config</button>
        </div>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md active:scale-95 transition-all">
          <Zap className="w-3.5 h-3.5" /> Broadcast Sequence
        </button>
      </div>

      {view === 'config' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Academic Terms</h3>
              <button onClick={() => setLocalTerms([...localTerms, { id: localTerms.length+1, label: `Term ${localTerms.length+1}`, start_date: '', end_date: '', is_active: false }])} className="text-[9px] font-black text-[#0F172A] uppercase border-b border-[#0F172A]">+ Add Term</button>
            </div>
            <div className="space-y-3">
              {localTerms.map(t => (
                <div key={t.id} className={`p-4 rounded-xl border-2 transition-all ${t.is_active ? 'bg-slate-50 border-[#0F172A]' : 'bg-white border-slate-50'}`}>
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-[10px] font-black uppercase tracking-tight text-[#0F172A]">{t.label}</span>
                     <div className="flex items-center gap-2">
                       <button onClick={() => setLocalTerms(localTerms.map(x => ({ ...x, is_active: x.id === t.id })))} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${t.is_active ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-400'}`}>Set Active</button>
                       <button onClick={() => setLocalTerms(localTerms.filter(x => x.id !== t.id))} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="date" value={t.start_date} onChange={e => setLocalTerms(localTerms.map(x => x.id === t.id ? {...x, start_date: e.target.value} : x))} className="w-full bg-slate-50 border-none rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none" />
                    <input type="date" value={t.end_date} onChange={e => setLocalTerms(localTerms.map(x => x.id === t.id ? {...x, end_date: e.target.value} : x))} className="w-full bg-slate-50 border-none rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Institutional Holidays</h3>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowHolidayWizard(true)} className="text-[9px] font-black text-slate-400 hover:text-[#0F172A] uppercase flex items-center gap-1"><FileUp className="w-3 h-3" /> Bulk</button>
                <button onClick={() => setLocalHolidays([...localHolidays, { id: Math.random().toString(36).substring(7), label: '', start_date: '', end_date: '' }])} className="text-[9px] font-black text-[#0F172A] uppercase border-b border-[#0F172A]">+ Add Entry</button>
              </div>
            </div>
            {showHolidayWizard && <ImportWizard title="Holiday Ingestion" fields={holidayFields} onComplete={handleHolidayBulk} onCancel={() => setShowHolidayWizard(false)} />}
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {localHolidays.map(h => (
                <div key={h.id} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3 group">
                  <input type="text" value={h.label} onChange={e => setLocalHolidays(localHolidays.map(x => x.id === h.id ? {...x, label: e.target.value.toUpperCase()} : x))} className="flex-1 bg-transparent border-none text-[9px] font-black uppercase outline-none text-slate-700" placeholder="EVENT..." />
                  <input type="date" value={h.start_date} onChange={e => setLocalHolidays(localHolidays.map(x => x.id === h.id ? {...x, start_date: e.target.value} : x))} className="bg-white border-none rounded-lg px-2 py-1 text-[9px] font-bold" />
                  <button onClick={() => setLocalHolidays(localHolidays.filter(x => x.id !== h.id))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5"/></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {localTerms.map(term => (
             <div key={term.id} className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col transition-all ${term.is_active ? 'ring-2 ring-[#0F172A]' : ''}`}>
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-sm font-black text-[#0F172A] uppercase tracking-tighter">{term.label}</h4>
                  {term.is_active && <div className="p-1.5 bg-[#0F172A] text-white rounded shadow-md"><Clock className="w-3 h-3" /></div>}
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                   <div className="text-center flex-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Commence</p>
                      <p className="text-[9px] font-black text-slate-700 mt-0.5">{term.start_date || 'TBA'}</p>
                   </div>
                   <ArrowRight className="w-3 h-3 text-slate-300" />
                   <div className="text-center flex-1">
                      <p className="text-[7px] font-black text-slate-400 uppercase">Conclude</p>
                      <p className="text-[9px] font-black text-slate-700 mt-0.5">{term.end_date || 'TBA'}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

// --- MODULE 4: EXAM STANDARDS ---
const ExamStandards = ({ exams, onUpdate }: { exams: string[], onUpdate: (e: string[]) => void }) => {
  const [newEx, setNewEx] = useState('');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Standard Assessment Protocols</h3>
        <div className="flex gap-1">
          <input type="text" placeholder="NEW TOKEN..." value={newEx} onChange={e => setNewEx(e.target.value.toUpperCase())} className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase outline-none focus:border-[#0F172A] w-28" />
          <button onClick={() => { if(newEx) { onUpdate([...exams, newEx]); setNewEx(''); } }} className="bg-[#0F172A] text-white p-2 rounded-lg shadow-md"><Plus className="w-3.5 h-3.5"/></button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {exams.map((ex, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 group">
             <span className="text-[10px] font-black text-[#0F172A] tracking-widest">{ex}</span>
             <button onClick={() => onUpdate(exams.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><X className="w-3 h-3"/></button>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- MODULE 5: ACTIVITY REPOSITORY ---
const ActivityRepository = ({ activities, onUpdate }: { activities: Extracurricular[], onUpdate: (c: Extracurricular[]) => void }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [newActivity, setNewActivity] = useState<Extracurricular>({ name: '', category: 'Club' });
  const categories: ExtracurricularCategory[] = ['Club', 'Society', 'Association', 'Game', 'Sport'];

  const handleBulk = async (data: any[]) => {
    const formatted: Extracurricular[] = data.map(r => {
      const name = String(r.name || '').trim().toUpperCase();
      let categoryRaw = String(r.category || 'Club').trim();
      const match = categories.find(c => c.toLowerCase() === categoryRaw.toLowerCase());
      return { name, category: (match || 'Club') as ExtracurricularCategory };
    }).filter(a => a.name);

    if (formatted.length > 0) {
      const merged = [...activities];
      let added = 0;
      formatted.forEach(item => {
        if (!merged.some(e => e.name === item.name)) {
          merged.push(item);
          added++;
        }
      });
      if (added > 0) {
        onUpdate(merged);
        setShowWizard(false);
        alert(`Integrated ${added} new activity standards.`);
      } else {
        alert("No new unique standards detected.");
      }
    }
  };

  const activityFields: ImportField[] = [
    { key: 'name', label: 'Activity Name', required: true },
    { key: 'category', label: 'Classification', required: true }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center px-6">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Institutional Activity Standards</span>
        <div className="flex gap-2">
          <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
            <FileUp className="w-3.5 h-3.5" /> Bulk Ingest
          </button>
          <button onClick={() => setShowAddModal(true)} className="bg-[#0F172A] text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> Initialize Standard Node
          </button>
        </div>
      </div>

      {showWizard && (
        <ImportWizard title="Activity Standard Mapper" fields={activityFields} onComplete={handleBulk} onCancel={() => setShowWizard(false)} />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left table-dense">
          <thead>
            <tr className="bg-slate-50 text-[8px] text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 font-black">
              <th className="px-8 py-2">Official Label</th>
              <th className="px-8 py-2">System Classification</th>
              <th className="px-8 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {activities.map((a, i) => (
              <tr key={i} className="hover:bg-slate-50/80 transition-colors group h-[35px]">
                <td className="px-8 py-1 text-[11px] font-black text-slate-700 uppercase tracking-tight">{a.name}</td>
                <td className="px-8 py-1">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                    a.category === 'Sport' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    a.category === 'Club' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                    'bg-slate-50 text-slate-500 border-slate-100'
                  }`}>
                    {a.category}
                  </span>
                </td>
                <td className="px-8 py-1 text-right">
                  <button onClick={() => onUpdate(activities.filter((_, idx) => idx !== i))} className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Initialize Standard</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="LABEL..." value={newActivity.name} onChange={e => setNewActivity({...newActivity, name: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
              <select value={newActivity.category} onChange={e => setNewActivity({...newActivity, category: e.target.value as any})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black uppercase text-[10px] appearance-none">
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <button onClick={() => { if(!newActivity.name) return; onUpdate([...activities, newActivity]); setShowAddModal(false); setNewActivity({ name: '', category: 'Club' }); }} className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Save Standard Node</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MODULE 6: FAQ MANAGER ---
const FAQManager = () => {
  const [faqs, setFaqs] = useState<FAQArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingFaq, setViewingFaq] = useState<FAQArticle | null>(null);
  const [newFaq, setNewFaq] = useState({ title: '', category: 'General', content: '' });

  useEffect(() => { fetchFaqs(); }, []);

  const fetchFaqs = async () => {
    setLoading(true);
    const { data } = await supabase.from('faq_articles').select('*').order('created_at', { ascending: false });
    if (data) setFaqs(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newFaq.title || !newFaq.content) return;
    const { error } = await supabase.from('faq_articles').insert([newFaq]);
    if (!error) {
      setShowAddModal(false);
      setNewFaq({ title: '', category: 'General', content: '' });
      fetchFaqs();
    }
  };

  const deleteFaq = async (id: string) => {
    if (!confirm('Delete article?')) return;
    await supabase.from('faq_articles').delete().eq('id', id);
    fetchFaqs();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center px-6">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Institutional Knowledge Base</span>
        <button onClick={() => setShowAddModal(true)} className="bg-[#0F172A] text-white px-5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" /> Publish Documentation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full text-center py-20"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0F172A]" /></div> : (
          faqs.map(faq => (
            <div key={faq.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 group relative">
              <div className="flex justify-between items-start">
                 <span className="px-2 py-0.5 bg-slate-50 text-slate-400 text-[8px] font-black uppercase rounded border border-slate-100">{faq.category}</span>
                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => deleteFaq(faq.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                 </div>
              </div>
              <h4 className="text-sm font-black text-[#0F172A] uppercase tracking-tight line-clamp-2">{faq.title}</h4>
              <button onClick={() => setViewingFaq(faq)} className="w-full py-2 bg-slate-50 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#0F172A] hover:text-white transition-all flex items-center justify-center gap-2">
                <Eye className="w-3.5 h-3.5" /> Read Article
              </button>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Initialize Documentation Node</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-red-500"><X className="w-5 h-5"/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="HEADING..." value={newFaq.title} onChange={e => setNewFaq({...newFaq, title: e.target.value.toUpperCase()})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
              <select value={newFaq.category} onChange={e => setNewFaq({...newFaq, category: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-black uppercase text-[10px]">
                <option value="General">General</option>
                <option value="Academic">Academic</option>
                <option value="Billing">Billing</option>
                <option value="Technical">Technical</option>
              </select>
              <textarea placeholder="CONTENT..." value={newFaq.content} onChange={e => setNewFaq({...newFaq, content: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-xs h-64 resize-none" />
              <button onClick={handleAdd} className="w-full bg-[#0F172A] text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all">Synchronize Knowledge</button>
            </div>
          </div>
        </div>
      )}

      {viewingFaq && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 h-[80vh] flex flex-col">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
               <div>
                  <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{viewingFaq.category}</span>
                  <h3 className="text-xl font-black text-[#0F172A] uppercase tracking-tighter mt-1">{viewingFaq.title}</h3>
               </div>
               <button onClick={() => setViewingFaq(null)} className="p-2 text-slate-300 hover:text-red-500"><X className="w-6 h-6"/></button>
            </div>
            <div className="p-10 flex-1 overflow-y-auto whitespace-pre-wrap text-sm text-slate-600 font-medium leading-relaxed custom-scrollbar">
              {viewingFaq.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBank;
