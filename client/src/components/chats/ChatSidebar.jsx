import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Smartphone, ChevronDown, Plus, Globe, Sun, Moon, X, Search, MessageSquare 
} from "lucide-react";
import clsx from "clsx";
import { ChatList } from "./ChatList";
import { NewChatDialog } from "./NewChatDialog";

export const ChatSidebar = ({
  chats,
  loadingChats,
  selectedChat,
  setSelectedChat,
  handleDeleteChat,
  filter,
  setFilter,
  searchQuery,
  setSearchQuery,
  user,
  device,
  allDevices,
  t,
  language,
  changeLanguage,
  toggleTheme,
  isDark,
  showNewChatModal,
  setShowNewChatModal,
  handleNewChat,
  enterToSend,
  uploading
}) => {
  const navigate = useNavigate();
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);

  const TABS = [
    { id: 'all', label: t('chats.all') },
    { id: 'unassigned', label: t('chats.queued') },
    { id: 'open', label: t('chats.active') },
    { id: 'pending', label: t('chats.pending') },
    { id: 'urgent', label: t('chats.urgent') },
    { id: 'human', label: t('chats.mine') }
  ];

  return (
      <div className={clsx(
        "w-full md:w-[380px] max-w-full flex flex-col border-r border-border bg-card overflow-hidden shrink-0 transition-all duration-300 relative",
        selectedChat ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="h-16 md:h-20 px-4 md:px-6 border-b border-border flex items-center justify-between bg-card z-30 shrink-0">
           <div className="relative">
              <button 
                onClick={() => setShowDeviceDropdown(!showDeviceDropdown)}
                className="flex items-center gap-3 hover:bg-muted/50 p-2 -ml-2 rounded-2xl transition-all group"
              >
                 <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-6 h-6" />
                 </div>
                 <div className="text-left">
                    <div className="flex items-center gap-1">
                       <h2 className="font-black text-sm tracking-tight text-foreground uppercase truncate max-w-[120px]">
                          {device?.name || device?.sessionId || "Select Device"}
                       </h2>
                       <ChevronDown className={clsx("w-4 h-4 text-muted-foreground transition-transform duration-300", showDeviceDropdown && "rotate-180")} />
                    </div>
                    <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">{device?.status || 'Active'}</p>
                 </div>
              </button>

              {showDeviceDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDeviceDropdown(false)}></div>
                  <div className="absolute top-full left-0 mt-2 w-72 bg-card border border-border rounded-3xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                     <div className="p-4 bg-muted/30 border-b border-border">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">Switch Inbox</p>
                     </div>
                     <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
                        {allDevices.map(d => (
                          <button
                            key={d.id}
                            onClick={() => {
                               navigate(`/devices/${d.id}/chats`);
                               setShowDeviceDropdown(false);
                            }}
                            className={clsx(
                              "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left",
                              String(d.id) === String(device?.id) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted text-foreground"
                            )}
                          >
                             <div className={clsx(
                               "w-8 h-8 rounded-lg flex items-center justify-center",
                               String(d.id) === String(device?.id) ? "bg-white/20" : "bg-muted"
                             )}>
                                <Smartphone className="w-4 h-4" />
                             </div>
                             <div className="min-w-0">
                                <p className="font-bold text-xs truncate">{d.name || d.sessionId}</p>
                                <p className={clsx(
                                  "text-[9px] font-black uppercase tracking-tighter opacity-70",
                                  d.status === 'connected' ? (String(d.id) === String(device?.id) ? "text-white" : "text-green-500") : "text-red-500"
                                )}>{d.status}</p>
                             </div>
                          </button>
                        ))}
                        <Link 
                          to="/devices" 
                          className="flex items-center gap-3 p-3 mt-1 rounded-2xl hover:bg-muted text-primary transition-all text-left"
                        >
                           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Plus className="w-4 h-4" />
                           </div>
                           <p className="font-black text-[10px] uppercase tracking-widest">{t('devices.connectNew')}</p>
                        </Link>
                     </div>
                  </div>
                </>
              )}
           </div>
           
            <div className="flex gap-1 shrink-0">
                <button 
                  onClick={() => setShowNewChatModal(true)}
                  className="p-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center shrink-0"
                  title={t('chats.newChat') || "New Chat"}
                >
                  <Plus className="w-5 h-5"/>
                </button>
               <button 
                 onClick={() => changeLanguage(language === 'en' ? 'id' : 'en')}
                className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors flex items-center gap-1.5"
                title={language === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
              >
                <Globe className="w-5 h-5"/>
                <span className="text-xs font-bold uppercase hidden sm:inline">{language}</span>
              </button>
              <button onClick={toggleTheme} className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
                 {isDark ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors focus:text-destructive"
                title="Exit Chat"
              >
                <X className="w-5 h-5"/>
              </button>
           </div>
        </div>
        
        {/* Filter & Search */}
        <div className="p-3 md:p-4 space-y-3 md:space-y-4 border-b border-border bg-card shrink-0 overflow-hidden">
           <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar w-full min-w-0">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all",
                    filter === tab.id 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                      : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tab.label}
                </button>
              ))}
           </div>
           <div className="relative">
             <input 
               type="text" 
               placeholder="Search conversations..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-muted/30 border border-border focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-foreground transition-all" 
             />
             <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
           </div>
        </div>

        <ChatList 
          chats={chats} 
          loading={loadingChats} 
          selectedChatId={selectedChat?.id || selectedChat?.chatId} 
          onSelect={setSelectedChat}
          onDelete={handleDeleteChat}
          filter={filter}
          searchQuery={searchQuery}
          currentUserId={user?.id}
          t={t}
        />


        <NewChatDialog 
          show={showNewChatModal} 
          onClose={() => setShowNewChatModal(false)}
          onSend={handleNewChat}
          enterToSend={enterToSend}
          uploading={uploading}
          t={t}
        />
      </div>
  );
};
