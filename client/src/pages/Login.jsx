import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { 
  MessageCircle, 
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
  X,
  Sparkles,
  Sun,
  Moon
} from "lucide-react";
import axios from "axios";
import clsx from "clsx";

const APP_NAME = import.meta.env.VITE_APP_NAME || 'BALES.IN';

export default function Login() {
  const { t, language, changeLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { login } = useAuth();
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
      window.location.href = "/app/chats"; 
    } catch (err) {
      setError(err.response?.data?.error || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={clsx(
      "min-h-screen transition-colors duration-500 flex items-center justify-center p-6 relative overflow-hidden font-sans",
      isDark ? "dark bg-zinc-950 text-white" : "bg-white text-zinc-900"
    )}>
      
      {/* Dynamic Background Elements - Same as Landing */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
      
      {/* Top Navigation - Language & Theme */}
      <div className="absolute top-8 right-8 flex items-center gap-4 z-50">
        <button 
          onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <Globe className="w-4 h-4" />
          {language === 'en' ? 'ID' : 'EN'}
        </button>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center z-10">
        
        {/* Left Side: Branding & Value Prop */}
        <div className="hidden lg:block space-y-12">
           <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform overflow-hidden">
                 <img src="/logo.webp" alt="Balesin Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-3xl font-black tracking-tighter">{APP_NAME}</span>
           </Link>

           <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-bold text-primary capitalize">
                  {t('landing.heroSubtitle') || 'Premium Automation'}
                </span>
              </div>
              <h1 className="text-6xl font-black leading-tight tracking-tight">
                {t('auth.scaleYour')} <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">{t('auth.business')}</span> {t('auth.messaging')}
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                {t('auth.platformDescription')}
              </p>
           </div>

           <div className="grid grid-cols-2 gap-6 pt-4">
              {[
                { icon: Zap, title: t('auth.aiIntelligence'), desc: t('auth.automateResponses') },
                { icon: Users, title: t('auth.multiAgent'), desc: t('auth.teamCollaboration') },
                { icon: Smartphone, title: t('auth.deviceSync'), desc: t('auth.realTimeManagement') },
                { icon: Globe, title: t('auth.scaleReady'), desc: t('auth.unlimitedGrowth') }
              ].map((feature, i) => (
                <div key={i} className="flex flex-col gap-2 p-5 bg-card/50 border border-border rounded-3xl backdrop-blur-sm hover:border-primary/30 transition-colors group">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary" />
                   </div>
                   <h3 className="font-bold">{feature.title}</h3>
                   <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
           </div>
        </div>

        {/* Right Side: Login Card */}
        <div className="flex justify-center lg:justify-end">
           <div className="w-full max-w-[480px] bg-card/40 backdrop-blur-2xl border border-border rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              
              {/* Card Decoration */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />

              <div className="relative z-10">
                {/* Login Options Tabs */}
                <div className="flex p-1.5 bg-muted/50 rounded-2xl mb-10 border border-border">
                  <button 
                    onClick={() => setActiveTab("owner")}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm",
                      activeTab === "owner" 
                        ? "bg-background text-foreground shadow-lg scale-[1.02]" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                      <ShieldCheck className="w-4 h-4" /> {t('auth.businessOwner')}
                  </button>
                  <button 
                    onClick={() => setActiveTab("agent")}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm",
                      activeTab === "agent" 
                        ? "bg-background text-foreground shadow-lg scale-[1.02]" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                      <Users className="w-4 h-4" /> {t('auth.csTeamMember')}
                  </button>
                </div>

                {activeTab === "owner" ? (
                  /* Business Owner View */
                  <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="text-center space-y-3">
                        <h2 className="text-4xl font-black tracking-tight">{t('auth.welcomeBackBoss')}</h2>
                        <p className="text-muted-foreground text-base">{t('auth.secureAuthorization')}</p>
                    </div>

                    <div className="pt-4">
                        <button 
                          onClick={login}
                          className="w-full py-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <Globe className="w-6 h-6" />
                          {t('auth.signInOrRegister')}
                          <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>

                    <p className="text-xs text-center text-muted-foreground max-w-[280px] mx-auto leading-relaxed italic">
                        {t('auth.termsPrivacy')}
                    </p>
                  </div>
                ) : (
                  /* CS Agent View */
                  <form onSubmit={handleAgentLogin} className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="text-center space-y-3 mb-6">
                        <h2 className="text-4xl font-black tracking-tight">{t('auth.teamLogin')}</h2>
                        <p className="text-muted-foreground text-sm">{t('auth.accessWorkspace')}</p>
                    </div>

                    {error && (
                      <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-2xl text-sm font-bold flex items-center gap-3 animate-in shake duration-500">
                          <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
                            <X className="w-4 h-4" />
                          </div>
                          {error}
                      </div>
                    )}

                    <div className="space-y-5">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">{t('auth.emailAddress')}</label>
                          <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <input 
                                type="email" 
                                required
                                placeholder={t("auth.emailPlaceholder")}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                              />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">{t('auth.securityPassword')}</label>
                          <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                              <input 
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder={t("auth.passwordPlaceholder")}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-muted/30 border border-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-muted-foreground/50 font-medium"
                              />
                              <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                          </div>
                        </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 bg-foreground text-background hover:bg-foreground/90 rounded-[2rem] font-black text-xl shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 mt-4"
                    >
                        {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <MessageCircle className="w-6 h-6" />}
                        {loading ? t('auth.verifying') : t('auth.loginToChat')}
                    </button>
                  </form>
                )}
              </div>

              {/* Branding (Mobile Only) */}
              <div className="lg:hidden flex flex-col items-center gap-2 mt-12 pt-8 border-t border-border opacity-60">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
                  <img src="/logo.webp" alt="Balesin Logo" className="w-full h-full object-cover" />
                </div>
                <span className="text-lg font-black tracking-tighter">{APP_NAME}</span>
              </div>
           </div>
        </div>

      </div>

      {/* Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center z-20 pointer-events-none">
        <p className="text-xs text-muted-foreground font-medium pointer-events-auto">
          Powered by <a href="https://indosofthouse.com/" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-primary transition-colors">indosofthouse</a>
        </p>
      </div>

    </div>
  );
}
