import React from "react";
import { Link } from "react-router-dom";
import { Smartphone, RefreshCw, ArrowRight } from "lucide-react";
import clsx from "clsx";

export const DeviceSelectionView = ({
  allDevices,
  loadingDevices,
  fetchAllDevices,
  navigate
}) => {
  return (
     <div className="space-y-12">
        <div className="max-w-6xl w-full space-y-12">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                 <h1 className="text-4xl font-black tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-500">Select Inbox</h1>
                 <p className="text-muted-foreground mt-2 text-lg font-medium">Choose a WhatsApp device to start managing conversations.</p>
              </div>
              <button 
                onClick={fetchAllDevices}
                className="p-3 bg-card border border-border text-muted-foreground rounded-2xl hover:text-foreground transition-all shadow-sm"
              >
                 <RefreshCw className={clsx("w-6 h-6", loadingDevices && "animate-spin")} />
              </button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loadingDevices && allDevices.length === 0 ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-64 bg-card border border-border rounded-[3rem] animate-pulse"></div>
                ))
              ) : allDevices.length === 0 ? (
                 <div className="col-span-full py-20 bg-card rounded-[3rem] border border-dashed border-border flex flex-col items-center">
                    <Smartphone className="w-20 h-20 text-muted-foreground opacity-20 mb-6" />
                    <p className="text-xl font-bold text-muted-foreground">No devices connected</p>
                    <Link to="/devices" className="mt-4 text-primary font-black uppercase tracking-widest text-xs hover:underline">Go to Devices Page →</Link>
                 </div>
              ) : allDevices.map(d => (
                <div 
                  key={d.id} 
                  onClick={() => navigate(`/devices/${d.id}/chats`)}
                  className="group bg-card border border-border p-8 rounded-[3rem] hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                >
                   <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                         <div className={clsx(
                           "p-4 rounded-[2rem] border transition-transform group-hover:scale-110",
                           d.status === 'connected' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                         )}>
                            <Smartphone className="w-8 h-8" />
                         </div>
                         <div className={clsx(
                           "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                           d.status === 'connected' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                         )}>
                            {d.status}
                         </div>
                      </div>
                      <h3 className="text-2xl font-black tracking-tight mb-2 group-hover:text-primary transition-colors">{d.name || d.sessionId}</h3>
                      <p className="text-sm font-medium text-muted-foreground opacity-70 mb-6">Device ID: {d.id}</p>
                      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary group-hover:translate-x-1 transition-transform">
                         Open Live Inbox <ArrowRight className="w-4 h-4" />
                      </div>
                   </div>
                   <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                </div>
              ))}
           </div>
        </div>
     </div>
  );
};
