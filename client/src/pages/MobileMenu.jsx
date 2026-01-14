import { Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Smartphone, 
  MessageSquare, 
  User, 
  MessagesSquare, 
  Image,
  ArrowRight,
  ShieldCheck,
  Zap,
  PhoneCall
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import clsx from "clsx";

const MenuCard = ({ item }) => {
  return (
    <Link 
      to={item.href}
      className="group relative bg-card hover:bg-muted/50 border border-border rounded-[2.5rem] p-6 transition-all duration-300 active:scale-95 shadow-sm hover:shadow-xl hover:border-primary/20 overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={clsx(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 shadow-lg",
          item.color || "bg-primary text-primary-foreground"
        )}>
          <item.icon className="w-7 h-7" />
        </div>
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
      
      <div className="relative z-10">
        <h3 className="text-xl font-black tracking-tight text-foreground mb-1 group-hover:text-primary transition-colors">{item.name}</h3>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed opacity-80">{item.description}</p>
      </div>

      {/* Decorative background element */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all duration-500" />
    </Link>
  );
};

export default function MobileMenu() {
  const { user } = useAuth();

  const menuItems = [
    { 
      name: 'Dashboard', 
      href: '/app/dashboard', 
      icon: LayoutDashboard, 
      roles: ['user', 'superadmin'],
      description: 'System overview & real-time traffic analysis.',
      color: 'bg-indigo-500 text-white'
    },
    { 
      name: 'Live Chats', 
      href: '/app/chats', 
      icon: MessagesSquare, 
      roles: ['user', 'superadmin', 'agent'],
      description: 'Manage active conversations & customer support.',
      color: 'bg-emerald-500 text-white'
    },
    { 
      name: 'WA Devices', 
      href: '/app/devices', 
      icon: Smartphone, 
      roles: ['user', 'superadmin'],
      description: 'Connect & manage your WhatsApp accounts.',
      color: 'bg-blue-500 text-white'
    },
    { 
      name: 'CS Management', 
      href: '/app/cs-dashboard', 
      icon: ShieldCheck, 
      roles: ['user', 'superadmin'],
      description: 'Team efficiency & automated handling stats.',
      color: 'bg-purple-500 text-white'
    },
    { 
      name: 'Agents/Team', 
      href: '/app/agents', 
      icon: User, 
      roles: ['user', 'superadmin'],
      description: 'Manage agent access & permissions.',
      color: 'bg-amber-500 text-white'
    },
    { 
      name: 'Media Gallery', 
      href: '/app/gallery', 
      icon: Image, 
      roles: ['user', 'superadmin'],
      description: 'Shared images & file history.',
      color: 'bg-rose-500 text-white'
    },
  ].filter(item => item.roles.includes(user?.role));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
         <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full border border-primary/10">App Control Hub</span>
            <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
         </div>
         <h1 className="text-4xl font-black tracking-tight text-foreground">Welcome Back, <span className="text-primary">{user?.name?.split(' ')[0]}!</span></h1>
         <p className="text-muted-foreground font-medium text-lg leading-relaxed">Where would you like to go today?</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {menuItems.map((item) => (
          <MenuCard key={item.name} item={item} />
        ))}
      </div>

      <div className="pt-4 flex flex-col items-center gap-4">
         <div className="flex items-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <MessageSquare className="w-6 h-6" />
            <Smartphone className="w-6 h-6" />
            <Zap className="w-6 h-6" />
            <ShieldCheck className="w-6 h-6" />
         </div>
         <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">WA SaaS Enterprise • version 2.4.0</p>
      </div>
    </div>
  );
}
