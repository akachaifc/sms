
import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Building2, AlertCircle, CheckCircle2, 
  Loader2, Target, FileDown, ShieldAlert
} from 'lucide-react';
import { supabase } from '../supabase';
import { School } from '../types';

interface AuditStats {
  total: number;
  missingPhoto: number;
  missingSignature: number;
  missingLIN: number;
  missingAlevel: number;
  health: number;
}

const RegistryAudit: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [auditResults, setAuditResults] = useState<any[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    if (data) setSchools(data);
  };

  const runAudit = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    if (!schoolId) return;
    
    setLoading(true);
    setAuditResults([]);
    setStats(null);
    
    try {
      const { data: students, error } = await supabase
        .from('students')
        .select('*')
        .eq('school_id', schoolId);
      
      if (error) throw error;
      
      const deficiencies = (students || []).map(s => {
        const issues = [];
        if (!s.photo_url) issues.push('Missing Photo');
        if (!s.signature_url) issues.push('Missing Signature');
        if (!s.lin) issues.push('Missing LIN');
        if ((s.class === 'S.5' || s.class === 'S.6') && !s.combination) issues.push('Missing A-Level Combination');
        
        return { ...s, issues };
      }).filter(s => s.issues.length > 0);

      const total = students?.length || 0;
      const mPhoto = deficiencies.filter(d => d.issues.includes('Missing Photo')).length;
      const mSig = deficiencies.filter(d => d.issues.includes('Missing Signature')).length;
      const mLIN = deficiencies.filter(d => d.issues.includes('Missing LIN')).length;
      const mALvl = deficiencies.filter(d => d.issues.includes('Missing A-Level Combination')).length;

      const totalPossibleEntries = total * 3; 
      const totalDeficiencies = mPhoto + mSig + mLIN + mALvl;
      const health = total > 0 ? Math.max(0, Math.round(((totalPossibleEntries - totalDeficiencies) / totalPossibleEntries) * 100)) : 100;

      setStats({
        total,
        missingPhoto: mPhoto,
        missingSignature: mSig,
        missingLIN: mLIN,
        missingAlevel: mALvl,
        health
      });
      setAuditResults(deficiencies);
    } finally {
      setLoading(false);
    }
  };

  const exportDeficiencyReport = () => {
    if (auditResults.length === 0) return;
    const csvRows = [
      ['ID Number', 'Full Name', 'Class', 'Missing Items'],
      ...auditResults.map(s => [s.reg_no, s.full_name, s.class, s.issues.join('; ')])
    ];
    const csvContent = csvRows.map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Deficiencies_${selectedSchoolId}.csv`);
    link.click();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500 max-w-[1200px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            Audit Center
          </h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Records Health & Quality Assessment</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
            <Target className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Selected Audit Node</p>
            <select 
              value={selectedSchoolId}
              onChange={(e) => runAudit(e.target.value)}
              className="bg-transparent border border-slate-200 rounded-lg px-3 py-1 text-xs font-black text-slate-700 outline-none"
            >
              <option value="">Target School...</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
            </select>
          </div>
        </div>

        {stats && (
          <div className="flex gap-8">
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">QUALITY</p>
                <p className={`text-xl font-black ${stats.health > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{stats.health}%</p>
             </div>
             <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase">RECORDS</p>
                <p className="text-xl font-black text-slate-800">{stats.total}</p>
             </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-[9px] font-black uppercase tracking-widest">Scanning Registry...</p>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-3">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Deficiency Matrix</h3>
              {[
                { label: 'Missing Photos', count: stats.missingPhoto, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { label: 'Missing Signatures', count: stats.missingSignature, color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Missing LINs', count: stats.missingLIN, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Missing Subjects', count: stats.missingAlevel, color: 'text-slate-600', bg: 'bg-slate-50' },
              ].map((item, i) => (
                <div key={i} className={`px-4 py-2 rounded-xl flex justify-between items-center ${item.bg}`}>
                  <span className="text-[10px] font-black text-slate-600 uppercase">{item.label}</span>
                  <span className={`text-xs font-black ${item.color}`}>{item.count}</span>
                </div>
              ))}
              <button 
                onClick={exportDeficiencyReport}
                className="w-full mt-4 py-3 bg-indigo-950 text-[#FACC15] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm"
              >
                <FileDown className="w-4 h-4" /> Export Deficiency Report
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/20">
                <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Incomplete Records List
                </h3>
             </div>
             <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-[10px]">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                    <tr className="text-slate-400 font-black uppercase tracking-widest">
                      <th className="px-6 py-2">ID</th>
                      <th className="px-6 py-2">Student</th>
                      <th className="px-6 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {auditResults.map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-6 py-2 font-bold text-slate-900">{s.reg_no}</td>
                        <td className="px-6 py-2 font-black text-indigo-600 uppercase">{s.full_name}</td>
                        <td className="px-6 py-2">
                           <div className="flex flex-wrap gap-1">
                              {s.issues.map((issue: string, idx: number) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-black uppercase">{issue}</span>
                              ))}
                           </div>
                        </td>
                      </tr>
                    ))}
                    {auditResults.length === 0 && (
                      <tr><td colSpan={3} className="py-20 text-center font-black text-slate-300 uppercase tracking-widest">Registry 100% Quality</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      ) : (
        <div className="py-32 text-center bg-white border border-slate-50 rounded-3xl shadow-inner">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Initiate an audit to visualize institutional health</p>
        </div>
      )}
    </div>
  );
};

export default RegistryAudit;
