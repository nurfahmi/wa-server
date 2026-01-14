import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import { 
  MessageCircle, 
  Bot, 
  Users, 
  Smartphone, 
  Zap, 
  Shield, 
  BarChart3, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  Play,
  Star,
  Globe,
  Sparkles,
  HeadphonesIcon,
  TrendingUp,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  RefreshCw
} from 'lucide-react';
import clsx from 'clsx';

const APP_NAME = import.meta.env.VITE_APP_NAME || 'BALES.IN';

export default function Landing() {
  const { t, language, changeLanguage } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    // Fetch pricing from membership hub
    fetchPricing();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPricing = async () => {
    try {
      setLoadingPricing(true);
      const res = await axios.get('/api/auth/packages');
      if (res.data && res.data.packages) {
        const packages = res.data.packages;

        // 1. Collect all unique feature keys across all packages to show as potential features
        const allFeatureKeys = new Set();
        packages.forEach(pkg => {
          if (pkg.features) {
            Object.keys(pkg.features).forEach(key => allFeatureKeys.add(key));
          }
        });
        const sortedFeatureKeys = Array.from(allFeatureKeys);

        const transformed = packages.map(pkg => {
          const price = Number(pkg.price);
          const isIdr = pkg.currency === 'IDR' || price > 1000;
          const limits = pkg.limits || {};
          const features = pkg.features || {};
          
          const deviceLimit = pkg.device_limit || limits.device_limit || limits.max_device || 0;
          const agentLimit = pkg.agent_limit || limits.agent_limit || limits.new_agent || 0;

          // Helper to format limit text
          const formatLimit = (val, singular, plural) => {
            if (val === -1) return 'Unlimited';
            return `${val} ${val === 1 ? singular : plural}`;
          };
          const formatLimitId = (val, label) => {
            if (val === -1) return 'Tanpa Batas';
            return `${val} ${label}`;
          };

          // Primary features (Limits)
          const planFeatures = [
            {
              en: formatLimit(deviceLimit, 'WhatsApp Device', 'WhatsApp Devices'),
              id: formatLimitId(deviceLimit, 'Perangkat WhatsApp'),
              enabled: deviceLimit !== 0
            },
            {
              en: formatLimit(agentLimit, 'CS/Agent', 'CS/Agents'),
              id: formatLimitId(agentLimit, 'CS/Agent'),
              enabled: agentLimit !== 0
            }
          ];

          // Add all dynamic features as-is from the response
          sortedFeatureKeys.forEach(key => {
            // Avoid duplicating limits if they are in features object
            if (['device_limit', 'agent_limit', 'max_device', 'new_agent'].includes(key.toLowerCase())) return;

            planFeatures.push({
              en: key,
              id: key,
              enabled: !!features[key]
            });
          });

          return {
            name: pkg.name,
            slug: pkg.slug,
            priceEn: isIdr ? `Rp ${price.toLocaleString('id-ID')}` : `$${price}`,
            priceId: isIdr ? `Rp ${price.toLocaleString('id-ID')}` : `$${price}`,
            periodEn: `/${pkg.billing_cycle === 'monthly' || pkg.interval === 'month' ? 'mo' : (pkg.billing_cycle || pkg.interval || 'mo')}`,
            periodId: `/${pkg.billing_cycle === 'monthly' || pkg.interval === 'month' ? 'bln' : (pkg.billing_cycle || pkg.interval || 'bln')}`,
            features: planFeatures,
            popular: pkg.is_popular || pkg.is_featured || pkg.slug === 'pro'
          };
        });
        setPricingPlans(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch pricing:", err);
      setPricingPlans([]);
    } finally {
      setLoadingPricing(false);
    }
  };

  const features = [
    {
      icon: Bot,
      titleEn: "AI-Powered Auto Reply",
      titleId: "Auto Reply Berbasis AI",
      descEn: "Let AI handle customer inquiries 24/7. Train your AI with product knowledge and watch it close sales automatically.",
      descId: "Biarkan AI tangani pertanyaan customer 24/7. Training AI dengan pengetahuan produk dan lihat dia closing otomatis.",
      color: "from-purple-500 to-indigo-600"
    },
    {
      icon: Users,
      titleEn: "Multi-Agent Team Management",
      titleId: "Kelola Tim CS Multi-Agent",
      descEn: "Assign chats to team members, track performance, and ensure no customer is left waiting.",
      descId: "Assign chat ke tim, pantau performa, dan pastikan tidak ada customer yang nunggu lama.",
      color: "from-blue-500 to-cyan-600"
    },
    {
      icon: Smartphone,
      titleEn: "Multi-Device WhatsApp",
      titleId: "Multi Perangkat WhatsApp",
      descEn: "Connect multiple WhatsApp numbers from one dashboard. Manage all your business lines seamlessly.",
      descId: "Hubungkan banyak nomor WhatsApp dari satu dashboard. Kelola semua lini bisnis dengan mudah.",
      color: "from-emerald-500 to-teal-600"
    },
    {
      icon: Zap,
      titleEn: "Instant Response",
      titleId: "Respon Instan",
      descEn: "Reduce response time from hours to seconds. Happy customers = more sales.",
      descId: "Kurangi waktu respon dari jam ke detik. Customer senang = lebih banyak closing.",
      color: "from-amber-500 to-orange-600"
    },
    {
      icon: BarChart3,
      titleEn: "Real-time Analytics",
      titleId: "Analitik Real-time",
      descEn: "Track message volume, AI efficiency, agent performance, and conversion rates in real-time.",
      descId: "Pantau volume pesan, efisiensi AI, performa agent, dan tingkat konversi secara real-time.",
      color: "from-pink-500 to-rose-600"
    },
    {
      icon: Shield,
      titleEn: "Enterprise Security",
      titleId: "Keamanan Enterprise",
      descEn: "256-bit encryption, secure data storage, and role-based access control for your peace of mind.",
      descId: "Enkripsi 256-bit, penyimpanan data aman, dan kontrol akses berbasis role untuk ketenangan pikiran.",
      color: "from-slate-500 to-zinc-600"
    }
  ];

  const stats = [
    { valueEn: "10x", valueId: "10x", labelEn: "Faster Response", labelId: "Respon Lebih Cepat" },
    { valueEn: "80%", valueId: "80%", labelEn: "AI Handled", labelId: "Ditangani AI" },
    { valueEn: "24/7", valueId: "24/7", labelEn: "Always Online", labelId: "Selalu Online" },
    { valueEn: "∞", valueId: "∞", labelEn: "Scalable", labelId: "Skalabel" }
  ];

  const testimonials = [
    {
      nameEn: "Sarah M.",
      nameId: "Sarah M.",
      roleEn: "Online Shop Owner",
      roleId: "Pemilik Olshop",
      textEn: "My response time went from 2 hours to 2 seconds. Sales increased by 40% in the first month!",
      textId: "Waktu respon saya dari 2 jam jadi 2 detik. Penjualan naik 40% di bulan pertama!",
      rating: 5
    },
    {
      nameEn: "Budi K.",
      nameId: "Budi K.",
      roleEn: "Property Agent",
      roleId: "Agen Properti",
      textEn: "Now I can handle 100+ inquiries daily without hiring more staff. Game changer!",
      textId: "Sekarang saya bisa handle 100+ pertanyaan per hari tanpa nambah karyawan. Game changer!",
      rating: 5
    },
    {
      nameEn: "Diana R.",
      nameId: "Diana R.",
      roleEn: "Startup Founder",
      roleId: "Founder Startup",
      textEn: "The AI understands our products perfectly. It's like having a super-smart CS team 24/7.",
      textId: "AI-nya paham produk kami dengan sempurna. Seperti punya tim CS super pintar 24/7.",
      rating: 5
    }
  ];

  return (
    <div className={clsx("min-h-screen transition-colors duration-500", isDark ? "dark bg-zinc-950" : "bg-white")}>
      {/* Navbar */}
      <nav className={clsx(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled 
          ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-sm" 
          : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30 overflow-hidden">
              <img src="/logo.webp" alt={APP_NAME} className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-black tracking-tight text-foreground">{APP_NAME}</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <button 
              onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Globe className="w-4 h-4" />
              {language === 'en' ? 'Switch to ID' : 'Ganti ke EN'}
            </button>
            
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <Link 
              to="/login" 
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {t('nav.login') || (language === 'en' ? 'Login' : 'Masuk')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-primary">
              {language === 'en' ? 'AI-Powered WhatsApp Automation' : 'Otomasi WhatsApp Berbasis AI'}
            </span>
          </div>
          
          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            <span className="text-foreground">
              {t('landing.heroTitle')}
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">
              {t('landing.heroSubtitle')}
            </span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {t('landing.heroDesc')}
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link 
              to="/login"
              className="group px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-primary/30 flex items-center gap-3"
            >
              {t('landing.ctaStart')}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          {/* Trust Badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-muted-foreground animate-in fade-in duration-700 delay-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">{t('landing.uspSecure')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">{t('landing.uspSupport')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span className="text-sm font-medium">{t('landing.uspGlobal')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-black text-primary mb-2">
                  {language === 'en' ? stat.valueEn : stat.valueId}
                </div>
                <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  {language === 'en' ? stat.labelEn : stat.labelId}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              {t('landing.featuresTitle')}
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
                {t('landing.featuresSubtitle')}
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t('landing.featuresDesc')}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group p-8 bg-card border border-border rounded-3xl hover:shadow-2xl hover:border-primary/20 transition-all duration-500 hover:-translate-y-2"
              >
                <div className={clsx(
                  "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br shadow-lg",
                  feature.color
                )}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-black mb-3 group-hover:text-primary transition-colors">
                  {language === 'en' ? feature.titleEn : feature.titleId}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {language === 'en' ? feature.descEn : feature.descId}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              {t('landing.howItWorks')}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600"> 3 {t('landing.steps')}</span>
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                titleEn: "Connect Your WhatsApp",
                titleId: "Hubungkan WhatsApp",
                descEn: "Scan QR code to connect your WhatsApp number. It takes less than 30 seconds.",
                descId: "Scan QR code untuk hubungkan nomor WhatsApp. Butuh kurang dari 30 detik."
              },
              {
                step: "02",
                titleEn: "Train Your AI",
                titleId: "Training AI Kamu",
                descEn: "Add your products, FAQs, and brand voice. The AI learns and adapts to your business.",
                descId: "Tambahkan produk, FAQ, dan gaya bahasa. AI belajar dan menyesuaikan dengan bisnis kamu."
              },
              {
                step: "03",
                titleEn: "Watch Sales Grow",
                titleId: "Lihat Penjualan Naik",
                descEn: "Sit back and watch AI handle inquiries, qualify leads, and help close more sales.",
                descId: "Duduk santai dan lihat AI handle pertanyaan, kualifikasi leads, dan bantu closing lebih banyak."
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-8xl font-black text-primary/10 absolute -top-4 -left-2">{item.step}</div>
                <div className="relative z-10 pt-8">
                  <h3 className="text-xl font-black mb-3">
                    {language === 'en' ? item.titleEn : item.titleId}
                  </h3>
                  <p className="text-muted-foreground">
                    {language === 'en' ? item.descEn : item.descId}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      {(loadingPricing || pricingPlans.length > 0) && (
        <section className="py-24 bg-muted/30" id="pricing">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
                {t('landing.pricingTitle')}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600"> {t('landing.pricingSubtitle')}</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                {t('landing.pricingDesc')}
              </p>
            </div>
            
            {loadingPricing ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">
                  {t('landing.loadingPlans')}
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pricingPlans.map((plan, i) => (
                  <div 
                    key={i} 
                    className={clsx(
                      "relative p-8 rounded-3xl border transition-all",
                      plan.popular 
                        ? "bg-primary text-primary-foreground border-primary shadow-2xl shadow-primary/30 scale-105" 
                        : "bg-card border-border"
                    )}
                  >
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 rounded-full text-xs font-black uppercase">
                        {language === 'en' ? 'Most Popular' : 'Paling Populer'}
                      </div>
                    )}
                    <h3 className="text-xl font-black mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-black">{language === 'en' ? plan.priceEn : plan.priceId}</span>
                      <span className={plan.popular ? "text-primary-foreground/70" : "text-muted-foreground"}>
                        {language === 'en' ? plan.periodEn : plan.periodId}
                      </span>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, j) => (
                        <li key={j} className={clsx(
                          "flex items-center gap-3 transition-opacity",
                          !feature.enabled && "opacity-40"
                        )}>
                          <CheckCircle2 className={clsx(
                            "w-5 h-5 flex-shrink-0", 
                            plan.popular ? "text-primary-foreground" : "text-primary",
                            !feature.enabled && "text-muted-foreground"
                          )} />
                          <span className={clsx(
                            "text-sm",
                            plan.popular ? "" : "text-muted-foreground",
                            !feature.enabled && "line-through decoration-1"
                          )}>
                            {language === 'en' ? feature.en : feature.id}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Link 
                      to="/login"
                      className={clsx(
                        "w-full py-3 rounded-xl font-bold transition-all inline-flex items-center justify-center",
                        plan.popular 
                          ? "bg-white text-primary hover:bg-white/90" 
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      )}
                    >
                      {language === 'en' ? 'Get Started' : 'Mulai Sekarang'}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-6">
            {language === 'en' ? 'Ready to Transform Your' : 'Siap Transformasi'}
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              {language === 'en' ? 'Customer Service?' : 'Customer Service Kamu?'}
            </span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            {language === 'en' 
              ? 'Join thousands of businesses already using ' + APP_NAME + ' to grow their sales.'
              : 'Gabung ribuan bisnis yang sudah pakai ' + APP_NAME + ' untuk tingkatkan penjualan.'
            }
          </p>
          <Link 
            to="/login"
            className="inline-flex items-center gap-3 px-10 py-5 bg-primary text-primary-foreground rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-primary/30"
          >
            {t('landing.ctaStart')}
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-muted/50 border-t border-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden">
                <img src="/logo.webp" alt={APP_NAME} className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black">{APP_NAME}</span>
            </div>
            <div className="flex flex-col items-center md:items-end gap-1">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {APP_NAME}. {t('landing.footerRights')}
              </p>
              <p className="text-xs text-muted-foreground">
                Powered by <a href="https://indosofthouse.com/" target="_blank" rel="noopener noreferrer" className="font-bold hover:text-primary transition-colors">indosofthouse</a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
