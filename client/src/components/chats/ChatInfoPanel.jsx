import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, X, User, CheckCheck, ShieldCheck, RefreshCw, UserPlus, 
  Bot, Brain
} from "lucide-react";
import clsx from "clsx";
import { useModal } from "../../context/ModalContext";
import { parseLabels, formatJid } from "../../utils/chatUtils";

export const ChatInfoPanel = ({
  showInfoPanel,
  setShowInfoPanel,
  selectedChat,
  setSelectedChat,
  deviceId,
  user,
  messages,
  handleUpdateSettings,
  handleClearMemory,
  handleRelease,
  handleTakeover,
  setShowHandoverModal,
  t
}) => {
  const { showConfirm, showAlert } = useModal();
  const [newLabelText, setNewLabelText] = useState("");

  if (!showInfoPanel || !selectedChat) return null;

  const handleAddLabel = (e) => {
      if (e.key === 'Enter' && newLabelText.trim()) {
          const currentLabels = parseLabels(selectedChat.labels);
          if (!currentLabels.includes(newLabelText.trim())) {
              const updated = [...currentLabels, newLabelText.trim()];
              handleUpdateSettings({ labels: JSON.stringify(updated) });
          }
          setNewLabelText("");
      }
  };

  const removeLabel = (label) => {
      const currentLabels = parseLabels(selectedChat.labels);
      const updated = currentLabels.filter(l => l !== label);
      handleUpdateSettings({ labels: JSON.stringify(updated) });
  };

  return (
    <div className={clsx(
      "bg-card flex flex-col overflow-hidden transition-all duration-300 shadow-2xl",
      "fixed inset-0 z-[60] md:relative md:inset-auto md:w-[340px] md:z-auto md:border-l md:border-border",
      "animate-in slide-in-from-right duration-300"
    )}>
       {/* Header */}
       <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-muted/10 shrink-0">
          <div className="flex items-center gap-3">
             <button onClick={() => setShowInfoPanel(false)} className="md:hidden p-1 hover:bg-muted rounded-lg transition-colors">
                <ChevronLeft className="w-6 h-6 text-foreground" />
             </button>
             <h3 className="font-bold text-foreground flex items-center gap-2 text-lg md:text-base">
                <User className="w-4.5 h-4.5 text-primary" /> {t('chats.contactInfo') || 'Contact info'}
             </h3>
          </div>
          <button onClick={() => setShowInfoPanel(false)} className="hidden md:block p-2 hover:bg-muted rounded-xl transition-colors">
             <X className="w-5 h-5 text-muted-foreground"/>
          </button>
       </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {/* Profile Card */}
           <div className="p-5 flex flex-col items-center bg-gradient-to-b from-muted/30 to-card border-b border-border text-center">
              <div className="relative group/avatar">
                 {selectedChat.profilePictureUrl ? (
                    <img 
                       src={selectedChat.profilePictureUrl} 
                       alt={selectedChat.contactName || selectedChat.name}
                       className="w-20 h-20 rounded-2xl object-cover mb-4 shadow-xl shadow-indigo-500/20 border-2 border-primary/20"
                    />
                 ) : (
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black mb-4 shadow-xl shadow-indigo-500/20">
                       {(selectedChat.contactName || selectedChat.name || "?").substring(0, 2).toUpperCase()}
                    </div>
                 )}
                 <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-card rounded-full shadow-sm" title="WhatsApp Connected" />
              </div>
              <h2 className="text-xl font-black text-foreground mb-1 text-center truncate w-full px-4">
                {selectedChat.contactName || selectedChat.name || "Unknown Customer"}
              </h2>
              <p className="text-sm text-muted-foreground font-bold font-mono tracking-tight mb-4 text-center">
                {selectedChat.phoneNumber || formatJid(selectedChat.chatId)}
              </p>
              
                {selectedChat.isEditingName ? (
                    <div className="w-full flex flex-col gap-2 animate-in slide-in-from-top-2 px-4">
                       <div className="flex gap-2">
                          <input 
                             id="name-editor-input"
                             autoFocus
                             className="flex-1 bg-card border-2 border-primary rounded-xl px-4 py-2 text-sm font-bold outline-none shadow-lg shadow-primary/10"
                             placeholder="Enter name..."
                             defaultValue={selectedChat.contactName || selectedChat.name || ""}
                             onKeyDown={async (e) => {
                               if (e.key === 'Enter') {
                                   const val = e.target.value.trim();
                                   if (val) await handleUpdateSettings({ contactName: val });
                                   setSelectedChat(prev => ({ ...prev, isEditingName: false }));
                               }
                               if (e.key === 'Escape') setSelectedChat(prev => ({ ...prev, isEditingName: false }));
                             }}
                          />
                          <button 
                             onClick={async () => {
                                const val = document.getElementById('name-editor-input').value.trim();
                                if (val) await handleUpdateSettings({ contactName: val });
                                setSelectedChat(prev => ({ ...prev, isEditingName: false }));
                             }}
                             className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                             title="Save Name"
                          >
                             <CheckCheck className="w-4 h-4" />
                          </button>
                          <button 
                             onClick={() => setSelectedChat(prev => ({ ...prev, isEditingName: false }))}
                             className="p-2 bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                             title="Cancel"
                          >
                             <X className="w-4 h-4" />
                          </button>
                       </div>
                       <p className="text-[10px] text-muted-foreground font-medium text-center">Press Enter or click check to save</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2 w-full px-2">
                       <button 
                         onClick={() => setSelectedChat(prev => ({ ...prev, isEditingName: true }))}
                         className="flex flex-col items-center justify-center gap-1.5 p-2 bg-primary/5 text-primary hover:bg-primary hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-primary/10"
                         title="Edit Name"
                       >
                          <User className="w-4 h-4" /> <span>{t('chats.name') || 'Name'}</span>
                       </button>
                       {user?.role !== 'agent' && (
                         <button 
                           onClick={async () => {
                              if (await showConfirm({
                                  title: t('chats.block'),
                                  message: t('chats.blockConfirm'),
                                  type: 'danger',
                                  confirmText: t('chats.block')
                              })) {
                                  await showAlert({ title: t('modal.success'), message: t('chats.blockSuccess'), type: 'success' });
                              }
                           }}
                           className="flex flex-col items-center justify-center gap-1.5 p-2 bg-red-500/5 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/10"
                           title="Block Contact"
                         >
                           <ShieldCheck className="w-4 h-4" /> <span>{t('chats.block') || 'Block'}</span>
                         </button>
                       )}
                       <button 
                         onClick={() => {
                            const chatData = JSON.stringify({ contact: selectedChat, messages: messages }, null, 2);
                            const blob = new Blob([chatData], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `chat-${formatJid(selectedChat.chatId)}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                         }}
                         className="flex flex-col items-center justify-center gap-1.5 p-2 bg-blue-500/5 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-blue-500/10"
                         title="Export History"
                       >
                          <RefreshCw className="w-4 h-4" /> <span>{t('chats.export') || 'Export'}</span>
                       </button>
                    </div>
                )}
           </div>

           {/* Assignment Controls */}
           <div className="p-4 space-y-4">
              <button 
                onClick={() => setShowHandoverModal(true)}
                className="w-full py-3 bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-primary/10 flex items-center justify-center gap-2 group"
              >
                <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" /> {t('chats.handover') || 'Handover'}
              </button>
              
              <div className="grid grid-cols-1 gap-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t('chats.control') || 'Control'}</label>
                    <div className="p-1 rounded-xl bg-muted/30 border border-border flex items-center">
                       <button 
                          onClick={handleRelease}
                          className={clsx(
                             "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider",
                             !selectedChat.humanTakeover ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                          )}
                       >
                          <Bot className="w-3.5 h-3.5" /> {t('chats.ai')}
                       </button>
                       <button 
                          onClick={handleTakeover}
                          className={clsx(
                             "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider",
                             selectedChat.humanTakeover ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                          )}
                       >
                          <User className="w-3.5 h-3.5" /> {t('chats.human')}
                       </button>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t('chats.status')}</label>
                    {String(selectedChat.assignedAgentId) === String(user.id) ? (
                       <div className="flex items-center justify-between p-2.5 bg-green-500/5 border border-green-500/10 rounded-xl">
                          <span className="text-[10px] font-bold text-green-600">{t('chats.assignedToMe') || 'Assigned to me'}</span>
                          <button onClick={handleRelease} className="text-[9px] font-black uppercase text-red-500 hover:underline">{t('chats.release') || 'Release'}</button>
                       </div>
                    ) : (
                       <button onClick={handleTakeover} className="w-full py-2.5 bg-primary text-primary-foreground text-[10px] font-black rounded-xl shadow-lg shadow-primary/10 hover:opacity-90 uppercase tracking-widest">
                          {t('chats.takeControl') || 'Take Control'}
                       </button>
                    )}
                 </div>
              </div>
           </div>

           {/* Settings */}
           <div className="px-4 py-4 space-y-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">{t('chats.status')}</label>
                    <select 
                       value={selectedChat.status || 'open'}
                       onChange={(e) => handleUpdateSettings({ status: e.target.value })}
                       className="w-full p-2 rounded-lg bg-muted/50 border border-border text-foreground font-bold text-[11px] outline-none transition-all appearance-none"
                    >
                       <option value="open">🟢 Open</option>
                       <option value="pending">🟡 Pending</option>
                       <option value="resolved">🔵 Resolved</option>
                       <option value="closed">⚫ Closed</option>
                    </select>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">{t('chats.priority')}</label>
                    <div className="flex gap-1">
                       {['low', 'normal', 'high', 'urgent'].map(p => (
                          <button
                            key={p}
                            onClick={() => handleUpdateSettings({ priority: p })}
                            className={clsx(
                              "flex-1 py-2 text-[8px] font-black uppercase tracking-tighter rounded-lg border transition-all",
                              selectedChat.priority === p 
                                ? "bg-primary text-primary-foreground border-transparent shadow-sm" 
                                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                            )}
                            title={p}
                          >
                            {p[0]}
                          </button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           {/* AI Controls & Labels */}
           <div className="px-4 py-4 border-t border-border grid grid-cols-2 gap-4">
              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t('chats.aiControls') || 'AI Controls'}</label>
                 <div className="flex flex-col gap-1.5">
                    <Link to={`/app/devices/${deviceId}/ai-settings`} className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-lg text-[9px] font-black uppercase border border-border hover:bg-accent transition-all">
                       <Brain className="w-3 h-3 text-primary" /> Settings
                    </Link>
                    <button onClick={handleClearMemory} className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-lg text-[9px] font-black uppercase border border-border hover:bg-accent transition-all text-amber-600">
                       <RefreshCw className="w-3 h-3" /> Reset
                    </button>
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">{t('chats.labels')}</label>
                 <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {parseLabels(selectedChat.labels).map((label, i) => (
                       <span key={i} className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded-md border border-indigo-100 flex items-center gap-1">
                          {label} <X onClick={() => removeLabel(label)} className="w-2.5 h-2.5 cursor-pointer" />
                       </span>
                    ))}
                    <div className="relative w-full">
                       <input 
                         placeholder="+"
                         value={newLabelText}
                         onChange={e => setNewLabelText(e.target.value)}
                         onKeyDown={handleAddLabel}
                         className="w-full px-2 py-1 bg-muted/50 border border-border rounded-md text-[9px] font-bold outline-none"
                       />
                    </div>
                 </div>
              </div>
           </div>

           {/* Notes */}
           <div className="px-4 py-4 border-t border-border bg-muted/10">
              <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-2 block">{t('chats.notes') || 'Internal Notes'}</label>
              <textarea 
                className="w-full h-20 p-3 rounded-lg bg-card border border-border text-[11px] font-medium focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                placeholder="Add context..."
                defaultValue={selectedChat.notes || ''}
                onBlur={(e) => handleUpdateSettings({ notes: e.target.value })}
              />
           </div>

       </div>
    </div>
  );
};
