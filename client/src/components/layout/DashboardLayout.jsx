import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { Outlet } from "react-router-dom";
import { 
  LayoutDashboard, 
  Smartphone, 
  MessageSquare, 
  LogOut, 
  Settings,
  Menu,
  X,
  User,
  MessagesSquare,
  Image,
  ChevronLeft,
  MoreHorizontal,
  Sun,
  Moon,
  Globe
} from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";
import { availableLanguages } from "../../locales";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, changeLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);

  useEffect(() => {
    const handleScroll = (e) => {
        const target = e.target;
        if (target.scrollTop > 10) {
            setScrolled(true);
        } else {
            setScrolled(false);
        }
    };
    
    const mainEl = document.querySelector('main');
    if (mainEl) {
        mainEl.addEventListener('scroll', handleScroll);
    }
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard, roles: ['user', 'superadmin'] },
    { name: t('nav.devices'), href: '/devices', icon: Smartphone, roles: ['user', 'superadmin'] },
    { name: t('nav.agents'), href: '/agents', icon: User, roles: ['user', 'superadmin'] },
    { name: t('nav.chats'), href: '/chats', icon: MessagesSquare, roles: ['user', 'superadmin', 'agent'] },
    { name: t('nav.csManagement'), href: '/cs-dashboard', icon: LayoutDashboard, roles: ['user', 'superadmin'] },
    { name: t('nav.gallery'), href: '/gallery', icon: Image, roles: ['user', 'superadmin'] },
  ].filter(item => item.roles.includes(user?.role));

  const mobileNavItems = [
    { name: t('nav.menu'), href: '/menu', icon: Menu },
    { name: t('nav.chats'), href: '/chats', icon: MessagesSquare },
    { name: t('nav.devices'), href: '/devices', icon: Smartphone },
    { name: t('nav.stats'), href: '/dashboard', icon: LayoutDashboard },
  ];

  // Helper to check if we are on a nested route or specific page beyond the hub
  const isAtHub = location.pathname === '/menu';
  const isNested = location.pathname.split('/').filter(Boolean).length > 1 || (!isAtHub && location.pathname !== '/dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-300 overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar / Drawer */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-[110] w-[280px] bg-card text-card-foreground border-r border-border transform transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col shadow-2xl lg:shadow-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
               <MessageSquare className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight">WA Server</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-accent transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 flex flex-col p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={clsx("mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                {item.name}
                {isActive && (
                    <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/20" />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Desktop Header/Topbar */}
        <header className="hidden lg:flex items-center justify-between h-20 px-8 bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-50 transition-all duration-300">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
              {location.pathname === '/dashboard' ? t('nav.dashboard') :
               location.pathname === '/devices' ? t('nav.devices') :
               location.pathname === '/agents' ? t('nav.agents') :
               location.pathname === '/chats' ? t('nav.chats') :
               location.pathname === '/cs-dashboard' ? t('nav.csManagement') :
               location.pathname === '/gallery' ? t('nav.gallery') :
               location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').toUpperCase()}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all border border-transparent hover:border-border"
              title={isDark ? 'Light Mode' : 'Dark Mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setLanguageOpen(!languageOpen)}
                className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl transition-all border border-transparent hover:border-border"
              >
                <Globe className="w-5 h-5" />
                <span className="text-sm font-bold uppercase">{language}</span>
              </button>
              
              {languageOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setLanguageOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {availableLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setLanguageOpen(false);
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold transition-colors",
                          language === lang.code 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Divider */}
            <div className="h-8 w-px bg-border"></div>

            {/* User Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-3 px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-xl transition-all border border-transparent hover:border-border"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white/10">
                  {user?.name?.[0] || 'U'}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold leading-none">{user?.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">{user?.role}</p>
                </div>
              </button>

              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    <div className="p-2">
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl hover:bg-muted transition-colors text-foreground">
                        <Settings className="w-4.5 h-4.5 text-muted-foreground" />
                        {t('nav.settings')}
                      </button>
                      <button 
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl hover:bg-destructive/10 transition-colors text-destructive"
                      >
                        <LogOut className="w-4.5 h-4.5" />
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className={clsx(
            "lg:hidden flex items-center justify-between h-16 px-6 bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-50 transition-all duration-300",
            scrolled ? "shadow-md py-2" : "py-4"
        )}>
          <div className="flex items-center gap-3">
            {!isAtHub && (
                <button 
                  onClick={() => navigate('/menu')} 
                  className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors animate-in slide-in-from-left duration-300"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
            )}
            {isAtHub && (
                <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm">
                    <MessageSquare className="w-5 h-5" />
                </div>
            )}
            <span className="text-lg font-black tracking-tight">
              {isAtHub ? 'WA Server' : location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ').toUpperCase().substring(0, 12)}
            </span>
          </div>
          
          {/* Mobile Profile Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-xs font-black shadow-lg border-2 border-white/20 active:scale-95 transition-all"
            >
              {user?.name?.[0] || 'U'}
            </button>

            {profileOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                <div className="absolute top-full right-0 mt-3 w-56 bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <div className="p-5 border-b border-border bg-muted/20">
                    <p className="font-bold text-sm truncate">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">{user?.role}</p>
                  </div>
                  <div className="p-2">
                    {/* Theme Toggle */}
                    <button 
                      onClick={toggleTheme}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl hover:bg-muted transition-colors text-foreground"
                    >
                      {isDark ? <Sun className="w-4.5 h-4.5 text-muted-foreground" /> : <Moon className="w-4.5 h-4.5 text-muted-foreground" />}
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    
                    {/* Language Switcher */}
                    {availableLanguages.map((lang) => (
                      <button 
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setProfileOpen(false);
                        }}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-colors",
                          language === lang.code ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        {lang.name}
                      </button>
                    ))}
                    
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl hover:bg-muted transition-colors text-foreground">
                      <Settings className="w-4.5 h-4.5 text-muted-foreground" />
                      {t('nav.settings')}
                    </button>
                    <button 
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl hover:bg-destructive/10 transition-colors text-destructive"
                    >
                      <LogOut className="w-4.5 h-4.5" />
                      {t('nav.logout')}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto relative custom-scrollbar pb-32 lg:pb-12 lg:p-10 p-6 pt-6 lg:pt-10 scroll-smooth">
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-3 duration-700">
            <Outlet />
          </div>
        </main>

        {/* Bottom Navigation for Mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[90] bg-card/80 backdrop-blur-2xl border-t border-border px-4 pb-safe-area-inset-bottom pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-around max-w-md mx-auto relative">
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/menu' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    "flex flex-col items-center py-2 px-1 rounded-2xl transition-all duration-500 relative flex-1",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95"
                  )}
                >
                  <div className={clsx(
                      "w-12 h-8 rounded-full flex items-center justify-center transition-all duration-300 mb-1",
                      isActive ? "bg-primary/10" : ""
                  )}>
                    <item.icon className={clsx("w-6 h-6", isActive ? "stroke-[2.5px]" : "stroke-[2px]")} />
                  </div>
                  <span className={clsx(
                      "text-[10px] font-black uppercase tracking-widest transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-60"
                  )}>{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center py-2 px-1 text-muted-foreground active:scale-95 transition-all duration-500 flex-1"
            >
              <div className="w-12 h-8 rounded-full flex items-center justify-center mb-1">
                <MoreHorizontal className="w-6 h-6 stroke-[2px]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Sidebar</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
