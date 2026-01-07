import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Search, Filter, Loader2, Calendar, User, 
  Database, Download, ShieldCheck, ShieldAlert,
  ChevronRight, Archive, ArrowRight, Zap, Info,
  CheckCircle2, Clock, Trash2, FileSpreadsheet
} from 'lucide-react';
import { supabase } from '../supabase';
import { AuditLog } from '../types';
import ExcelJS from 'exceljs';
import saveAs from 'file-saver';

const GlobalLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'OPERATOR' | 'SCHOOL'>('OPERATOR');

  const SIX_MONTHS_AGO = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d;
  }, []);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  const archivedCount = useMemo(() => {
    return logs.filter(log => new Date(log.created_at) < SIX_MONTHS_AGO).length;
  }, [logs, SIX_MONTHS_AGO]);

  const filteredLogs = useMemo(() => {
    const targetType = viewMode === 'OPERATOR' ? 'System Operator' : 'School Administrator';
    return logs
      .filter(log => log.operator_type === targetType)
      .filter(log => new Date(log.created_at) >= SIX_MONTHS_AGO)
      .filter(log => 
        log.operator_email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        log.operator_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entity_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operator_id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [logs, viewMode, searchTerm, SIX_MONTHS_AGO]);

  const generateArchive = async () => {
    const archivedLogs = logs.filter(log => new Date(log.created_at) < SIX_MONTHS_AGO);
    if (archivedLogs.length === 0) {
      alert("No archived records found for export.");
      return;
    }

    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('System Archive');

      // Define Start/End dates for filename
      const sorted = [...archivedLogs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const startDateStr = new Date(sorted[0].created_at).toISOString().split('T')[0];
      const endDateStr = new Date(sorted[sorted.length - 1].created_at).toISOString().split('T')[0];

      // Header Configuration
      const headers = ['S/N', 'TIMESTAMP', 'OPERATOR', 'TYPE', 'UUID', 'ACTION PERFORMED', 'RELATED SCHOOL'];
      const headerRow = worksheet.getRow(1);
      headerRow.values = headers;
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.height = 25;
      
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0F172A' } // Enterprise Blue
        };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      });

      // Data Ingestion
      archivedLogs.forEach((log, idx) => {
        const row = worksheet.addRow([
          idx + 1,
          new Date(log.created_at).toLocaleString('en-GB', { hour12: false }),
          log.operator_name || log.operator_email,
          log.operator_type,
          log.operator_id || 'N/A',
          log.action,
          log.entity_id || 'Global'
        ]);
        row.alignment = { vertical: 'middle' };
      });

      // Auto-Fit Logic
      worksheet.columns.forEach(column => {
        let maxColumnLength = 0;
        column.eachCell!({ includeEmpty: true }, cell => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxColumnLength) {
            maxColumnLength = columnLength;
          }
        });
        column.width = Math.min(60, maxColumnLength + 4);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `SYSTEM LOGS from ${startDateStr} to ${endDateStr}.xlsx`);
    } catch (err: any) {
      alert("Archive generation failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1700px] mx-auto pb-10">
      {/* Header Station */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-[1.5rem] shadow-xl text-white">
              <History className="w-8 h-8" />
            </div>
            Institutional Audit Ledger
          </h1>
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Registry Integrity & Forensic Monitoring Terminal
          </p>
        </div>

        <div className="flex gap-1.5 bg-slate-200 p-1.5 rounded-2xl shadow-inner border border-slate-300">
           <button 
             onClick={() => setViewMode('SCHOOL')}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'SCHOOL' ? 'bg-[#0F172A] text-[#FACC15] shadow-lg scale-105' : 'text-slate-500 hover:text-indigo-900'}`}
           >
              <Building2Icon className="w-4 h-4" /> School Activity
           </button>
           <button 
             onClick={() => setViewMode('OPERATOR')}
             className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${viewMode === 'OPERATOR' ? 'bg-[#0F172A] text-[#FACC15] shadow-lg scale-105' : 'text-slate-500 hover:text-indigo-900'}`}
           >
              <Zap className="w-4 h-4" /> Operator Activity
           </button>
        </div>
      </div>

      {/* Archive Notice Banner */}
      {archivedCount > 0 && (
        <div className="bg-[#1E1B4B] p-6 rounded-[2.5rem] shadow-2xl border border-indigo-900 flex flex-col md:flex-row items-center justify-between gap-6 group">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-500/20 text-[#FACC15] rounded-[1.5rem] flex items-center justify-center animate-pulse">
                 <Archive className="w-8 h-8" />
              </div>
              <div>
                 <h4 className="text-white font-black uppercase tracking-widest text-sm">System Intelligence</h4>
                 <p className="text-indigo-300 text-[10px] font-bold uppercase tracking-widest mt-1">
                    {archivedCount} records older than 6 months have been moved to the cold archive for console performance.
                 </p>
              </div>
           </div>
           <button 
             onClick={generateArchive}
             disabled={exporting}
             className="px-10 py-4 bg-white text-[#0F172A] rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
           >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {exporting ? 'Processing Vault...' : 'Download Archive'}
           </button>
        </div>
      )}

      {/* Control Strip */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by Identity, Action, or Target Node ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none transition-all shadow-inner" 
          />
        </div>
        <div className="flex items-center gap-6">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Node Density</p>
              <p className="text-xl font-black text-slate-800">{filteredLogs.length} Events</p>
           </div>
           <div className="h-10 w-px bg-slate-100"></div>
           <button className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
              <Filter className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto min-h-[500px]">
          {loading ? (
            <div className="py-32 flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Accessing Audit Log...</p>
            </div>
          ) : (
            <table className="w-full text-left table-dense">
              <thead>
                <tr className="bg-slate-50 text-[10px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                  <th className="px-10 py-5">Event Sequence</th>
                  <th className="px-10 py-5">Administrative Identity</th>
                  <th className="px-10 py-5">Action Description</th>
                  <th className="px-10 py-5 text-right">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-10 py-4 whitespace-nowrap">
                       <div className="flex flex-col">
                          <span className="text-[11px] font-black text-slate-800">{new Date(log.created_at).toLocaleTimeString('en-GB', { hour12: false })}</span>
                          <span className="text-[9px] font-bold text-slate-400 mt-0.5">{new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                       </div>
                    </td>
                    <td className="px-10">
                       <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                             <User className="w-5 h-5 text-indigo-400" />
                          </div>
                          <div>
                             <p className="text-[12px] font-black text-indigo-900 uppercase truncate max-w-[200px]">{log.operator_name || 'System Auto'}</p>
                             <p className="text-[9px] font-bold text-slate-400 lowercase truncate max-w-[200px]">{log.operator_email}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-10">
                       <p className="text-[12px] font-bold text-slate-700 leading-relaxed uppercase">{log.action}</p>
                    </td>
                    <td className="px-10 text-right">
                       {log.entity_id ? (
                         <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-xl border border-slate-200 group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:text-white transition-all shadow-sm">
                            <Database className="w-3 h-3 opacity-50" />
                            <span className="text-[10px] font-black uppercase tracking-tighter">{log.entity_id}</span>
                         </div>
                       ) : (
                         <span className="text-[9px] text-slate-300 font-bold italic">Global Node</span>
                       )}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-40 text-center">
                       <History className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                       <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.5em]">Sequence Record Clear</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const Building2Icon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

export default GlobalLogs;