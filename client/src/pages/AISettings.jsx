import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { 
  Brain, 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  MessageSquare, 
  Bot, 
  Zap, 
  Shield, 
  Clock, 
  Briefcase, 
  Info,
  Monitor,
  Play,
  XCircle,
  Plus,
  Trash2,
  Globe,
  Goal,
  UserCheck,
  Calendar,
  Lock,
  CheckCircle2,
  Settings,
  Cpu,
  ChevronDown,
  ShoppingBag,
  Tag,
  DollarSign,
  Image,
  Upload,
  X,
  Loader2,
  Edit,
  Building2,
  MapPin,
  Package
} from "lucide-react";
import clsx from "clsx";
import { useModal } from "../context/ModalContext";

export default function AISettings() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useModal();
  const [device, setDevice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState("engine");
  const [providers, setProviders] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [productForm, setProductForm] = useState({ name: "", price: "", currency: "IDR", description: "", inStock: true, images: [] });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [deviceRes, settingsRes, providersRes] = await Promise.all([
        axios.get(`/api/whatsapp/devices/${deviceId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
        axios.get(`/api/whatsapp/devices/${deviceId}/settings/ai`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
        axios.get(`/api/whatsapp/ai/providers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
      ]);
      setDevice(deviceRes.data.device);
      
      // Filter providers to only show OpenAI and Google AI
      const allProviders = providersRes.data.providers || providersRes.data;
      const filteredProviders = allProviders.filter(p => ['openai', 'google'].includes(p.id));
      setProviders(filteredProviders);
      
      // Ensure defaults for new fields if null or missing structure
      const data = settingsRes.data;
      if (!data.aiBusinessFAQ || !data.aiBusinessFAQ.items) {
        data.aiBusinessFAQ = { items: data.aiBusinessFAQ?.items || [] };
      }
      if (!data.aiProductCatalog || !data.aiProductCatalog.items) {
        data.aiProductCatalog = { items: data.aiProductCatalog?.items || [] };
      }
      if (!data.aiOperatingHours || !data.aiOperatingHours.schedule) {
        data.aiOperatingHours = { 
          enabled: data.aiOperatingHours?.enabled || false, 
          schedule: data.aiOperatingHours?.schedule || {
            monday: { open: "09:00", close: "17:00" },
            tuesday: { open: "09:00", close: "17:00" },
            wednesday: { open: "09:00", close: "17:00" },
            thursday: { open: "09:00", close: "17:00" },
            friday: { open: "09:00", close: "17:00" },
            saturday: { open: "09:00", close: "12:00" },
            sunday: { open: "00:00", close: "00:00" }
          }
        };
      }
      if (!data.aiHandoverTriggers) data.aiHandoverTriggers = ["agent", "admin", "human"];
      if (!data.aiBusinessProfile) data.aiBusinessProfile = { name: "", category: "", logo: "", description: "" };
      if (!data.aiBusinessAddress) data.aiBusinessAddress = { street: "", city: "", state: "", zip: "", country: "" };

      // Map current provider/model from _systemDefaults to root if not present (for editing)
      if (!data.aiProvider) data.aiProvider = data._systemDefaults?.provider || "openai";
      if (!data.aiModel) data.aiModel = data._systemDefaults?.model || "gpt-3.5-turbo";
      
      // Migrate product catalog items to use images array
      if (Array.isArray(data.aiProductCatalog.items)) {
        data.aiProductCatalog.items = data.aiProductCatalog.items.map(item => {
          if (!item) return { name: "", price: "0", images: [] };
          if (item.imageUrl && (!item.images || item.images.length === 0)) {
            return { ...item, images: [item.imageUrl] };
          }
          if (!item.images) return { ...item, images: [] };
          return item;
        });
      }
      
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch AI settings", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [deviceId]);

  const handleSave = async (updatedSettings = null) => {
    // If updatedSettings is an event object, ignore it and use current state settings
    const settingsToSave = (updatedSettings && (updatedSettings.nativeEvent || updatedSettings.target)) 
        ? settings 
        : (updatedSettings || settings);
    try {
      setSaving(true);
      const dataToSave = {
          ...settingsToSave,
          aiTriggers: typeof settingsToSave.aiTriggers === 'string' 
              ? settingsToSave.aiTriggers.split(',').map(t => t.trim()).filter(t => t)
              : settingsToSave.aiTriggers,
          aiHandoverTriggers: typeof settingsToSave.aiHandoverTriggers === 'string' 
              ? settingsToSave.aiHandoverTriggers.split(',').map(t => t.trim()).filter(t => t)
              : settingsToSave.aiHandoverTriggers
      };
      
      console.log("Saving AI Settings to backend:", dataToSave);
      
      await axios.put(`/api/whatsapp/devices/${deviceId}/settings/ai`, dataToSave, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      
      if (!updatedSettings) {
        await showAlert({ title: "Success", message: "AI Business Settings updated successfully", type: "success" });
      }
      
      await fetchSettings(); // Refresh to update everything from source of truth
    } catch (error) {
      console.error("Failed to save AI settings:", error);
      await showAlert({ title: "Error", message: "Failed to save AI settings: " + (error.response?.data?.error || error.message), type: "danger" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestAI = async () => {
    if (!testMessage.trim()) return;
    try {
      setTesting(true);
      const res = await axios.post(`/api/whatsapp/test-ai`, {
        deviceId,
        message: testMessage
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setTestResponse(res.data.response || res.data.message);
    } catch (error) {
      setTestResponse("Error: " + (error.response?.data?.error || error.message));
    } finally {
      setTesting(false);
    }
  };

  const addFAQ = () => {
    const updated = { ...settings };
    if (!updated.aiBusinessFAQ) updated.aiBusinessFAQ = { items: [] };
    updated.aiBusinessFAQ.items.push({ question: "", answer: "" });
    setSettings(updated);
  };

  const openProductModal = (index = null) => {
    if (index !== null) {
      // Edit existing product
      setEditingProductIndex(index);
      const product = settings.aiProductCatalog.items[index];
      setProductForm({ 
        ...product, 
        currency: product.currency || "IDR",
        images: product.images || (product.imageUrl ? [product.imageUrl] : [])
      });
    } else {
      // Add new product
      setEditingProductIndex(null);
      setProductForm({ name: "", price: "", currency: "IDR", description: "", inStock: true, images: [] });
    }
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProductIndex(null);
    setProductForm({ name: "", price: "", currency: "IDR", description: "", inStock: true, images: [] });
  };

  const handleProductImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploadingImage(true);
      
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", device.userId);
        formData.append("isPublic", "true");

        const res = await axios.post("/api/whatsapp/files/upload", formData, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        });
        return res.data.url;
      });

      const urls = await Promise.all(uploadPromises);

      setProductForm(prev => ({ 
        ...prev, 
        images: [...(prev.images || []), ...urls] 
      }));
      console.log('Product image bulk upload success, URLs:', urls);
    } catch (error) {
      console.error("Image upload failed:", error);
      await showAlert({ title: "Error", message: "Failed to upload image: " + (error.response?.data?.error || error.message), type: "danger" });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProductImage = (index) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleBusinessLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", device.userId);
      formData.append("isPublic", "true");

      const res = await axios.post("/api/whatsapp/files/upload", formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setSettings(prev => ({ 
        ...prev, 
        aiBusinessProfile: {
          ...prev.aiBusinessProfile,
          logo: res.data.url
        } 
      }));
      console.log('Business logo upload success, URL:', res.data.url);
    } catch (error) {
      console.error("Logo upload failed:", error);
      await showAlert({ title: "Error", message: "Failed to upload logo: " + (error.response?.data?.error || error.message), type: "danger" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveProduct = async () => {
    const items = [...(settings.aiProductCatalog?.items || [])];
    if (editingProductIndex !== null) {
      items[editingProductIndex] = { ...productForm };
    } else {
      items.push({ ...productForm });
    }
    
    const updatedSettings = {
      ...settings,
      aiProductCatalog: { ...settings.aiProductCatalog, items }
    };

    // Update locally first for immediate UI feedback
    setSettings(updatedSettings);
    
    // Then save to backend
    await handleSave(updatedSettings);
    
    closeProductModal();
  };

  const removeProduct = async (index) => {
    const items = [...(settings.aiProductCatalog?.items || [])];
    items.splice(index, 1);
    
    const updatedSettings = {
      ...settings,
      aiProductCatalog: { ...settings.aiProductCatalog, items }
    };
    
    setSettings(updatedSettings);
    await handleSave(updatedSettings);
  };

  const formatCurrency = (amount, currency = "IDR") => {
    const num = parseFloat(amount) || 0;
    const currencyConfig = {
      IDR: { locale: "id-ID", symbol: "Rp", decimals: 0 },
      MYR: { locale: "ms-MY", symbol: "RM", decimals: 2 },
      USD: { locale: "en-US", symbol: "$", decimals: 2 }
    };
    const config = currencyConfig[currency] || currencyConfig.IDR;
    return `${config.symbol} ${num.toLocaleString(config.locale, { minimumFractionDigits: config.decimals, maximumFractionDigits: config.decimals })}`;
  };

  const removeFAQ = (index) => {
    const updated = { ...settings };
    updated.aiBusinessFAQ.items.splice(index, 1);
    setSettings(updated);
  };

  const updateFAQ = (index, field, value) => {
    const updated = { ...settings };
    updated.aiBusinessFAQ.items[index][field] = value;
    setSettings(updated);
  };

  const updateSchedule = (day, field, value) => {
    const updated = { ...settings };
    updated.aiOperatingHours.schedule[day][field] = value;
    setSettings(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!settings) return <div className="p-8 text-center">Settings not found. Please ensure the device is connected.</div>;

  const systemDefaults = settings._systemDefaults || {};
  const currentProvider = providers.find(p => p.id === settings.aiProvider);
  const availableModels = currentProvider?.models || [];

  const TABS = [
    { id: "engine", label: "Brain & Engine", icon: Cpu },
    { id: "personality", label: "Personality", icon: Bot },
    { id: "knowledge", label: "Knowledge Base", icon: Building2 },
    { id: "safety", label: "Safety & Hours", icon: Shield },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="flex items-center gap-4">
          <Link 
            to="/devices" 
            className="p-3 bg-card hover:bg-muted text-foreground rounded-2xl transition-all border border-border shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Business AI Engine</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight">{device?.alias || "AI Agent"}</h1>
            <p className="text-sm text-muted-foreground">Expertly tuned for <span className="text-foreground font-bold">{device?.phoneNumber || "unknown number"}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setShowTestModal(true)}
                className="px-6 py-3 bg-muted hover:bg-accent text-foreground rounded-2xl font-bold transition-all border border-border flex items-center gap-2"
            >
                <Play className="w-4 h-4 text-primary fill-current" /> Test Agent
            </button>
            <button 
                onClick={() => handleSave()}
                disabled={saving}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black hover:bg-primary/90 transition-all flex items-center gap-2 shadow-xl shadow-primary/20"
            >
                {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Save Engine
            </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                    "flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap",
                    activeTab === tab.id 
                        ? "bg-card text-foreground shadow-md border border-border scale-105" 
                        : "text-muted-foreground hover:bg-muted"
                )}
              >
                <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
                {tab.label}
              </button>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* TAB: BRAIN & ENGINE */}
          {activeTab === "engine" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
               <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                     <h2 className="text-lg font-black flex items-center gap-2"><Cpu className="w-4 h-4 text-indigo-500"/> Core Intelligence</h2>
                     <div className="flex gap-4">
                        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-2xl border border-border">
                           <span className="text-xs font-black uppercase tracking-widest opacity-60 text-emerald-600">AI Status</span>
                           <button 
                              onClick={() => setSettings({...settings, aiEnabled: !settings.aiEnabled})}
                              className={clsx("w-12 h-6 rounded-full transition-all relative", settings.aiEnabled ? "bg-primary" : "bg-muted")}
                           >
                              <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", settings.aiEnabled ? "left-7" : "left-1")} />
                           </button>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-2xl border border-border">
                           <span className="text-xs font-black uppercase tracking-widest opacity-60">Auto Reply</span>
                           <button 
                              onClick={() => setSettings({...settings, aiAutoReply: !settings.aiAutoReply})}
                              className={clsx("w-12 h-6 rounded-full transition-all relative", settings.aiAutoReply ? "bg-emerald-500" : "bg-muted")}
                           >
                              <div className={clsx("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", settings.aiAutoReply ? "left-7" : "left-1")} />
                           </button>
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center justify-between">
                           AI PROVIDER 
                           {!currentProvider?.apiKeyConfigured && <span className="text-[10px] text-destructive">API Key Missing</span>}
                        </label>
                        <div className="relative group">
                           <select 
                              value={settings.aiProvider || "openai"}
                              onChange={e => {
                                 const p = providers.find(x => x.id === e.target.value);
                                 setSettings({
                                    ...settings, 
                                    aiProvider: e.target.value,
                                    aiModel: p?.models?.[0]?.id || ""
                                 });
                              }}
                              className="w-full pl-6 pr-12 py-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                           >
                              {providers.map(p => (
                                 <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                           </select>
                           <ChevronDown className="absolute right-5 top-5 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">INTELLIGENCE MODEL</label>
                        <div className="relative group">
                           <select 
                              value={settings.aiModel || ""}
                              onChange={e => setSettings({...settings, aiModel: e.target.value})}
                              className="w-full pl-6 pr-12 py-4 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                           >
                              {availableModels.map(m => (
                                 <option key={m.id} value={m.id}>
                                    {m.name} {m.recommended ? "(Recommended)" : ""}
                                 </option>
                              ))}
                           </select>
                           <ChevronDown className="absolute right-5 top-5 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Agent Identity Name</label>
                        <input 
                           type="text" 
                           value={settings.aiBotName || ""}
                           onChange={e => setSettings({...settings, aiBotName: e.target.value})}
                           className="w-full px-6 py-4 bg-muted/20 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold"
                           placeholder="e.g. Sales Specialist"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Primary Interaction Language</label>
                        <select 
                           value={settings.aiLanguage || "id"}
                           onChange={e => setSettings({...settings, aiLanguage: e.target.value})}
                           className="w-full px-6 py-4 bg-muted/20 border border-border rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                        >
                           <option value="id">Bahasa Indonesia (Native Focus)</option>
                           <option value="ms">Bahasa Malaysia (Localized)</option>
                           <option value="en">English (Professional Universal)</option>
                        </select>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* TAB: PERSONALITY & VIBE */}
          {activeTab === "personality" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 border-b border-border pb-6">
                     <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                        <Brain className="w-5 h-5" />
                     </div>
                     <div>
                        <h2 className="text-lg font-black">Agent Personality</h2>
                        <p className="text-xs text-muted-foreground">Define how your agent should sound and act</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                           <Bot className="w-3.5 h-3.5 text-primary" /> Brand Voice
                        </label>
                        <select 
                           value={settings.aiBrandVoice || "casual"}
                           onChange={e => setSettings({...settings, aiBrandVoice: e.target.value})}
                           className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold capitalize cursor-pointer"
                        >
                           <option value="casual">Casual & Friendly</option>
                           <option value="formal">Formal & Professional</option>
                           <option value="expert">Expert & Technical</option>
                           <option value="luxury">Luxury & Premium</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                           <Goal className="w-3.5 h-3.5 text-emerald-500" /> Interaction Goal
                        </label>
                        <select 
                           value={settings.aiPrimaryGoal || "conversion"}
                           onChange={e => setSettings({...settings, aiPrimaryGoal: e.target.value})}
                           className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold cursor-pointer"
                        >
                           <option value="conversion">Sales & Conversion</option>
                           <option value="leads">Lead Collection</option>
                           <option value="support">Customer Support</option>
                        </select>
                     </div>
                  </div>

                  <div className="space-y-4 pt-4">
                     <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-primary" /> Core Instructions
                     </label>
                     <textarea 
                        value={settings.aiPromptTemplate || ""}
                        onChange={e => setSettings({...settings, aiPromptTemplate: e.target.value})}
                        className="w-full h-64 px-6 py-4 bg-muted/20 border border-border rounded-3xl focus:ring-2 focus:ring-primary outline-none transition-all font-medium resize-none leading-relaxed"
                        placeholder="e.g. You are a helpful sales agent for IndoSofthouse..."
                     />
                  </div>
               </div>
            </div>
          )}

          {/* TAB: KNOWLEDGE BASE */}
          {activeTab === "knowledge" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Profile */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                   <div className="flex items-center gap-3 border-b border-border pb-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                         <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                         <h2 className="text-lg font-black">Business Identity</h2>
                         <p className="text-xs text-muted-foreground">Who are you representing?</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-1 space-y-2">
                         <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Logo</label>
                         <div className="relative group aspect-square border-2 border-dashed border-border rounded-2xl overflow-hidden hover:border-primary transition-all flex flex-col items-center justify-center bg-muted/20">
                            {settings.aiBusinessProfile?.logo ? (
                               <img src={settings.aiBusinessProfile.logo} className="w-full h-full object-contain p-4" alt="Logo" />
                            ) : (
                               <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
                                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                  <input type="file" className="hidden" accept="image/*" onChange={handleBusinessLogoUpload} />
                                  <span className="text-[10px] font-black uppercase tracking-tighter">Upload</span>
                               </label>
                            )}
                         </div>
                      </div>
                      <div className="md:col-span-3 space-y-4">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input 
                               value={settings.aiBusinessProfile?.name || ""}
                               onChange={e => setSettings({...settings, aiBusinessProfile: {...settings.aiBusinessProfile, name: e.target.value}})}
                               className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-sm"
                               placeholder="Business Name"
                            />
                            <input 
                               value={settings.aiBusinessProfile?.category || ""}
                               onChange={e => setSettings({...settings, aiBusinessProfile: {...settings.aiBusinessProfile, category: e.target.value}})}
                               className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-sm"
                               placeholder="Category"
                            />
                         </div>
                         <textarea 
                            value={typeof settings.productKnowledge === 'object' ? (settings.productKnowledge.otherDescription || "") : (settings.productKnowledge || "")}
                            onChange={e => {
                               const val = e.target.value;
                               setSettings(prev => ({
                                  ...prev,
                                  productKnowledge: typeof prev.productKnowledge === 'object' 
                                     ? { ...prev.productKnowledge, otherDescription: val }
                                     : { items: [], otherDescription: val }
                               }));
                            }}
                            className="w-full h-24 px-4 py-3 bg-muted/20 border border-border rounded-xl outline-none resize-none text-sm font-medium"
                            placeholder="About Us / General Knowledge..."
                         />
                      </div>
                   </div>
                </div>

                {/* Business Address */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
                   <div className="flex items-center gap-3 border-b border-border pb-4">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                         <MapPin className="w-5 h-5" />
                      </div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Physical Presence</h2>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 space-y-2">
                         <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Street Address</label>
                         <input 
                            value={settings.aiBusinessAddress?.street || ""}
                            onChange={e => setSettings({...settings, aiBusinessAddress: {...settings.aiBusinessAddress, street: e.target.value}})}
                            className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-sm"
                            placeholder="123 Business Avenue"
                         />
                      </div>
                      <input 
                         value={settings.aiBusinessAddress?.city || ""}
                         onChange={e => setSettings({...settings, aiBusinessAddress: {...settings.aiBusinessAddress, city: e.target.value}})}
                         className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-sm"
                         placeholder="City"
                      />
                      <div className="grid grid-cols-2 gap-4">
                         <input 
                            value={settings.aiBusinessAddress?.zip || ""}
                            onChange={e => setSettings({...settings, aiBusinessAddress: {...settings.aiBusinessAddress, zip: e.target.value}})}
                            className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-sm font-mono"
                            placeholder="Zip"
                         />
                         <input 
                            value={settings.aiBusinessAddress?.country || ""}
                            onChange={e => setSettings({...settings, aiBusinessAddress: {...settings.aiBusinessAddress, country: e.target.value}})}
                            className="w-full px-4 py-3 bg-muted/20 border border-border rounded-xl font-bold text-sm"
                            placeholder="Country"
                         />
                      </div>
                   </div>
                </div>

                {/* Catalog */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         <ShoppingBag className="w-4 h-4 text-primary" /> Product Catalog
                      </h3>
                      <button onClick={() => openProductModal()} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-[10px] uppercase">
                         Add Product
                      </button>
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {settings.aiProductCatalog?.items.map((prod, i) => (
                         <div key={i} className="group bg-muted/10 border border-border rounded-xl overflow-hidden shadow-sm flex flex-col">
                            <div className="relative h-28 bg-muted/30">
                               <img src={prod.images?.[0] || prod.imageUrl} className="w-full h-full object-cover" />
                               <div className="absolute top-2 right-2 flex gap-1 transform translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all">
                                  <button onClick={() => openProductModal(i)} className="p-1.5 bg-card rounded shadow-md text-foreground hover:text-primary"><Edit className="w-3 h-3"/></button>
                                  <button onClick={() => removeProduct(i)} className="p-1.5 bg-card rounded shadow-md text-destructive"><Trash2 className="w-3 h-3"/></button>
                               </div>
                            </div>
                            <div className="p-3">
                               <h4 className="font-bold text-xs truncate mb-1">{prod.name}</h4>
                               <p className="text-[10px] font-black text-primary">{formatCurrency(prod.price, prod.currency)}</p>
                            </div>
                         </div>
                      ))}
                      {settings.aiProductCatalog?.items.length === 0 && (
                         <div className="col-span-full py-8 border-2 border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                            No products in catalog.
                         </div>
                      )}
                   </div>
                </div>

                {/* FAQ */}
                <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                   <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                         <Info className="w-4 h-4 text-amber-500" /> Business FAQ
                      </h3>
                      <button onClick={addFAQ} className="px-3 py-1.5 bg-primary text-white rounded-lg font-bold text-[10px] uppercase">
                         Add Item
                      </button>
                   </div>
                   <div className="space-y-3">
                      {settings.aiBusinessFAQ?.items.map((faq, i) => (
                         <div key={i} className="p-4 bg-muted/30 border border-border rounded-xl relative group">
                            <button onClick={() => removeFAQ(i)} className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                               <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <input value={faq.question} onChange={e => updateFAQ(i, 'question', e.target.value)} className="w-full bg-transparent font-bold text-xs mb-2 outline-none border-b border-border/50 pb-1" placeholder="Question?" />
                            <textarea value={faq.answer} onChange={e => updateFAQ(i, 'answer', e.target.value)} className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none h-12" placeholder="Answer..." />
                         </div>
                      ))}
                   </div>
                </div>
            </div>
          )}

          {/* TAB: SAFETY & HOURS */}
          {activeTab === "safety" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
               <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <Shield className="w-6 h-6 text-red-500" />
                         <h2 className="text-lg font-black">Safety Guardrails</h2>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-2xl border border-border">
                          <span className="text-[10px] font-black uppercase opacity-60">Strict Boundaries</span>
                          <button 
                               onClick={() => setSettings({...settings, aiBoundariesEnabled: !settings.aiBoundariesEnabled})}
                               className={clsx("w-10 h-5 rounded-full relative transition-all", settings.aiBoundariesEnabled ? "bg-primary" : "bg-muted")}
                          >
                             <div className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", settings.aiBoundariesEnabled ? "left-5.5" : "left-0.5")} />
                          </button>
                      </div>
                  </div>

                  <div className="space-y-4">
                     <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Human Handover Triggers</label>
                     <p className="text-[11px] text-muted-foreground">Keywords that signal an agent is needed (e.g. boss, human, talk)</p>
                     <input 
                        value={Array.isArray(settings.aiHandoverTriggers) ? settings.aiHandoverTriggers.join(', ') : settings.aiHandoverTriggers || ""}
                        onChange={e => setSettings({...settings, aiHandoverTriggers: e.target.value})}
                        className="w-full px-5 py-4 bg-muted/20 border border-border rounded-2xl font-bold"
                        placeholder="transfer, talk to human, boss"
                     />
                  </div>

                  <div className="pt-8 border-t border-border/50 space-y-6">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <Calendar className="w-5 h-5 text-primary" />
                           <h3 className="font-bold">Business Operating Hours</h3>
                        </div>
                        <button 
                              onClick={() => setSettings({...settings, aiOperatingHours: { ...settings.aiOperatingHours, enabled: !settings.aiOperatingHours.enabled }})}
                              className={clsx("w-10 h-5 rounded-full relative transition-all", settings.aiOperatingHours?.enabled ? "bg-emerald-500" : "bg-muted")}
                         >
                            <div className={clsx("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", settings.aiOperatingHours?.enabled ? "left-5.5" : "left-0.5")} />
                         </button>
                     </div>

                     {settings.aiOperatingHours?.enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {Object.keys(settings.aiOperatingHours.schedule).map(day => (
                              <div key={day} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl border border-border">
                                 <span className="text-[10px] font-black uppercase w-16">{day}</span>
                                 <div className="flex items-center gap-2">
                                    <input type="time" value={settings.aiOperatingHours.schedule[day].open} onChange={e => updateSchedule(day, 'open', e.target.value)} className="bg-muted px-2 py-1 rounded-lg text-xs" />
                                    <span className="opacity-30">-</span>
                                    <input type="time" value={settings.aiOperatingHours.schedule[day].close} onChange={e => updateSchedule(day, 'close', e.target.value)} className="bg-muted px-2 py-1 rounded-lg text-xs" />
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                     <p className="text-[10px] italic text-muted-foreground">* AI will only trigger responses during these active hours.</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Infobar */}
        <div className="space-y-8">
           <div className="bg-gradient-to-br from-[#1e1a2d] to-[#0f0e1a] rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/30 transition-colors" />
              <div className="flex items-center gap-3 mb-8">
                 <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                    <Zap className="w-6 h-6 text-primary" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg leading-tight">System Status</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Live Sync</p>
                 </div>
              </div>

              <div className="space-y-4">
                 {[
                    { label: "Active Engine", value: currentProvider?.name || "OpenAI" },
                    { label: "Current Model", value: settings.aiModel || "gpt-3.5-turbo" },
                    { label: "Memory", value: settings.conversationMemoryEnabled ? "Enabled" : "Disabled" },
                    { label: "Language", value: settings.aiLanguage?.toUpperCase() || "ID" }
                 ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{item.label}</span>
                       <span className="font-bold text-sm text-primary-foreground">{item.value}</span>
                    </div>
                 ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 px-1">
                 <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Global Opts</span>
                 </div>
                 <p className="text-[11px] leading-relaxed opacity-60 italic">
                    Model selection affects response speed and token usage. Recommended models provide the best balance for WhatsApp business logic.
                 </p>
              </div>
           </div>

           <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
              <h4 className="font-black text-xs uppercase tracking-widest mb-6 opacity-60">Engine Tips</h4>
              <div className="space-y-6">
                 {[
                    { icon: Globe, label: "Switching Engine", text: "Toggle between OpenAI for speed or Google AI for deep reasoning." },
                    { icon: Clock, label: "Context Retention", text: "Allows AI to remember previous messages in the chat for natural flow. Set 'History Depth' to control memory size." },
                    { icon: Lock, label: "Privacy", text: "All data is securely processed via your chosen engine." }
                 ].map((tip, i) => (
                    <div key={i} className="flex gap-4">
                       <tip.icon className="w-5 h-5 text-primary shrink-0" />
                       <div>
                          <p className="text-xs font-black mb-0.5">{tip.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-normal">{tip.text}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Test AI Modal */}
      {showTestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl p-4 animate-in fade-in duration-300">
           <div className="bg-card text-card-foreground rounded-[3rem] shadow-2xl border border-border w-full max-w-xl overflow-hidden animate-in zoom-in-95">
              <div className="px-8 py-8 border-b border-border flex justify-between items-center bg-muted/10">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                       <RefreshCw className={clsx("w-7 h-7", testing && "animate-spin")} />
                    </div>
                    <div>
                       <h3 className="text-xl font-black">Agent Preview</h3>
                       <p className="text-xs text-muted-foreground mt-0.5">Chat with your configured engine</p>
                    </div>
                 </div>
                 <button onClick={() => setShowTestModal(false)} className="p-3 hover:bg-muted rounded-full transition-colors text-muted-foreground">
                    <XCircle className="w-7 h-7" />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Input Preview</label>
                    <textarea 
                       value={testMessage}
                       onChange={e => setTestMessage(e.target.value)}
                       className="w-full h-32 px-6 py-5 bg-muted/20 border border-border rounded-[2rem] focus:ring-2 focus:ring-primary outline-none transition-all font-medium leading-relaxed"
                       placeholder="Send a message to test the AI logic..."
                       autoFocus
                    />
                 </div>

                 {testResponse && (
                    <div className="space-y-2 animate-in slide-in-from-top-4 duration-500">
                       <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Agent says:
                       </label>
                       <div className="p-6 bg-primary/5 border border-primary/20 rounded-[2rem] text-foreground font-medium leading-relaxed relative">
                          {testResponse}
                       </div>
                    </div>
                 )}
                 
                 <div className="flex gap-3">
                    <button 
                       onClick={() => { setTestMessage(""); setTestResponse(null); }}
                       className="px-6 py-4 bg-muted hover:bg-accent rounded-2xl font-bold transition-all"
                    >
                       Reset
                    </button>
                    <button 
                       onClick={handleTestAI}
                       disabled={testing || !testMessage.trim()}
                       className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/30"
                    >
                       {testing ? "Analyzing Pattern..." : "Generate Prototype Response"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-2xl relative animate-in zoom-in-95 border border-border m-4">
              <button 
                onClick={closeProductModal}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-full transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="font-bold text-xl mb-6 flex items-center gap-2">
                 <ShoppingBag className="w-6 h-6 text-primary" /> 
                 {editingProductIndex !== null ? "Edit Product" : "Add New Product"}
              </h3>
              
              <div className="space-y-5">
                 {/* Image Upload */}
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                       <Image className="w-3 h-3" /> Product Gallery
                    </label>
                    
                    <div className="relative">
                     <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                        {/* Thumbnails */}
                        {productForm.images?.map((url, idx) => (
                           <div key={idx} className="relative aspect-square bg-muted/30 rounded-xl border border-border overflow-hidden group">
                              <img 
                                 src={url} 
                                 className="w-full h-full object-contain" 
                                 alt={`Product ${idx}`} 
                              />
                              <button 
                                 type="button"
                                 onClick={() => removeProductImage(idx)}
                                 className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                              >
                                 <X className="w-2.5 h-2.5" />
                              </button>
                           </div>
                        ))}
                        
                        {/* Smaller Upload Element */}
                        <label className={clsx(
                           "aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:bg-muted/30 hover:border-primary transition-all",
                           uploadingImage && "opacity-50 pointer-events-none"
                        )}>
                           {uploadingImage ? (
                              <Loader2 className="w-5 h-5 animate-spin text-primary" />
                           ) : (
                              <>
                                 <Plus className="w-5 h-5 text-muted-foreground" />
                                 <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground mt-1">Add</span>
                              </>
                           )}
                           <input 
                              type="file" 
                              accept="image/*" 
                              multiple 
                              onChange={handleProductImageUpload}
                              className="hidden"
                           />
                        </label>
                     </div>
                    </div>
                 </div>

                  {/* Product Name & Price */}
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Product Name *</label>
                        <input 
                           autoFocus
                           placeholder="E.g. Premium Subscription" 
                           value={productForm.name}
                           onChange={e => setProductForm({...productForm, name: e.target.value})}
                           className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Currency</label>
                           <div className="relative group">
                              <select 
                                 value={productForm.currency || "IDR"}
                                 onChange={e => setProductForm({...productForm, currency: e.target.value})}
                                 className="w-full pl-4 pr-10 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none transition-all font-bold appearance-none cursor-pointer"
                              >
                                 <option value="IDR">IDR (Rp)</option>
                                 <option value="MYR">MYR (RM)</option>
                                 <option value="USD">USD ($)</option>
                              </select>
                              <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-muted-foreground pointer-events-none group-hover:text-primary transition-colors" />
                           </div>
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Price *
                           </label>
                           <input 
                              placeholder="150000" 
                              type="number"
                              value={productForm.price}
                              onChange={e => setProductForm({...productForm, price: e.target.value})}
                              className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                           />
                        </div>
                     </div>
                  </div>

                 {/* Description */}
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Description & Benefits</label>
                    <textarea 
                       placeholder="Describe features, benefits, and what makes this product special..." 
                       value={productForm.description}
                       onChange={e => setProductForm({...productForm, description: e.target.value})}
                       rows={4}
                       className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                    />
                 </div>

                 {/* Stock Status */}
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">Stock Status</label>
                    <div className="flex gap-3">
                       <button 
                          onClick={() => setProductForm({...productForm, inStock: true})}
                          className={clsx(
                             "flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all border-2",
                             productForm.inStock 
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/50" 
                                : "bg-muted/20 text-muted-foreground border-border hover:border-emerald-500/30"
                          )}
                       >
                          ✓ In Stock
                       </button>
                       <button 
                          onClick={() => setProductForm({...productForm, inStock: false})}
                          className={clsx(
                             "flex-1 px-4 py-3 rounded-xl font-bold text-sm transition-all border-2",
                             !productForm.inStock 
                                ? "bg-red-500/10 text-red-600 border-red-500/50" 
                                : "bg-muted/20 text-muted-foreground border-border hover:border-red-500/30"
                          )}
                       >
                          ✗ Out of Stock
                       </button>
                    </div>
                 </div>

                 {/* Action Buttons */}
                 <div className="flex gap-3 pt-4">
                    <button 
                       onClick={closeProductModal}
                       className="px-6 py-3 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                    >
                       Cancel
                    </button>
                    <button 
                       onClick={saveProduct}
                       disabled={!productForm.name || !productForm.price}
                       className="flex-1 px-6 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                       <Save className="w-4 h-4" />
                       {editingProductIndex !== null ? "Update Product" : "Add Product"}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
