import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "../context/LanguageContext";
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
  MessageSquare,
  Package as Inventory,
  Archive,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

export default function Devices() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSessionId, setNewSessionId] = useState("");
  const [qrCode, setQrCode] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [copiedId, setCopiedId] = useState(null);
  
  // WABA State - Disabled for now (Coming Soon)
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);

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
    if (!confirm("Are you sure you want to delete this device? This will PERMANENTLY delete all chat history. Consider archiving instead.")) return;
    try {
      await axios.delete(`/api/whatsapp/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      fetchDevices();
    } catch (e) {
      console.error(e);
      alert("Failed to delete device");
    }
  };

  const handleArchive = async (deviceId, deviceAlias) => {
    const reason = prompt(`Archive device "${deviceAlias}"?\n\nThis preserves all chat history for future restoration.\n\nReason (optional): blocked, switched_number, inactive, manual`, "manual");
    if (reason === null) return; // User cancelled
    
    try {
      await axios.post(`/api/whatsapp/devices/${deviceId}/archive`, 
        { reason: reason || 'manual' },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      alert("Device archived successfully! You can restore chat history from the Chat History page.");
      fetchDevices();
    } catch (e) {
      console.error(e);
      alert("Failed to archive device: " + (e.response?.data?.error || e.message));
    }
  };

  const handleLogout = async (deviceId) => {
    try {
        await axios.post(`/api/whatsapp/devices/${deviceId}/logout`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        fetchDevices();
    } catch (e) {
        console.error(e);
        alert("Logout failed");
    }
  };

  const handleReconnect = async (deviceId) => {
    try {
        const res = await axios.post(`/api/whatsapp/devices/${deviceId}/login`, {}, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.data.qr) {
            setQrCode(res.data.qr);
            setShowAddModal(true);
        } else {
            fetchDevices();
        }
    } catch (e) {
        console.error(e);
        alert("Reconnect failed");
    }
  };

  const handleRefreshStatus = async (deviceId) => {
     try {
         await axios.get(`/api/whatsapp/devices/${deviceId}`, {
             headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
         });
         fetchDevices();
     } catch (e) {
         console.error(e);
     }
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
        const payload = {
            alias: newSessionId,
            userId: user.id,
            provider: "baileys", // Always baileys for now
        };

        const res = await axios.post(`/api/whatsapp/devices`, payload, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        
        const qr = res.data.qr;
        
        if (qr) {
            setQrCode(qr);
        } else {
            // If no QR returned, close modal and refresh
            setShowAddModal(false);
            fetchDevices();
        }
        
    } catch (err) {
        console.error(err);
        setConnectionStatus("error");
        alert("Failed to create session: " + (err.response?.data?.error || err.message));
    } finally {
        setConnectionStatus("idle");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return t('messages.noData');
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
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground">{t('devices.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('devices.subtitle')}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm min-w-[320px]">
           <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center text-sm font-bold">
                 <span className="flex items-center gap-1.5"><Smartphone className="w-4 h-4 text-primary" /> {t('devices.usage') || 'Usage'}</span>
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
                  <Plus className="w-4 h-4" /> {t('devices.addDevice')}
               </button>
               <button className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground border border-border rounded-xl hover:bg-accent transition-all font-bold text-sm">
                  <Crown className="w-4 h-4 text-amber-500" /> {t('devices.getMore') || 'Get More'}
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
            <h2 className="text-2xl font-bold">{t('devices.noDevices')}</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">{t('devices.getStarted')}</p>
            <button 
                onClick={() => setShowAddModal(true)}
                className="mt-8 px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-105 transition-transform"
            >
                {t('devices.connectNew') || 'Connect New Device'}
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
                  <div className="flex items-center gap-2">
                     {device.provider === 'waba' && (
                        <span className="text-[10px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md uppercase tracking-wide border border-blue-500/20">Official API</span>
                     )}
                     <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        {formatDate(device.lastConnection)}
                     </div>
                  </div>
               </div>

               <div className="p-6 space-y-5 flex-1">
                  {/* Identity */}
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-4">
                        <div className={clsx(
                            "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform",
                            device.provider === 'waba' ? "bg-gradient-to-br from-blue-500 to-indigo-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"
                        )}>
                           <Smartphone className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                           <h3 className="font-bold text-xl truncate tracking-tight">{(device.alias || device.sessionId || "").split("@")[0]}</h3>
                           <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                              <Phone className="w-3.5 h-3.5" />
                              <span className="truncate">{(device.phoneNumber || "").split("@")[0] || t('devices.noPhone') || "No phone linked"}</span>
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
                        <ShieldCheck className="w-3.5 h-3.5" /> {t('devices.apiKey') || 'Device API Key'}
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
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('devices.createdOn') || 'Created On'}</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium">
                           <Calendar className="w-3 h-3 opacity-50" />
                           {formatDate(device.createdAt)}
                        </div>
                     </div>
                     <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t('devices.ownership') || 'Ownership'}</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-medium truncate">
                           <User className="w-3 h-3 opacity-50" />
                           {user?.name}
                        </div>
                     </div>
                  </div>

                  {/* Actions Row 1 */}
                  <div className="flex gap-2">
                     <Link 
                        to={`/app/devices/${device.id}/ai-settings`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-2xl transition-all font-bold text-sm"
                     >
                        <Brain className="w-4 h-4" /> {t('devices.aiSettings')}
                     </Link>
                     <Link 
                        to={`/app/devices/${device.id}/chats`}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                     >
                        <MessageSquare className="w-4 h-4" /> {t('devices.chats')}
                     </Link>
                  </div>
                  
                  {/* Actions Row 1.5 - Product Catalog */}
                  <div className="flex gap-2">
                     <Link 
                        to={`/app/devices/${device.id}/products`}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                     >
                        <Inventory className="w-4 h-4" /> Product Catalog (AI)
                     </Link>
                  </div>

                  {/* Actions Row 2 */}
                  <div className="flex gap-2">
                     {device.provider !== 'waba' && (
                         <button 
                            onClick={() => handleReconnect(device.id)}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                         >
                            <Zap className="w-4 h-4" /> {t('devices.reconnect')}
                         </button>
                     )}
                     <button 
                        onClick={() => handleLogout(device.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white rounded-2xl transition-all font-bold text-sm"
                     >
                        <LogOut className="w-4 h-4" /> {t('nav.logout')}
                     </button>
                  </div>

                   {/* Archive & Delete Buttons */}
                   <div className="flex gap-2">
                      <button 
                         onClick={() => handleArchive(device.id, device.alias)}
                         className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white rounded-xl transition-all font-bold text-xs"
                         title="Archive device - preserves chat history for restoration"
                      >
                         <Archive className="w-3.5 h-3.5" /> {t('devices.archive') || 'Archive'}
                      </button>
                      <button 
                         onClick={() => handleDelete(device.id)}
                         className="flex-1 flex items-center justify-center gap-2 py-2 bg-destructive/5 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-xl transition-all font-bold text-xs"
                         title="Permanently delete device and all data"
                      >
                         <Trash2 className="w-3.5 h-3.5" /> {t('devices.deleteDevice') || 'Delete'}
                      </button>
                   </div>
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
                <h3 className="text-xl font-bold">{t('devices.newConnection') || 'New Connection'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('devices.authorizePhone') || 'Authorize a new phone session'}</p>
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
                     
                     {/* Provider Tabs */}
                     <div className="bg-muted/50 p-1 rounded-xl flex gap-1">
                        <button
                            className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all bg-white text-primary shadow-sm"
                        >
                            Scan QR (Unofficial)
                        </button>
                        <button
                            onClick={() => setShowComingSoonModal(true)}
                            className="flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all hover:text-foreground text-muted-foreground"
                        >
                            Official API
                        </button>
                     </div>

                     <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">{t('devices.deviceAlias') || 'Device Alias'}</label>
                        <div className="relative">
                            <Smartphone className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                            <input 
                               type="text" 
                               value={newSessionId}
                               onChange={(e) => setNewSessionId(e.target.value)}
                               className="w-full pl-12 pr-4 py-3.5 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-medium"
                               placeholder={t("devices.aliasPlaceholder") || "e.g. Sales iPhone 15"}
                            />
                        </div>
                     </div>

                     <button 
                        onClick={handleCreateSession}
                        disabled={!newSessionId || connectionStatus === 'connecting'}
                        className="w-full py-4 rounded-2xl font-bold disabled:opacity-50 transition-all flex items-center justify-center shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/30"
                     >
                        {connectionStatus === 'connecting' ? <RefreshCw className="w-5 h-5 animate-spin mr-2"/> : <Zap className="w-5 h-5 mr-2" />}
                        {t('devices.generateQR') || 'Generate Connection QR'}
                     </button>
                  </div>
               ) : (
                  <div className="flex flex-col items-center">
                     <div className="bg-white p-6 rounded-3xl border border-border shadow-xl mb-8 relative group">
                        <QRCodeSVG value={qrCode} size={240} level="M" />
                        <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                     </div>
                     <div className="text-center space-y-2 mb-8">
                        <p className="font-bold text-lg">{t('devices.scanWithPhone')}</p>
                        <p className="text-sm text-muted-foreground max-w-[240px]">{t('devices.scanInstructions')}</p>
                     </div>
                     <button 
                        onClick={() => {
                            setQrCode(null);
                            setShowAddModal(false);
                            fetchDevices();
                        }}
                        className="w-full py-4 bg-muted hover:bg-muted/80 text-foreground rounded-2xl font-bold transition-all"
                     >
                        {t('devices.closeRefresh') || 'Close & Refresh List'}
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Coming Soon Modal for Official API */}
      {showComingSoonModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
          <div className="bg-card text-card-foreground rounded-[2rem] shadow-2xl border border-border w-full max-w-sm overflow-hidden zoom-in-95 duration-200 animate-in p-8 text-center">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold mb-2">{t('devices.comingSoon') || 'Coming Soon'}</h3>
            <p className="text-muted-foreground mb-6">
              {t('devices.comingSoonDesc') || 'Official WhatsApp Business API integration is under development. Stay tuned for updates!'}
            </p>
            <button 
              onClick={() => setShowComingSoonModal(false)}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all"
            >
              {t('modal.ok') || 'Got it!'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

