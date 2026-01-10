import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { 
  Smartphone, 
  Plus, 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Copy,
  Brain,
  LogOut,
  Zap,
  Calendar,
  Phone,
  Crown,
  Clock,
  User,
  ShieldCheck,
  MessageSquare
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

export default function Devices() {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [copiedId, setCopiedId] = useState(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/whatsapp/devices", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setDevices(res.data.sessions || []);
    } catch (error) {
      console.error("Failed to fetch devices", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleDelete = async (deviceId) => {
    if (!confirm("Are you sure you want to delete this device?")) return;
    try {
      await axios.delete(`/api/whatsapp/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      fetchDevices();
    } catch (e) {
      alert("Failed to delete device");
    }
  };

  const handleLogout = async (deviceId) => {
    try {
        await axios.post(`/api/whatsapp/devices/${deviceId}/logout`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        fetchDevices();
    } catch (e) {
        alert("Logout failed");
    }
  };

  const handleReconnect = async (deviceId) => {
    try {
        const res = await axios.post(`/api/whatsapp/devices/${deviceId}/login`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        setSelectedDevice(deviceId);
        if (res.data.qr) {
            setQrCode(res.data.qr);
            setShowAddModal(true);
        } else {
            fetchDevices();
        }
    } catch (e) {
        alert("Reconnect failed");
    }
  };

  const handleRefreshStatus = async (deviceId) => {
     try {
         await axios.get(`/api/whatsapp/devices/${deviceId}`, {
             headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
         });
         fetchDevices();
     } catch (e) {}
  };

  const handleCopyApiKey = (key, id) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };


  const handleCreateSession = async () => {
    if (!newSessionId) return;
    setConnectionStatus("connecting");
    try {
        const res = await axios.post(`/api/whatsapp/devices`, {
            alias: newSessionId,
            userId: user.id
        }, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        
        const device = res.data.device;
        let qr = res.data.qr;
        
        if (qr) {
            setQrCode(qr);
        } else {
             setShowAddModal(false);
             fetchDevices();
        }
        
    } catch (err) {
        console.error(err);
        setConnectionStatus("error");
        alert("Failed to create session: " + (err.response?.data?.error || err.message));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }) + ' ' + date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
  };

  const deviceCount = devices.length;
  const deviceLimit = user?.deviceLimit || 1;
  const usagePercentage = Math.min(100, (deviceCount / deviceLimit) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header & Limit Info */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">WA Devices</h1>
          <p className="text-muted-foreground text-lg">Connect and control your WhatsApp business accounts.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm min-w-[320px]">
           <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                 <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-primary" /> Usage</span>
                 <span className="text-primary">{deviceCount} / {deviceLimit}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                 <div 
                   className={clsx(
                     "h-full transition-all duration-1000 ease-out rounded-full",
                     usagePercentage > 90 ? "bg-destructive shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                   )}
                   style={{ width: `${usagePercentage}%` }}
                 />
              </div>
           </div>
           <div className="flex gap-2 shrink-0">
               <button 
                  onClick={() => setShowAddModal(true)}
                  disabled={deviceCount >= deviceLimit}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-bold text-sm disabled:opacity-50 shadow-lg shadow-primary/20"
               >
                  <Plus className="w-4 h-4" /> Add More
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-xl hover:bg-accent transition-all font-bold text-sm">
                  <Crown className="w-4 h-4 text-amber-500" /> Get More
               </button>
           </div>
        </div>
      </div>

      {/* Device Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
                <div key={i} className="h-[420px] bg-muted animate-pulse rounded-2xl border border-border" />
            ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card rounded-3xl border-2 border-dashed border-border text-center px-6">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary animate-bounce">
               <Smartphone className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-bold">No Active Devices</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">Connect your first WhatsApp device to start using AI auto-replies and CS management tools.</p>
            <button 
                onClick={() => setShowAddModal(true)}
                className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-105 transition-transform"
            >
                Connect New Device
            </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {devices.map((device) => (
            <div key={device.id} className="group flex flex-col bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all duration-300">
               {/* Card Header Status */}
               <div className={clsx(
                   "px-6 py-3 flex items-center justify-between transition-colors",
                   device.status === 'connected' ? "bg-emerald-500/5" : "bg-destructive/5"
               )}>
                  <div className="flex items-center gap-2">
                     <div className={clsx(
                         "w-2 h-2 rounded-full animate-pulse",
                         device.status === 'connected' ? "bg-emerald-500" : "bg-destructive"
                     )} />
                     <span className={clsx(
                         "text-[10px] uppercase font-black tracking-widest",
                         device.status === 'connected' ? "text-emerald-600" : "text-destructive"
                     )}>{device.status}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                     <Clock className="w-3 h-3" />
                     {formatDate(device.lastConnection)}
                  </div>
               </div>

               <div className="p-6 space-y-5 flex-1">
                  {/* Identity */}
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                           <Smartphone className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                           <h3 className="font-bold text-xl truncate tracking-tight">{(device.alias || device.sessionId || "").split("@")[0]}</h3>
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Phone className="w-3.5 h-3.5" />
                              <span className="truncate">{(device.phoneNumber || "").split("@")[0] || "No phone linked"}</span>
                           </div>
                        </div>
                     </div>
                     <button 
                        onClick={() => handleRefreshStatus(device.id)}
                        className="p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                        title="Refresh Status"
                     >
                        <RefreshCw className="w-5 h-5" />
                     </button>
                  </div>

                  {/* API Key Section */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" /> Device API Key
                     </label>
                     <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl border border-border group/key transition-colors">
                        <code className="text-[11px] font-mono text-foreground/80 flex-1 truncate">{device.apiKey}</code>
                        <button 
                           onClick={() => handleCopyApiKey(device.apiKey, device.id)}
                           className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        >
                           {copiedId === device.id ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                     </div>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-4 py-2">
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Created On</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium">
                           <Calendar className="w-3 h-3 opacity-50" />
                           {formatDate(device.createdAt)}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Ownership</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                           <User className="w-3 h-3 opacity-50" />
                           {user?.name}
                        </div>
                     </div>
                  </div>

                  {/* Actions Row 1 */}
                  <div className="flex gap-2">
                     <Link 
                        to={`/devices/${device.id}/ai-settings`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl transition-all font-bold text-sm"
                     >
                        <Brain className="w-4 h-4" /> AI Settings
                     </Link>
                     <Link 
                        to={`/devices/${device.id}/chats`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                     >
                        <MessageSquare className="w-4 h-4" /> Chats
                     </Link>
                  </div>

                  {/* Actions Row 2 */}
                  <div className="flex gap-2">
                     <button 
                        onClick={() => handleReconnect(device.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                     >
                        <Zap className="w-4 h-4" /> Reconnect
                     </button>
                     <button 
                        onClick={() => handleLogout(device.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                     >
                        <LogOut className="w-4 h-4" /> Logout
                     </button>
                  </div>

                  {/* Delete Button */}
                  <button 
                     onClick={() => handleDelete(device.id)}
                     className="w-full flex items-center justify-center gap-2 py-2 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-all font-bold text-xs"
                  >
                     <Trash2 className="w-3.5 h-3.5" /> Delete Device
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground rounded-[2rem] shadow-2xl border border-border w-full max-w-md overflow-hidden zoom-in-95 duration-200 animate-in">
            <div className="px-8 py-6 border-b border-border flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">New Connection</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Authorize a new phone session</p>
              </div>
              <button 
                onClick={() => {
                    setShowAddModal(false);
                    setQrCode(null);
                    setNewSessionId("");
                }} 
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-8">
               {!qrCode ? (
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Device Alias</label>
                        <div className="relative">
                            <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                            <input 
                               type="text" 
                               value={newSessionId}
                               onChange={(e) => setNewSessionId(e.target.value)}
                               className="w-full pl-12 pr-4 py-3.5 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-medium"
                               placeholder="e.g. Sales iPhone 15"
                            />
                        </div>
                     </div>
                     <button 
                        onClick={handleCreateSession}
                        disabled={!newSessionId || connectionStatus === 'connecting'}
                        className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg shadow-primary/30"
                     >
                        {connectionStatus === 'connecting' ? <RefreshCw className="w-5 h-5 animate-spin mr-2"/> : <Zap className="w-5 h-5 mr-2" />}
                        Generate Connection QR
                     </button>
                  </div>
               ) : (
                  <div className="flex flex-col items-center">
                     <div className="bg-white p-6 rounded-3xl border border-border shadow-xl mb-8 relative group">
                        <img src={qrCode} alt="WhatsApp QR" className="w-60 h-60" />
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                     </div>
                     <div className="text-center space-y-2 mb-8">
                        <p className="font-bold text-lg">Scan with WhatsApp</p>
                        <p className="text-sm text-muted-foreground max-w-[240px]">Go to Linked Devices on your phone and scan this code.</p>
                     </div>
                     <button 
                        onClick={() => {
                            setQrCode(null);
                            setShowAddModal(false);
                            fetchDevices();
                        }}
                        className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-bold transition-all"
                     >
                        Close & Refresh List
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

