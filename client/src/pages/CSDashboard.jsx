import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { 
  MessageCircle, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  User,
  MoreHorizontal,
  ArrowRight,
  Monitor,
  Activity,
  Users,
  Settings,
  RefreshCw,
  Bot,
  Package
} from "lucide-react";
import clsx from "clsx";

const StatusBadge = ({ status }) => {
    const styles = {
        open: "bg-green-500/10 text-green-500 border-green-500/20",
        pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
        resolved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        closed: "bg-muted text-muted-foreground border-border",
        urgent: "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
    };
    return (
        <span className={clsx(
            "px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all duration-300",
            styles[status] || styles.closed
        )}>
            {status}
        </span>
    );
};

export default function CSDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    counts: { open: 0, pending: 0, resolved: 0, unassigned: 0, urgent: 0, total: 0 },
    aiStats: { aiCount: 0, humanCount: 0, ratio: 0 },
    priorityQueue: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [agentsRes, statsRes] = await Promise.all([
        axios.get("/api/whatsapp/agents", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
        axios.get("/api/whatsapp/cs/dashboard-stats", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
      ]);
      setAgents(agentsRes.data.agents || []);
      setStats(statsRes.data);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const onlineAgents = agents.filter(a => a.lastLogin && new Date(a.lastLogin) > new Date(Date.now() - 3600000));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">{t('csDashboard.title')}</h1>
            <p className="text-muted-foreground mt-1 font-medium">{t('csDashboard.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={fetchData} className="p-2.5 bg-card border border-border text-muted-foreground rounded-xl hover:text-foreground transition-all">
               <RefreshCw className={clsx("w-5 h-5", loading && "animate-spin")} />
            </button>
            <Link to="/app/agents" className="flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl hover:bg-muted transition-all font-bold shadow-sm">
               <Users className="w-4 h-4 text-primary" />
               {t('csDashboard.team')}
            </Link>
            <Link to="/app/chats" className="group flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl hover:scale-[1.02] transition-all shadow-xl shadow-primary/20 font-black uppercase tracking-wider text-xs">
               {t('csDashboard.liveInbox')}
               <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
       </div>

       {/* Queue Stats Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: t('csDashboard.agentsOnline'), value: `${onlineAgents.length} / ${agents.length}`, sub: t('csDashboard.activeNow'), icon: User, color: "text-orange-500 bg-orange-500/10 border-orange-500/20" },
            { label: t('csDashboard.pendingResponse'), value: stats.counts.pending, sub: t('csDashboard.needsAttention'), icon: Clock, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
            { label: t('csDashboard.urgentQueue'), value: stats.counts.urgent, sub: t('csDashboard.highPriority'), icon: AlertCircle, color: "text-red-500 bg-red-500/10 border-red-500/20" },
            { label: t('csDashboard.aiEfficiency'), value: `${Math.round(stats.aiStats.ratio)}%`, sub: t('csDashboard.autoHandled'), icon: Bot, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" }
          ].map((stat, i) => (
            <div key={i} className="bg-card text-card-foreground p-6 rounded-[2rem] border border-border shadow-sm flex items-center justify-between hover:shadow-xl hover:border-primary/20 transition-all group overflow-hidden relative">
               <div className="relative z-10">
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-3xl font-black mt-1 tracking-tight">{stat.value}</h3>
                  <p className="text-[10px] text-muted-foreground font-bold mt-1 opacity-60 italic">{stat.sub}</p>
               </div>
               <div className={clsx("p-4 rounded-2xl border transition-all group-hover:scale-110 relative z-10", stat.color)}>
                  <stat.icon className="w-7 h-7"/>
               </div>
               <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
            </div>
          ))}
       </div>

        {/* Main Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Priority Queue List */}
           <div className="lg:col-span-2 bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden">
              <div className="px-8 py-6 border-b border-border flex justify-between items-center bg-muted/20">
                 <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-2xl">
                       <Monitor className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-black text-xl tracking-tight">{t('csDashboard.priorityQueue')}</h3>
                 </div>
                 <Link to="/app/chats" className="text-[10px] font-black text-primary hover:bg-primary/5 px-4 py-2 rounded-xl transition-all uppercase tracking-widest border border-primary/20">
                    {t('csDashboard.liveView')}
                 </Link>
              </div>
              <div className="divide-y divide-border">
                 {!stats.priorityQueue || stats.priorityQueue.length === 0 ? (
                    <div className="p-20 text-center text-muted-foreground">
                       <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-10" />
                       <p className="font-bold">{t('csDashboard.queueClear')}</p>
                       <p className="text-xs mt-1">{t('csDashboard.noUrgentConversations')}</p>
                    </div>
                 ) : stats.priorityQueue.map(chat => (
                    <Link 
                      to={`/app/chats?chatId=${chat.chatId}&deviceId=${chat.deviceId}`}
                      key={chat.id} 
                      className="p-6 hover:bg-muted/30 transition-all flex items-center gap-6 group cursor-pointer"
                    >
                       <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-600/10 flex items-center justify-center text-primary font-black text-lg shrink-0 border border-primary/10 group-hover:scale-105 transition-transform shadow-sm">
                          {(chat.contactName || "?")[0].toUpperCase()}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                             <h4 className="font-black text-foreground group-hover:text-primary transition-colors tracking-tight truncate pr-4">{chat.contactName || chat.phoneNumber}</h4>
                             <span className="text-[10px] font-black text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-lg border border-border flex items-center gap-1 shrink-0 uppercase tracking-widest">
                                <Clock className="w-3 h-3"/> {new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate leading-relaxed font-medium mb-3">
                            {chat.lastMessageContent || t('chats.noChats')}
                          </p>
                          <div className="flex items-center gap-4">
                             <StatusBadge status={chat.status || 'open'} />
                             {chat.priority === 'urgent' && (
                                <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                                   {t('status.urgent')}
                                </span>
                             )}
                             <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-black uppercase tracking-widest ml-auto opacity-70">
                                <User className="w-3.5 h-3.5"/>
                                {chat.assignedAgentName || t('chats.unassigned')}
                             </div>
                          </div>
                       </div>
                    </Link>
                 ))}
              </div>
           </div>

           {/* Agent Status Monitoring */}
           <div className="space-y-6">
              <div className="bg-card rounded-[2.5rem] shadow-sm border border-border overflow-hidden">
                 <div className="px-8 py-6 border-b border-border bg-muted/20 flex justify-between items-center">
                    <h3 className="font-black text-xl tracking-tight">{t('csDashboard.agentActivity')}</h3>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black uppercase tracking-widest text-green-500 animate-pulse">{t('csDashboard.live')}</span>
                       <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                 </div>
                 <div className="p-6 space-y-4">
                    {loading ? (
                       <div className="py-10 text-center text-muted-foreground text-sm font-bold animate-pulse">{t('csDashboard.loadingAgents')}</div>
                    ) : agents.length === 0 ? (
                       <div className="py-10 text-center">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-10" />
                          <p className="text-sm text-muted-foreground font-bold">{t('csDashboard.noAgents')}</p>
                       </div>
                    ) : agents.map((agent, i) => (
                       <div key={i} className="flex items-center justify-between p-4 rounded-[1.5rem] hover:bg-muted/50 transition-all border border-transparent hover:border-border group">
                          <div className="flex items-center gap-4">
                             <div className="relative">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-black text-lg border border-primary/10 shadow-sm">
                                   {agent.name[0]}
                                </div>
                                <div className={clsx(
                                   "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-card shadow-sm",
                                   (agent.lastLogin && new Date(agent.lastLogin) > new Date(Date.now() - 3600000)) ? "bg-green-500" : "bg-muted-foreground/30"
                                )}></div>
                             </div>
                             <div className="min-w-0">
                                <p className="text-[13px] font-black truncate group-hover:text-primary transition-colors tracking-tight">{agent.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                                   {(agent.lastLogin && new Date(agent.lastLogin) > new Date(Date.now() - 3600000)) ? t('csDashboard.online') : t('csDashboard.offline')}
                                </p>
                             </div>
                          </div>
                          <div className="text-right">
                             <span className="text-[9px] font-black bg-muted/50 text-foreground px-2.5 py-1.5 rounded-lg border border-border shadow-sm uppercase tracking-widest block">
                                {agent.role}
                             </span>
                          </div>
                       </div>
                    ))}
                 </div>
                 {user?.role !== 'agent' && (
                    <div className="p-6 bg-muted/10 border-t border-border mt-2">
                      <Link to="/app/agents" className="w-full flex justify-center py-4 text-[10px] font-black text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all border border-dashed border-border/50 uppercase tracking-widest">
                          {t('csDashboard.teamSettings')}
                      </Link>
                    </div>
                 )}
              </div>

              {/* AI vs Human Stats Card */}
              <div className="bg-card rounded-[2.5rem] border border-border p-8 shadow-sm relative overflow-hidden group">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60 mb-1">{t('csDashboard.automationImpact')}</h4>
                       <p className="text-2xl font-black tracking-tight">{t('csDashboard.handlingRatio')}</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-2xl">
                       <Activity className="w-5 h-5 text-purple-500" />
                    </div>
                 </div>
                 
                 <div className="space-y-6 relative z-10">
                    <div className="space-y-3">
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                          <span className="text-purple-500">{t('csDashboard.aiManaged')}</span>
                          <span>{Math.round(stats.aiStats.ratio)}%</span>
                       </div>
                       <div className="h-3 bg-muted rounded-full overflow-hidden border border-border shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-1000 shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                            style={{ width: `${stats.aiStats.ratio}%` }}
                          />
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-muted/30 rounded-2xl border border-border group-hover:bg-card transition-colors">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{t('csDashboard.aiHandled')}</p>
                          <p className="text-2xl font-black mt-1 text-purple-500">{stats.aiStats.aiCount}</p>
                       </div>
                       <div className="p-4 bg-muted/30 rounded-2xl border border-border group-hover:bg-card transition-colors">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{t('csDashboard.agents')}</p>
                          <p className="text-2xl font-black mt-1">{stats.aiStats.humanCount}</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
              </div>
           </div>
        </div>
    </div>
  );
}
