import React from "react";
import { X, UserPlus, Loader2 } from "lucide-react";

export const HandoverDialog = ({
  show,
  onClose,
  agents,
  selectedAgentId,
  setSelectedAgentId,
  handoverNotes,
  setHandoverNotes,
  onHandover,
  loadingAgents,
  uploading,
  t
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
       <div className="bg-card w-full max-w-md rounded-2xl md:rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
           <div className="px-5 py-4 md:p-8 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                 <h3 className="text-lg md:text-xl font-black text-foreground mb-0.5 md:mb-1">{t('chats.handoverTitle')}</h3>
                 <p className="text-[9px] md:text-xs text-muted-foreground font-bold uppercase tracking-widest">{t('chats.handoverSubtitle')}</p>
              </div>
              <button onClick={onClose} className="p-2 md:p-3 hover:bg-muted rounded-xl md:rounded-2xl transition-all">
                 <X className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" />
              </button>
           </div>

           <div className="p-5 md:p-8 space-y-4 md:space-y-6">
              <div className="space-y-2 md:space-y-3">
                 <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">{t('chats.handoverSelectAgent')}</label>
                 <div className="relative">
                    <UserPlus className="absolute left-4 top-3.5 md:top-4 w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <select 
                       value={selectedAgentId}
                       onChange={(e) => setSelectedAgentId(e.target.value)}
                       className="w-full pl-10 md:pl-12 pr-4 py-3 md:py-4 bg-muted/50 border border-border rounded-xl md:rounded-2xl text-foreground font-bold text-xs md:text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                    >
                       <option value="">{t('chats.handoverChooseAgent')}</option>
                       {agents.map(agent => (
                          <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                       ))}
                    </select>
                    {loadingAgents && <Loader2 className="absolute right-4 top-3.5 md:top-4 w-4 h-4 md:w-5 md:h-5 animate-spin text-muted-foreground" />}
                 </div>
                 {agents.length === 0 && !loadingAgents && (
                   <p className="text-[9px] md:text-[10px] text-amber-500 font-bold px-1">{t('chats.handoverNoAgents')}</p>
                 )}
              </div>

              <div className="space-y-2 md:space-y-3">
                 <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">{t('chats.handoverNotesLabel')}</label>
                 <textarea 
                    placeholder={t('chats.handoverNotesPlaceholder')}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="w-full p-4 bg-muted/50 border border-border rounded-xl md:rounded-2xl text-xs md:text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-[100px] md:min-h-[120px] resize-none"
                 />
              </div>
           </div>

           <div className="p-5 md:p-8 bg-muted/20 border-t border-border flex gap-2 md:gap-3">
              <button 
                 onClick={onClose}
                 className="flex-1 py-3 md:py-4 text-[10px] md:text-sm font-black text-muted-foreground hover:bg-muted rounded-xl md:rounded-2xl transition-all uppercase tracking-widest"
              >
                 {t('modal.cancel')}
              </button>
              <button 
                 onClick={onHandover}
                 disabled={!selectedAgentId || uploading}
                 className="flex-[2] py-3 md:py-4 bg-primary text-primary-foreground text-[10px] md:text-sm font-black rounded-xl md:rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
              >
                 {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                 {t('chats.handoverConfirm')}
              </button>
           </div>
       </div>
    </div>
  );
};
