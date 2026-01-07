import React, { useState, useEffect, useMemo } from 'react';
import { 
  Banknote, Plus, Search, FileText, Download, CheckCircle2, Clock, AlertCircle, 
  Loader2, X, Building2, Calendar, Send, Trash2, Upload, FileCheck, Zap, 
  ArrowRight, ShieldCheck, CreditCard, Hash, Eye, FileDigit, ChevronRight, 
  DatabaseZap, FileBox, File, History, Eraser, Printer, Receipt, ArrowLeft
} from 'lucide-react';
import { supabase } from '../supabase';
import { School, Invoice, LineItem } from '../types';

const Financials: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [selectedInvoiceForView, setSelectedInvoiceForView] = useState<Invoice | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [physicalRef, setPhysicalRef] = useState<string>('');
  const [pdfScan, setPdfScan] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [dueDate, setDueDate] = useState<string>(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schoolsRes, invoicesRes] = await Promise.all([
        supabase.from('schools').select('*').order('name'),
        supabase.from('invoices').select('*, schools(name)').order('created_at', { ascending: false })
      ]);
      if (schoolsRes.data) setSchools(schoolsRes.data);
      if (invoicesRes.data) setAllInvoices(invoicesRes.data.map(inv => ({ ...inv, school_name: inv.schools?.name })));
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllInvoices = async () => {
    if (!confirm("Permanently purge ALL invoice records?")) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('invoices').delete().neq('id', 'purger');
      await supabase.from('audit_logs').insert([{
        operator_email: session?.user.email,
        operator_type: 'System Operator',
        action: 'GLOBAL_INVOICE_LEDGER_PURGE',
        entity_id: 'SYSTEM_FINANCE'
      }]);
      setAllInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCleared = async (invoice: Invoice) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('invoices').update({ status: 'Paid' }).eq('id', invoice.id);
      await supabase.from('audit_logs').insert([{
        operator_email: session?.user.email,
        operator_type: 'System Operator',
        action: `INVOICE_STATUS_CLEARED: ${invoice.id}`,
        entity_id: invoice.school_id,
        entity_type: 'SCHOOL'
      }]);
      fetchData();
      setSelectedInvoiceForView(null);
    } catch (err) {}
  };

  const amountToWords = (num: number): string => {
    return `${num.toLocaleString()} Ugandan Shillings Only`;
  };

  const grandTotal = lineItems.reduce((sum, item) => sum + item.total, 0);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => { setPdfScan(evt.target?.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const addLineItem = () => { setLineItems([...lineItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]); };

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };
    if (field === 'unitPrice') {
      const p = typeof value === 'string' ? parseInt(value.replace(/\D/g, '') || '0') : value;
      item.unitPrice = p;
      item.total = item.quantity * p;
    } else if (field === 'quantity') {
      const q = typeof value === 'string' ? parseInt(value.replace(/\D/g, '') || '1') : value;
      item.quantity = q;
      item.total = q * item.unitPrice;
    }
    updated[index] = item;
    setLineItems(updated);
  };

  const handleFinalize = async () => {
    if (!selectedSchoolId || !physicalRef || !pdfScan || grandTotal === 0) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const generatedInvoiceId = `INV-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      const { error } = await supabase.from('invoices').insert([{
        id: generatedInvoiceId,
        school_id: selectedSchoolId,
        description: `Institutional Billing Artifact: ${physicalRef}`,
        amount: grandTotal,
        amount_in_words: amountToWords(grandTotal),
        line_items: lineItems,
        due_date: dueDate,
        status: 'Sent',
        physical_ref: physicalRef,
        pdf_scan: pdfScan
      }]);
      if (error) throw error;

      await supabase.from('audit_logs').insert([{
        operator_email: session?.user.email,
        operator_type: 'System Operator',
        action: `INVOICE_GENERATED_SUCCESS: ${generatedInvoiceId} | Value: UGX ${grandTotal.toLocaleString()}`,
        entity_id: selectedSchoolId,
        entity_type: 'SCHOOL'
      }]);

      alert(`Billing synchronized. Ref: ${generatedInvoiceId}`);
      fetchData();
      setSelectedSchoolId('');
      setPhysicalRef('');
      setPdfScan(null);
      setLineItems([{ description: '', quantity: 1, unitPrice: 0, total: 0 }]);
    } catch (err: any) {
      alert(`Sync Error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const formatCurrency = (num: number) => new Intl.NumberFormat('en-UG').format(num);
  const isFormValid = !!(selectedSchoolId && physicalRef && pdfScan && grandTotal > 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1700px] mx-auto pb-10">
      <div className="bg-[#0F172A] rounded-[2.5rem] shadow-2xl border border-indigo-900 overflow-hidden">
        <div className="p-6 border-b border-indigo-800/50 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <History className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Master Billing Ledger</h2>
           </div>
           <button onClick={handleClearAllInvoices} className="px-6 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-lg">
             <Eraser className="w-3.5 h-3.5" /> Clear Ledger
           </button>
        </div>
        <div className="overflow-x-auto min-h-[250px]">
           <table className="w-full text-left text-[11px]">
              <thead>
                 <tr className="bg-indigo-950/50 text-[9px] text-indigo-400 uppercase font-black tracking-widest border-b border-indigo-900">
                    <th className="px-8 py-3">Ref</th><th className="px-8 py-3">Institution</th><th className="px-8 py-3">Physical Ref</th><th className="px-8 py-3">Total</th><th className="px-8 py-3">Status</th><th className="px-8 py-3 text-right">Due</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-indigo-900/30">
                 {allInvoices.map(inv => (
                    <tr key={inv.id} onClick={() => setSelectedInvoiceForView(inv)} className="hover:bg-indigo-900/20 transition-colors cursor-pointer group">
                       <td className="px-8 py-3 font-black text-indigo-400 group-hover:text-[#FACC15]">{inv.id}</td>
                       <td className="px-8 py-3 font-black text-white uppercase">{inv.school_name || inv.school_id}</td>
                       <td className="px-8 py-3 text-indigo-300 font-bold uppercase">{inv.physical_ref || '---'}</td>
                       <td className="px-8 py-3 text-white font-black">UGX {formatCurrency(inv.amount)}</td>
                       <td className="px-8 py-3"><span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase ${inv.status === 'Paid' ? 'bg-emerald-900/50 text-emerald-400 border-emerald-800' : 'bg-indigo-900/50 text-indigo-300 border-indigo-800'}`}>{inv.status}</span></td>
                       <td className="px-8 py-3 text-right text-slate-400 font-black">{new Date(inv.due_date).toLocaleDateString('en-GB')}</td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
           <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><FileDigit className="w-6 h-6" /></div><div><h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Billing Initialization</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Digital-Physical Document Bridge</p></div></div>
           </div>
           <div className="p-10 space-y-10 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 gap-8">
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target School</label><select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-bold text-xs outline-none transition-all"><option value="">Search Registry...</option>{schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></div>
                 <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Ref</label><input placeholder="E.G. INV/2024/001" value={physicalRef} onChange={e => setPhysicalRef(e.target.value.toUpperCase())} className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl font-bold text-xs outline-none transition-all uppercase" /></div>
              </div>
              <div className="relative">
                <input type="file" id="invoice-scan" accept="application/pdf,image/*" className="hidden" onChange={handleFileUpload} />
                <label htmlFor="invoice-scan" className={`w-full py-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${pdfScan ? 'border-emerald-200 bg-emerald-50/20' : 'border-indigo-200 hover:border-indigo-400'}`}>
                  {pdfScan ? (
                    <FileCheck className="w-10 h-10 text-emerald-500" />
                  ) : (
                    <>
                      <DatabaseZap className="w-10 h-10 text-indigo-300" />
                      <p className="text-[10px] font-black text-indigo-900 uppercase">Load Artifact Scan</p>
                    </>
                  )}
                </label>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <input placeholder="Description" value={item.description} onChange={e => updateLineItem(idx, 'description', e.target.value)} className="flex-1 px-5 py-3.5 bg-slate-50 rounded-xl border border-transparent focus:border-indigo-200 font-bold text-xs" />
                    <input placeholder="UGX" value={item.unitPrice === 0 ? '' : formatCurrency(item.unitPrice)} onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)} className="w-32 px-5 py-3.5 bg-slate-50 rounded-xl border border-transparent focus:border-indigo-200 font-black text-xs text-right" />
                    {lineItems.length > 1 && (
                      <button onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="p-3 text-slate-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addLineItem} className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2 px-2 hover:text-indigo-800">
                  <Plus className="w-3.5 h-3.5" /> Add Line Item
                </button>
              </div>
              <div className="pt-10 flex items-center justify-between border-t border-slate-50">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Deadline</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-black uppercase" />
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 uppercase">Grand Total</p>
                   <p className="text-2xl font-black text-indigo-600">UGX {formatCurrency(grandTotal)}</p>
                </div>
                <button onClick={handleFinalize} disabled={!isFormValid || sending} className="px-16 py-5 bg-[#0F172A] text-[#FACC15] rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl flex items-center gap-3 active:scale-95 transition-all">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} Finalize Artifact
                </button>
              </div>
           </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 border-b border-slate-50 pb-4 mb-6 flex items-center gap-2">
                <FileBox className="w-4 h-4" /> Billing Guidelines
              </h4>
              <ul className="space-y-4">
                 {[
                   "All artifacts must include a high-resolution PDF or Image scan of the physical document.",
                   "Values are automatically normalized to Ugandan Shillings.",
                   "Clearing an invoice logic is logged in the global audit ledger.",
                   "Institutional access is automatically flagged if invoices exceed 30 days overdue."
                 ].map((tip, i) => (
                   <li key={i} className="flex gap-4 items-start">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5"><CheckCircle2 className="w-3 h-3 text-indigo-600" /></div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">{tip}</p>
                   </li>
                 ))}
              </ul>
           </div>
        </div>
      </div>

      {selectedInvoiceForView && (
        <div className="fixed inset-0 z-[600] bg-indigo-950/90 backdrop-blur-xl flex items-center justify-center p-8 overflow-hidden">
           <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-5xl h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl"><Receipt className="w-6 h-6" /></div>
                    <div>
                       <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Billing Artifact: {selectedInvoiceForView.id}</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Institutional Financial Node Verification</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedInvoiceForView(null)} className="p-4 hover:bg-white rounded-2xl text-slate-300 hover:text-red-500 transition-all shadow-sm"><X className="w-7 h-7" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex gap-12">
                 <div className="w-1/2 space-y-8">
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Status Audit</h4>
                       <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                          <div className="flex items-center gap-3">
                             {selectedInvoiceForView.status === 'Paid' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Clock className="w-6 h-6 text-amber-500" />}
                             <span className="text-sm font-black uppercase text-slate-700">{selectedInvoiceForView.status}</span>
                          </div>
                          {selectedInvoiceForView.status !== 'Paid' && (
                            <button onClick={() => handleSetCleared(selectedInvoiceForView)} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all">Clear Balance</button>
                          )}
                       </div>
                    </div>
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Ledger Summary</h4>
                       <table className="w-full text-left">
                          <tbody className="divide-y divide-slate-100">
                             {(selectedInvoiceForView.line_items || []).map((li, i) => (
                               <tr key={i} className="h-12"><td className="text-[11px] font-bold text-slate-600">{li.description}</td><td className="text-[11px] font-black text-slate-800 text-right">UGX {formatCurrency(li.total)}</td></tr>
                             ))}
                             <tr className="h-16 border-t-2 border-slate-100"><td className="text-[12px] font-black text-slate-900 uppercase">Grand Total</td><td className="text-base font-black text-indigo-600 text-right">UGX {formatCurrency(selectedInvoiceForView.amount)}</td></tr>
                          </tbody>
                       </table>
                    </div>
                 </div>
                 <div className="w-1/2 bg-slate-100 rounded-[2rem] border border-slate-200 shadow-inner overflow-hidden relative">
                    {selectedInvoiceForView.pdf_scan ? (
                       <iframe src={selectedInvoiceForView.pdf_scan} className="w-full h-full border-none" title="Invoice Scan" />
                    ) : (
                       <div className="flex flex-col items-center justify-center h-full opacity-20"><FileText className="w-20 h-20" /><p className="text-[11px] font-black uppercase tracking-[0.3em] mt-4">No digital scan attached</p></div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Financials;