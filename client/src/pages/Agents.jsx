import { useState, useEffect } from "react";
import axios from "axios";
import { useLanguage } from "../context/LanguageContext";
import { 
  UserPlus, 
  Users, 
  Trash2, 
  RefreshCw, 
  Shield, 
  Mail, 
  User, 
  TrendingUp, 
  MessageSquare, 
  Clock,
  CheckCircle2,
  X,
  Search,
  Filter
} from "lucide-react";
import clsx from "clsx";

export default function Agents() {
  const { t } = useLanguage();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/whatsapp/agents", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setAgents(res.data.agents || []);
    } catch (error) {
      console.error("Failed to fetch agents", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await axios.post("/api/whatsapp/agents", newAgent, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setShowAddModal(false);
      setNewAgent({ name: "", email: "", password: "" });
      fetchAgents();
    } catch (error) {
      alert("Failed to create agent: " + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this agent? They will lose access immediately.")) return;
    try {
      await axios.delete(`/api/whatsapp/agents/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      fetchAgents();
    } catch (error) {
      alert("Failed to delete agent");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Shield className="w-5 h-5 text-primary" />
             <span className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{t('agents.teamManagement')}</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">{t('agents.csAgents')}</h1>
          <p className="text-muted-foreground text-lg">{t('agents.subtitle')}</p>
        </div>
        <button 
           onClick={() => setShowAddModal(true)}
           className="px-8 py-4 bg-primary text-primary-foreground rounded-[2rem] font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-105 active:scale-95"
        >
           <UserPlus className="w-5 h-5" />
           {t('agents.addAgent')}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: t('agents.totalAgents'), value: agents.length, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
           { label: t('agents.activeNow'), value: agents.filter(a => a.lastLogin && new Date(a.lastLogin) > new Date(Date.now() - 3600000)).length, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
           { label: t('agents.totalHandled'), value: agents.reduce((acc, a) => acc + (a.totalChatsCount || 0), 0), icon: MessageSquare, color: "text-purple-500", bg: "bg-purple-500/10" },
           { label: t('agents.inProgress'), value: agents.reduce((acc, a) => acc + (a.activeChatsCount || 0), 0), icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" }
         ].map((stat, i) => (
           <div key={i} className="bg-card border border-border p-6 rounded-[2.5rem] shadow-sm flex items-center gap-4 group hover:shadow-lg transition-all">
              <div className={clsx("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", stat.bg)}>
                 <stat.icon className={clsx("w-7 h-7", stat.color)} />
              </div>
              <div>
                 <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider opacity-60">{stat.label}</p>
                 <p className="text-2xl font-black">{stat.value}</p>
              </div>
           </div>
         ))}
      </div>

      {/* Agents Table/Grid */}
      <div className="bg-card border border-border rounded-[3rem] overflow-hidden shadow-sm">
         <div className="p-8 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/10">
            <h3 className="text-xl font-bold">{t('agents.manageAgents')}</h3>
            <div className="flex items-center gap-3">
               <div className="relative flex-1 sm:min-w-[300px]">
                  <Search className="absolute left-4 top-3 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder={t('agents.searchPlaceholder')} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-background border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary outline-none"
                  />
               </div>
               <button onClick={fetchAgents} className="p-2.5 bg-background border border-border rounded-xl hover:bg-muted transition-colors">
                  <RefreshCw className={clsx("w-5 h-5 text-muted-foreground", loading && "animate-spin")} />
               </button>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full">
               <thead>
                  <tr className="text-left border-b border-border bg-muted/5">
                     <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">{t('agents.agentDetails')}</th>
                     <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">{t('agents.workload')}</th>
                     <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">{t('agents.lastActivity')}</th>
                     <th className="px-8 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">{t('agents.actions')}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {loading ? (
                    [1,2,3].map(i => (
                      <tr key={i} className="animate-pulse">
                         <td colSpan="4" className="px-8 py-6 h-20 bg-muted/10" />
                      </tr>
                    ))
                  ) : filteredAgents.length === 0 ? (
                    <tr>
                       <td colSpan="4" className="px-8 py-20 text-center">
                          <div className="flex flex-col items-center opacity-40">
                             <Users className="w-16 h-16 mb-4" />
                             <p className="text-lg font-bold">{searchTerm ? t('agents.noMatches') : t('agents.noAgents')}</p>
                             <p className="text-sm">{searchTerm ? t('agents.tryDifferentSearch') : t('agents.startByAdding')}</p>
                          </div>
                       </td>
                    </tr>
                  ) : filteredAgents.map((agent) => (
                     <tr key={agent.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-4">
                              <div className="relative">
                                 <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-lg shadow-md group-hover:scale-110 transition-transform">
                                    {agent.name.substring(0, 2).toUpperCase()}
                                 </div>
                                 <div className={clsx(
                                   "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-card shadow-sm",
                                   (agent.lastLogin && new Date(agent.lastLogin) > new Date(Date.now() - 3600000)) ? "bg-green-500" : "bg-muted-foreground/30"
                                 )}></div>
                              </div>
                              <div>
                                 <p className="font-bold text-foreground">{agent.name}</p>
                                 <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mt-1 opacity-60">{agent.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex flex-col gap-1">
                              <div className="flex justify-between items-center w-32">
                                 <span className="text-[10px] font-black text-muted-foreground uppercase">{t('agents.activeChats')}</span>
                                 <span className="text-xs font-black text-primary">{agent.activeChatsCount || 0}</span>
                              </div>
                              <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden border border-border">
                                 <div
                                    className="h-full bg-primary transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (agent.activeChatsCount / 10) * 100)}%` }}
                                 />
                              </div>
                              <p className="text-[10px] text-muted-foreground font-medium">{agent.totalChatsCount || 0} {t('agents.totalHandledCount')}</p>
                           </div>
                        </td>
                        <td className="px-8 py-5">
                           <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">
                                 {agent.lastLogin ? new Date(agent.lastLogin).toLocaleDateString() : "Never"}
                              </span>
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
                                 {agent.lastLogin ? new Date(agent.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "No activity"}
                              </span>
                           </div>
                        </td>
                       <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                             <button className="p-2 hover:bg-muted rounded-xl transition-colors" title="Performance Details">
                                <TrendingUp className="w-5 h-5 text-indigo-500" />
                             </button>
                             <button
                                onClick={() => handleDelete(agent.id)}
                                className="p-2 hover:bg-destructive/10 rounded-xl transition-colors text-destructive"
                                title="Revoke Access"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-6 border-t border-border bg-muted/5 flex justify-between items-center text-sm text-muted-foreground">
            <p>{t('agents.showing')} <b>{filteredAgents.length}</b> {t('agents.agentsCount')}</p>
            <div className="flex items-center gap-2">
               <button className="px-4 py-2 bg-background border border-border rounded-xl hover:bg-muted disabled:opacity-50" disabled>{t('agents.previous')}</button>
               <button className="px-4 py-2 bg-background border border-border rounded-xl hover:bg-muted disabled:opacity-50" disabled>{t('agents.next')}</button>
            </div>
         </div>
      </div>

      {/* Add Agent Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-card text-card-foreground rounded-[3rem] shadow-2xl border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="px-10 py-8 border-b border-border flex justify-between items-center bg-muted/10">
                 <div>
                    <h3 className="text-2xl font-black flex items-center gap-3 text-primary">
                       <UserPlus className="w-8 h-8" /> {t('agents.addCSAgent')}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('agents.accessInfo')}</p>
                 </div>
                 <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X className="w-6 h-6 text-muted-foreground" />
                 </button>
              </div>

              <form onSubmit={handleCreate} className="p-10 space-y-6">
                 <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2 px-1">
                       <User className="w-4 h-4 text-primary" /> {t('agents.fullName')}
                    </label>
                    <input 
                       required
                       type="text" 
                       value={newAgent.name}
                       onChange={e => setNewAgent({...newAgent, name: e.target.value})}
                       className="w-full px-6 py-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none font-medium"
                       placeholder="e.g. John Doe"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2 px-1">
                       <Mail className="w-4 h-4 text-primary" /> {t('agents.emailAddress')}
                    </label>
                    <input 
                       required
                       type="email" 
                       value={newAgent.email}
                       onChange={e => setNewAgent({...newAgent, email: e.target.value})}
                       className="w-full px-6 py-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none font-medium"
                       placeholder="john@example.com"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center gap-2 px-1">
                       <Shield className="w-4 h-4 text-primary" /> {t('agents.temporaryPassword')}
                    </label>
                    <input 
                       required
                       type="password" 
                       value={newAgent.password}
                       onChange={e => setNewAgent({...newAgent, password: e.target.value})}
                       className="w-full px-6 py-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none font-medium"
                       placeholder="********"
                    />
                 </div>

                 <div className="pt-4 flex gap-4">
                    <button 
                       type="button"
                       onClick={() => setShowAddModal(false)}
                       className="flex-1 py-4 bg-muted hover:bg-muted/80 rounded-2xl font-bold transition-all text-foreground"
                    >
                       {t('agents.cancel')}
                    </button>
                    <button 
                       type="submit"
                       disabled={saving}
                       className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       {saving ? <RefreshCw className="w-5 h-5 animate-spin"/> : <CheckCircle2 className="w-5 h-5"/>}
                       {t('agents.createAccount')}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
