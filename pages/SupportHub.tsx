import React, { useState, useEffect, useRef } from 'react';
import { 
  LifeBuoy, Search, Inbox, Send, CheckCircle2, Clock, AlertCircle, 
  Loader2, MoreVertical, Paperclip, Trash2, Filter, User, 
  Building2, ChevronRight, BookOpen, Reply, ShieldCheck, Mail, Users,
  Key, RefreshCw, ShieldAlert, Check
} from 'lucide-react';
import { supabase } from '../supabase';
import { SupportThread, SupportMessage, FAQArticle, School, ResetRequest } from '../types';

const SupportHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'threads' | 'security'>('threads');
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeThread, setActiveThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [faqs, setFaqs] = useState<FAQArticle[]>([]);
  const [resetRequests, setResetRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newReply, setNewReply] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchThreads();
    fetchFAQS();
    fetchResetRequests();
  }, []);

  useEffect(() => {
    if (activeThread) fetchMessages(activeThread.id);
  }, [activeThread]);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('support_threads').select('*, schools(name)').order('last_message_at', { ascending: false });
      if (data) setThreads(data.map(t => ({ ...t, school_name: t.schools?.name })));
    } finally { setLoading(false); }
  };

  const fetchResetRequests = async () => {
    const { data } = await supabase.from('reset_requests').select('*').eq('status', 'Pending').order('created_at', { ascending: false });
    if (data) setResetRequests(data);
  };

  const handleApproveReset = async (req: ResetRequest) => {
    const confirmApprove = confirm(`Initialize security reset for ${req.full_name}?`);
    if (!confirmApprove) return;

    setSending(true);
    try {
      // 1. Generate 8-character random password per instruction
      const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let newPass = "";
      for(let i=0; i<8; i++) newPass += charset.charAt(Math.floor(Math.random() * charset.length));
      
      // 2. Overwrite user password in Supabase Auth via RPC or Admin method
      // Note: In a real production app, this would call a secure edge function.
      // Assuming a logic flow for standard Auth update here.
      const { error: authErr } = await supabase.auth.admin.updateUserById(req.user_id, {
        password: newPass
      });
      if (authErr) throw authErr;

      // 3. Mark for mandatory reset in DB Registry
      await supabase.from(req.table_source).update({ needs_password_reset: true }).eq('id', req.user_id);
      
      // 4. Close request
      await supabase.from('reset_requests').update({ status: 'Approved' }).eq('id', req.id);

      // 5. Dispatch EmailJS (template_ysfduyo)
      const params = {
        admin_name: req.full_name,
        assigned_role: req.role,
        school_name: 'SMS MASTER CONSOLE',
        school_admin_email: req.email,
        generated_password: newPass
      };

      await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: 'service_s2bvvh2',
          template_id: 'template_ysfduyo',
          user_id: 'psRo0pR25zPBvGgeD',
          template_params: params
        })
      });

      alert(`Security Access Approved. Temporary Key dispatched via EmailJS.`);
      fetchResetRequests();
    } catch (err: any) {
      alert("Credential Dispatch Failure: " + err.message);
    } finally { setSending(false); }
  };

  const fetchMessages = async (threadId: string) => {
    const { data } = await supabase.from('support_messages').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const fetchFAQS = async () => {
    const { data } = await supabase.from('faq_articles').select('*').order('title');
    if (data) setFaqs(data);
  };

  const handleSendReply = async (content: string) => {
    if (!activeThread || !content.trim()) return;
    setSending(true);
    try {
      await supabase.from('support_messages').insert([{
        thread_id: activeThread.id,
        content,
        sender_role: 'Admin',
        sender_id: 'SYSTEM_ADMIN',
        is_read: true
      }]);
      await supabase.from('support_threads').update({ last_message_at: new Date().toISOString() }).eq('id', activeThread.id);
      setNewReply('');
      fetchMessages(activeThread.id);
    } finally { setSending(false); }
  };

  return (
    <div className="h-[calc(100vh-10rem)] overflow-hidden flex flex-col bg-white rounded-[2.5rem] shadow-xl border border-slate-100">
      {/* Header Tabs */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-[#0F172A] text-[#FACC15] rounded-2xl shadow-lg">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-widest">Support Hub</h1>
          </div>
          
          <div className="flex bg-white p-1 rounded-xl shadow-inner border border-slate-200">
             <button onClick={() => setActiveTab('threads')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'threads' ? 'bg-[#0F172A] text-white shadow-md' : 'text-slate-400 hover:text-indigo-600'}`}>Institutional Threads</button>
             <button onClick={() => setActiveTab('security')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'security' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-amber-600'}`}>
                Security Access
                {resetRequests.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
             </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'threads' ? (
          <>
            {/* Thread List */}
            <div className="w-96 border-r border-slate-100 bg-white flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-50">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Filter threads..." className="w-full bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-[10px] font-bold outline-none" />
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {threads.map(thread => (
                    <button key={thread.id} onClick={() => setActiveThread(thread)} className={`w-full p-5 border-b border-slate-50 text-left transition-all flex items-start gap-4 hover:bg-slate-50 ${activeThread?.id === thread.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${activeThread?.id === thread.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black uppercase text-slate-700 truncate">{thread.school_name}</p>
                          <p className="text-[11px] font-black text-slate-900 truncate">{thread.subject}</p>
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Chat Pane */}
            <div className="flex-1 flex flex-col bg-slate-50/30">
              {activeThread ? (
                <>
                  <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                    {messages.map(msg => (
                      <div key={msg.id} className={`flex items-start gap-4 ${msg.sender_role === 'Admin' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${msg.sender_role === 'Admin' ? 'bg-[#0F172A] text-[#FACC15]' : 'bg-white text-slate-400'}`}>
                          {msg.sender_role === 'Admin' ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>
                        <div className={`p-5 rounded-[2rem] shadow-sm text-sm font-medium ${msg.sender_role === 'Admin' ? 'bg-[#0F172A] text-white rounded-tr-none shadow-[#FACC15]/5' : 'bg-white text-slate-700 rounded-tl-none'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="p-8 bg-white border-t border-slate-100">
                    <div className="bg-slate-50 rounded-[2.5rem] p-4 flex gap-4 border border-transparent focus-within:border-[#0F172A] transition-all shadow-inner">
                      <textarea value={newReply} onChange={e => setNewReply(e.target.value)} placeholder="Type institutional response..." className="flex-1 bg-transparent border-none text-sm font-bold text-slate-700 outline-none resize-none h-20" />
                      <button onClick={() => handleSendReply(newReply)} disabled={sending} className="bg-[#0F172A] text-[#FACC15] p-6 rounded-3xl shadow-xl active:scale-95 transition-all self-end"><Send className="w-5 h-5" /></button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 gap-6">
                  <Inbox className="w-20 h-20 text-slate-200" />
                  <p className="text-[12px] font-black uppercase tracking-[0.4em]">Select active thread</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Security Access Pane */
          <div className="flex-1 p-10 bg-slate-50/50 overflow-y-auto custom-scrollbar">
             <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-end mb-10">
                   <div>
                      <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Security Access Ledger</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">Manual verification required for credential recovery.</p>
                   </div>
                   <div className="bg-amber-50 px-6 py-3 rounded-2xl border border-amber-200 flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                      <span className="text-[11px] font-black text-amber-700 uppercase tracking-widest">{resetRequests.length} Pending Approvals</span>
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                   {resetRequests.map(req => (
                     <div key={req.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-all">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-md">
                              <Key className="w-7 h-7 text-indigo-600" />
                           </div>
                           <div>
                              <p className="text-[13px] font-black text-slate-800 uppercase">{req.full_name}</p>
                              <p className="text-[10px] font-bold text-slate-400 lowercase">{req.email}</p>
                              <div className="flex gap-2 mt-2">
                                 <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase border border-indigo-100">{req.role}</span>
                                 <span className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded uppercase border border-slate-100">{new Date(req.created_at).toLocaleDateString()}</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex gap-4">
                           <button 
                             onClick={() => handleApproveReset(req)}
                             disabled={sending}
                             className="px-10 py-4 bg-[#0F172A] text-[#FACC15] rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                           >
                              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              Approve Reset
                           </button>
                        </div>
                     </div>
                   ))}
                   {resetRequests.length === 0 && (
                      <div className="py-32 text-center opacity-30 flex flex-col items-center gap-6 bg-white rounded-[3rem] border border-dashed border-slate-200">
                         <ShieldCheck className="w-20 h-20 text-slate-200" />
                         <p className="text-[14px] font-black uppercase tracking-[0.5em]">Credential Registry Clear</p>
                      </div>
                   )}
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportHub;