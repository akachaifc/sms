
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  ShieldAlert, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ShieldCheck, 
  Power,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../supabase';
import { School, Invoice } from '../types';

const InstitutionalRegistry: React.FC = () => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    setLoading(true);
    try {
      const { data: schoolsData } = await supabase.from('schools').select('*').order('name');
      const { data: overdueInvoices } = await supabase
        .from('invoices')
        .select('school_id, due_date')
        .eq('status', 'Overdue');
      
      const schoolsMap = (schoolsData || []).map(school => {
        const overdue = (overdueInvoices || []).find(inv => {
          if (inv.school_id !== school.id) return false;
          const dueDate = new Date(inv.due_date);
          const diffDays = Math.ceil((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays > 30;
        });

        const status: School['status'] = school.status || 'Active';
        return {
          ...school,
          status: overdue ? 'Grace Period' : status
        };
      });

      setSchools(schoolsMap);
    } finally {
      setLoading(false);
    }
  };

  const toggleLicense = async (e: React.MouseEvent, schoolId: string, currentStatus: School['status']) => {
    e.stopPropagation();
    setProcessingId(schoolId);
    const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
    
    try {
      const { error } = await supabase
        .from('schools')
        .update({ status: newStatus })
        .eq('id', schoolId);
      
      if (error) throw error;
      
      await supabase.from('audit_logs').insert([{
        operator_email: 'SYSTEM_ADMIN',
        action: `Institutional status changed to ${newStatus} for ${schoolId}`,
        entity_id: schoolId,
        entity_type: 'SCHOOL'
      }]);

      setSchools(schools.map(s => s.id === schoolId ? { ...s, status: newStatus } : s));
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = schools.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            Institutional Access Control
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">School Lifecycle and Subscription Management.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search schools by name or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="flex items-center gap-2">
             <Filter className="w-4 h-4 text-slate-400" />
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Schools</span>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div>
          ) : (
            <table className="w-full text-left table-dense">
              <thead>
                <tr className="bg-slate-50 text-[9px] text-slate-400 uppercase font-black tracking-widest border-b border-slate-100">
                  <th className="px-8 py-4">School Profile</th>
                  <th className="px-8 py-4">Login Status</th>
                  <th className="px-8 py-4">Infrastructure</th>
                  <th className="px-8 py-4 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(school => (
                  <tr 
                    key={school.id} 
                    onClick={() => navigate(`/schools/${school.id}`)}
                    className="hover:bg-indigo-50/30 transition-all group cursor-pointer"
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-[12px] font-black text-slate-900 uppercase">{school.name}</p>
                          <p className="text-[9px] font-bold text-slate-400">School ID: {school.id} • {school.district}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center w-fit gap-1.5 ${
                        school.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
                        school.status === 'Suspended' ? 'bg-red-50 text-red-600' : 
                        'bg-amber-50 text-amber-600'
                      }`}>
                        {school.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : 
                         school.status === 'Suspended' ? <ShieldAlert className="w-3 h-3" /> : 
                         <Clock className="w-3 h-3" />}
                        {school.status}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex gap-2">
                        <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">{school.infrastructure_type}</span>
                        <span className="bg-slate-100 text-slate-600 text-[8px] font-black px-2 py-0.5 rounded uppercase">{school.residence_type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                       <div className="flex justify-end gap-3 transition-all">
                          <button 
                            onClick={(e) => toggleLicense(e, school.id, school.status)}
                            disabled={processingId === school.id}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                              school.status === 'Suspended' 
                              ? 'bg-emerald-600 text-white shadow-lg' 
                              : 'bg-red-600 text-white shadow-lg'
                            }`}
                          >
                            {processingId === school.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Power className="w-3 h-3" />}
                            {school.status === 'Suspended' ? 'Restore Login' : 'DISABLE ACCESS'}
                          </button>
                          <div className="p-2 text-slate-300 group-hover:text-indigo-600 transition-colors">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest">School Compliance Notice</h4>
          <p className="text-[10px] text-amber-700 font-bold mt-1 leading-relaxed uppercase">
            Disabling access will immediately log out all users from that school. Open the school record for more detailed management.
          </p>
        </div>
      </div>
    </div>
  );
};

export default InstitutionalRegistry;
