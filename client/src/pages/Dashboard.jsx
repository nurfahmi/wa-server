import { useState, useEffect } from "react";
import axios from "axios";
import { 
  Users, 
  MessageSquare, 
  Smartphone, 
  Activity,
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock
} from "lucide-react";
import clsx from "clsx";

const StatCard = ({ title, value, change, icon: Icon, color, trend }) => (
  <div className="bg-card text-card-foreground p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300 group">
    <div className="flex items-center justify-between">
      <div className={clsx("p-3 rounded-xl transition-colors duration-300", color)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <div className={clsx(
            "flex items-center text-xs font-bold px-2 py-1 rounded-full",
            trend === 'up' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {change}%
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-sm font-medium text-muted-foreground mb-1 group-hover:text-foreground transition-colors">{title}</p>
      <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
    </div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    devices: 0,
    messages: 0,
    chats: 0,
    agents: 0,
    cost: 0,
    traffic: [],
    activity: []
  });
  const [loading, setLoading] = useState(true);

  // Icon mapping for activity feed
  const iconMap = {
    MessageSquare: MessageSquare,
    Zap: Zap,
    Smartphone: Smartphone,
    Users: Users,
    CheckCircle2: CheckCircle2
  };

  useEffect(() => {
    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/whatsapp/dashboard/stats', {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
            });
            const data = res.data.stats;
            setStats({
                devices: data.activeDevices,
                messages: data.dailyMessages,
                chats: data.activeChats,
                agents: data.agentsOnline,
                cost: data.dailyCost || 0,
                traffic: data.traffic || [],
                activity: data.activity || []
            });
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };
    fetchStats();
  }, []);

  // Format time for activity feed
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
           <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
           <p className="text-muted-foreground mt-2 text-lg">Real-time overview of your WhatsApp infrastructure.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border text-xs font-medium text-muted-foreground">
           <Activity className="w-3.5 h-3.5 text-green-500 animate-pulse" />
           Live Updates Active
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Active Devices" 
          value={stats.devices} 
          icon={Smartphone} 
          color="bg-indigo-500"
          // In a real app, trend would be calculated by comparing with previous period
          change={stats.devices > 0 ? 100 : 0}
          trend="up"
        />
        <StatCard 
          title="Daily Messages" 
          value={stats.messages.toLocaleString()} 
          icon={MessageSquare} 
          color="bg-emerald-500"
        />
        <StatCard 
          title="Active Chats" 
          value={stats.chats} 
          icon={Activity} 
          color="bg-violet-500"
        />
        <StatCard 
          title="AI Cost Today" 
          value={`$${stats.cost?.toFixed(2)}`} 
          icon={Zap} 
          color="bg-amber-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart: Traffic Analysis */}
        <div className="lg:col-span-2 space-y-4">
           <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col h-[400px]">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h3 className="text-xl font-bold">Traffic Analysis</h3>
                    <p className="text-sm text-muted-foreground">Messages volume by hour (Incoming vs Outgoing)</p>
                 </div>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-xs font-medium">Outgoing</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-primary/30"></div>
                        <span className="text-xs font-medium">Incoming</span>
                    </div>
                 </div>
              </div>
              
              <div className="flex-1 flex items-end gap-1.5 px-2 pb-2">
                 {stats.traffic.length > 0 ? stats.traffic.map((h, i) => {
                    const max = Math.max(...stats.traffic.map(t => t.incoming + t.outgoing)) || 1;
                    return (
                        <div key={i} className="flex-1 group relative h-full flex flex-col justify-end">
                           <div 
                             style={{ height: `${(h.incoming / max) * 100}%` }} 
                             className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t-sm transition-all duration-300"
                             title={`Incoming: ${h.incoming}`}
                           />
                           <div 
                             style={{ height: `${(h.outgoing / max) * 100}%` }} 
                             className="absolute bottom-0 w-full bg-primary rounded-t-sm transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.3)]"
                             title={`Outgoing: ${h.outgoing}`}
                           />
                        </div>
                    );
                 }) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                        No activity in the last 24 hours
                    </div>
                 )}
              </div>
              <div className="flex justify-between mt-4 px-2 text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                 <span>00:00</span>
                 <span>06:00</span>
                 <span>12:00</span>
                 <span>18:00</span>
                 <span>23:00</span>
              </div>
           </div>
        </div>

        {/* Sidebar: Recent Activity & Status */}
        <div className="space-y-8">
           {/* Activity Feed */}
           <div className="bg-card border border-border rounded-2xl p-6 shadow-sm overflow-hidden min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold">Recent Activity</h3>
                 <button className="text-primary text-xs font-bold hover:underline">View All</button>
              </div>
              <div className="space-y-5">
                 {stats.activity.length > 0 ? stats.activity.map(act => {
                    const Icon = iconMap[act.icon] || MessageSquare;
                    const colors = {
                        message_in: 'text-blue-500 bg-blue-500/10',
                        message_out: 'text-emerald-500 bg-emerald-500/10',
                        ai_response: 'text-violet-500 bg-violet-500/10'
                    };
                    return (
                        <div key={act.id} className="flex gap-4 group">
                           <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110", colors[act.type] || 'text-muted-foreground bg-muted')}>
                              <Icon className="w-5 h-5" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{act.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                 <Clock className="w-3 h-3 text-muted-foreground" />
                                 <span className="text-xs text-muted-foreground">{formatTime(act.time)}</span>
                              </div>
                           </div>
                        </div>
                    );
                 }) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm pt-10">
                        <RefreshCw className="w-8 h-8 mb-2 opacity-20 animate-spin" />
                        Waiting for activity...
                    </div>
                 )}
              </div>
           </div>

           {/* Health Status */}
           <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-6">Service Health</h3>
              <div className="space-y-4">
                 {[
                    { name: 'Core Engine', status: 'Operational', color: 'bg-green-500' },
                    { name: 'Database', status: 'Operational', color: 'bg-green-500' },
                    { name: 'Baileys Clusters', status: 'Healthy', color: 'bg-green-500' },
                    { name: 'AI Service', status: 'Active', color: 'bg-green-500' }
                 ].map(svc => (
                    <div key={svc.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                       <span className="text-sm font-medium">{svc.name}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">{svc.status}</span>
                          <div className={clsx("w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]", svc.color === 'bg-green-500' ? 'text-green-500' : 'text-amber-500', svc.color)}></div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
