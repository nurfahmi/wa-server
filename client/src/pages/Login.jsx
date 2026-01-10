import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { 
  MessageSquare, 
  ShieldCheck, 
  Users, 
  Mail, 
  Lock, 
  ArrowRight, 
  Globe, 
  Zap, 
  Smartphone,
  RefreshCw,
  Eye,
  EyeOff,
  X
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";

export default function Login() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("owner"); // "owner" or "agent"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAgentLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/login-local", { email, password });
      localStorage.setItem("token", res.data.token);
      // Reload or trigger auth context update
      window.location.href = "/chats"; 
    } catch (err) {
      setError(err.response?.data?.error || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse delay-700" />
      
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        
        {/* Left Side: Branding & Value Prop */}
        <div className="hidden lg:block space-y-10">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                 <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-3xl font-black tracking-tighter">WA SERVER</span>
           </div>

           <div className="space-y-6">
              <h1 className="text-6xl font-black leading-tight tracking-tight">
                {t('auth.scaleYour')} <span className="text-primary">{t('auth.business')}</span> {t('auth.messaging')}
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-lg">
                {t('auth.platformDescription')}
              </p>
           </div>

           <div className="grid grid-cols-2 gap-6 pt-6">
              {[
                { icon: Zap, title: "AI Intelligence", desc: "Automate responses" },
                { icon: Users, title: "Multi-Agent", desc: "Team collaboration" },
                { icon: Smartphone, title: "Device Sync", desc: "Real-time management" },
                { icon: Globe, title: "Scale Ready", desc: "Unlimited growth" }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col gap-2 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                   <feature.icon className="w-6 h-6 text-primary mb-2" />
                   <h3 className="font-bold">{feature.title}</h3>
                   <p className="text-xs text-gray-500">{feature.desc}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="flex justify-center lg:justify-end">
           <div className="w-full max-w-[480px] bg-card/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden relative group">
              
              {/* Login Options Tabs */}
              <div className="flex p-1 bg-white/5 rounded-2xl mb-10 border border-white/5">
                 <button 
                   onClick={() => setActiveTab("owner")}
                   className={clsx(
                     "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm",
                     activeTab === "owner" ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                   )}
                 >
                    <ShieldCheck className="w-4 h-4" /> {t('auth.businessOwner')}
                 </button>
                 <button 
                   onClick={() => setActiveTab("agent")}
                   className={clsx(
                     "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm",
                     activeTab === "agent" ? "bg-white text-black shadow-lg" : "text-gray-400 hover:text-white"
                   )}
                 >
                    <Users className="w-4 h-4" /> {t('auth.csTeamMember')}
                 </button>
              </div>

              {activeTab === "owner" ? (
                /* Business Owner View */
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                   <div className="text-center space-y-3">
                      <h2 className="text-3xl font-black">Welcome Back Boss!</h2>
                      <p className="text-gray-400 text-sm">Secure authorization for business management.</p>
                   </div>

                   <div className="pt-4">
                      <button 
                        onClick={login}
                        className="w-full py-5 bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-primary/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                         <Globe className="w-6 h-6" />
                         Sign in with IndosoftHouse
                         <ArrowRight className="w-6 h-6" />
                      </button>
                   </div>

                   <p className="text-xs text-center text-gray-500 max-w-xs mx-auto leading-relaxed">
                      {t('auth.termsPrivacy')}
                   </p>
                </div>
              ) : (
                /* CS Agent View */
                <form onSubmit={handleAgentLogin} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                   <div className="text-center space-y-3 mb-4">
                      <h2 className="text-3xl font-black">Team Login</h2>
                      <p className="text-gray-400 text-sm">Access your assigned workspace.</p>
                   </div>

                   {error && (
                     <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-sm font-bold flex items-center gap-2">
                        <X className="w-4 h-4" /> {error}
                     </div>
                   )}

                   <div className="space-y-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('auth.emailAddress')}</label>
                         <div className="relative">
                            <Mail className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                            <input 
                               type="email" 
                               required
                               placeholder="e.g. sarah@business.com"
                               value={email}
                               onChange={e => setEmail(e.target.value)}
                               className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-medium"
                            />
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">{t('auth.securityPassword')}</label>
                         <div className="relative">
                            <Lock className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                            <input 
                               type={showPassword ? "text" : "password"}
                               required
                               placeholder="Enter your password"
                               value={password}
                               onChange={e => setPassword(e.target.value)}
                               className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-gray-600 font-medium"
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-4 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                               {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                         </div>
                      </div>
                   </div>

                   <button 
                     type="submit"
                     disabled={loading}
                     className="w-full py-5 bg-white text-black hover:bg-gray-200 rounded-[2rem] font-black text-lg shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                   >
                      {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <MessageSquare className="w-6 h-6" />}
                      {loading ? t('auth.verifying') : t('auth.loginToChat')}
                   </button>
                </form>
              )}

              {/* Footer Logo (Mobile Only) */}
              <div className="lg:hidden flex items-center justify-center gap-2 mt-12 opacity-40">
                <MessageSquare className="w-5 h-5 text-primary" />
                <span className="font-black tracking-tighter">WA SERVER</span>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
