import React from "react";
import { 
  ChevronLeft, AlertCircle, Bot, User, Trash2, Search, Info, X, 
  Loader2, Paperclip, ShoppingBag, Send, Plus, Image, Package 
} from "lucide-react";
import clsx from "clsx";
import { MessageBubble } from "./MessageBubble";
import { formatJid } from "../../utils/chatUtils";

export const ChatWindow = ({
  selectedChat,
  setSelectedChat,
  messages,
  user,
  messageText,
  setMessageText,
  onSendMessage,
  fileInputRef,
  handleFileSelect,
  uploading,
  products,
  setShowProductModal,
  showInfoPanel,
  setShowInfoPanel,
  handleRelease,
  handleTakeover,
  handleDeleteChat,
  showMessageSearch,
  setShowMessageSearch,
  messageSearchQuery,
  setMessageSearchQuery,
  setViewImage,
  scrollRef,
  enterToSend,
  toggleEnterToSend,
  t
}) => {
  if (!selectedChat) {
    return (
      <div className={clsx(
        "flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a] relative overlay-pattern transition-colors duration-300",
        "hidden md:flex"
      )}>
         <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
            <div className="w-72 h-72 bg-card/50 backdrop-blur-3xl rounded-[4rem] mb-12 flex items-center justify-center border border-white/10 shadow-2xl relative group overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-600/10 opacity-50 group-hover:opacity-100 transition-opacity" />
               <Bot className="w-40 h-40 text-primary opacity-20 group-hover:scale-110 transition-transform duration-700" />
            </div>
            <h2 className="text-4xl font-black text-foreground mb-4 tracking-tight">{t('chats.selectChat')}</h2>
            <p className="text-muted-foreground max-w-sm text-lg leading-relaxed font-medium">
              {t('chats.selectChatSubtitle')}
            </p>
         </div>
      </div>
    );
  }

  const filteredMessages = messages.filter(msg => {
     if (!messageSearchQuery) return true;
     const content = msg.content || 
                   msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.imageMessage?.caption || 
                   "";
     return content.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  const textareaRef = React.useRef(null);
  const [showAttachMenu, setShowAttachMenu] = React.useState(false);

  React.useEffect(() => {
     if (!messageText && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
     }
  }, [messageText]);

  return (
      <div className={clsx(
        "flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a] relative overlay-pattern transition-colors duration-300",
        showInfoPanel ? "hidden md:flex" : "flex"
      )}>
          {/* Header */}
          <div className="h-16 px-4 md:px-6 flex items-center justify-between bg-card/80 backdrop-blur-md border-b border-border flex-shrink-0 z-20 shadow-sm transition-all duration-300">
             <div className="flex items-center gap-1 md:gap-2 p-1.5 rounded-xl transition-colors group">
                {/* Mobile Back Button */}
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </button>

                <div className="flex items-center cursor-pointer" onClick={() => setShowInfoPanel(true)}>
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold mr-3 shadow-md group-hover:scale-105 transition-transform">
                      {(selectedChat.name || "?").substring(0, 2).toUpperCase()}
                   </div>
                   <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-[16px] leading-tight flex items-center gap-2">
                        {selectedChat.contactName || selectedChat.name || formatJid(selectedChat.chatId)}
                        {selectedChat.status === 'urgent' && <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse" />}
                      </h3>
                      <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        {selectedChat.phoneNumber || formatJid(selectedChat.chatId)}
                      </p>
                   </div>
                </div>
             </div>
             
             <div className="flex items-center gap-1 md:gap-2">
                {/* AI/Human Toggle */}
                <div className="hidden sm:flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border">
                   <button 
                      onClick={handleRelease}
                      className={clsx(
                         "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider",
                         !selectedChat.humanTakeover 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "text-muted-foreground hover:text-foreground"
                      )}
                   >
                      <Bot className="w-3.5 h-3.5" />
                       <span className="hidden lg:inline">{t('chats.ai')}</span>
                    </button>
                    <button 
                       onClick={handleTakeover}
                       className={clsx(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider",
                          selectedChat.humanTakeover 
                             ? "bg-primary text-primary-foreground shadow-sm" 
                             : "text-muted-foreground hover:text-foreground"
                       )}
                    >
                       <User className="w-3.5 h-3.5" />
                       <span className="hidden lg:inline">{t('chats.human')}</span>
                    </button>
                </div>

                {/* Delete Chat Button */}
                <button 
                  onClick={() => handleDeleteChat(null)}
                  className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                  title={t('chats.deleteChat')}
                >
                  <Trash2 className="w-5 h-5"/>
                </button>

                <button 
                  onClick={() => setShowMessageSearch(!showMessageSearch)}
                  className={clsx(
                    "hidden sm:block p-2.5 rounded-xl transition-all",
                    showMessageSearch ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={t('chats.searchInConversation')}
                >
                  <Search className="w-5 h-5"/>
                </button>
                <button 
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={clsx(
                    "p-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm",
                    showInfoPanel ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Info className="w-5 h-5"/>
                  <span className="hidden sm:inline">{t('chats.details')}</span>
                </button>
             </div>
          </div>

          {/* Message Search Bar */}
          {showMessageSearch && (
            <div className="px-4 py-2 border-b border-border bg-muted/20 animate-in slide-in-from-top duration-200">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  placeholder={t('chats.searchMessages') || "Search messages..."}
                  className="w-full pl-10 pr-10 py-2 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                />
                {messageSearchQuery && (
                  <button
                    onClick={() => setMessageSearchQuery("")}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 z-0 custom-scrollbar flex flex-col">
             <div className="flex-1" /> {/* Push messages to bottom */}
             {filteredMessages.length === 0 && messageSearchQuery ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground animate-in fade-in duration-500">
                   <Search className="w-12 h-12 mb-4 opacity-10" />
                   <p className="text-sm font-medium">{t('chats.noMessagesMatch') || 'No messages match your search'}</p>
                   <button 
                     onClick={() => setMessageSearchQuery("")}
                     className="mt-2 text-xs text-primary hover:underline font-bold"
                   >
                     {t('chats.clearSearch') || 'Clear search'}
                   </button>
                </div>
             ) : (
               filteredMessages.map((msg, i) => (
                  <MessageBubble key={msg.key?.id || msg.id || i} msg={msg} isMe={msg.key?.fromMe ?? msg.fromMe} onViewImage={setViewImage} />
                ))
             )}
             <div ref={scrollRef} className="h-2" />
          </div>

         {/* Input Area */}
         <div className="p-3 md:p-4 bg-card/80 backdrop-blur-md border-t border-border z-10">
            <div className="max-w-4xl mx-auto flex gap-2 md:gap-3 items-end">
               <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileSelect}
               />
               {/* Mobile Attachment Menu (Plus Icon) */}
               <div className="relative md:hidden flex-shrink-0">
                  <button
                    onClick={() => setShowAttachMenu(!showAttachMenu)}
                    className={clsx(
                      "w-12 h-12 flex items-center justify-center rounded-2xl transition-all",
                      showAttachMenu ? "bg-primary text-primary-foreground rotate-45 shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                     <Plus className="w-6 h-6" />
                  </button>

                  {showAttachMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAttachMenu(false)} />
                      <div className="absolute bottom-full left-0 mb-4 w-48 bg-card border border-border rounded-3xl shadow-2xl p-2 z-50 animate-in slide-in-from-bottom-4 duration-300">
                         <button
                           onClick={() => {
                             fileInputRef.current?.click();
                             setShowAttachMenu(false);
                           }}
                           className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all text-sm font-bold"
                         >
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                               <Image className="w-4 h-4" />
                            </div>
                            {t('chats.sendImage')}
                         </button>
                         {products.length > 0 && (
                           <button
                             onClick={() => {
                               setShowProductModal(true);
                               setShowAttachMenu(false);
                             }}
                             className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted transition-all text-sm font-bold"
                           >
                              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                 <ShoppingBag className="w-4 h-4" />
                              </div>
                              {t('chats.sendProduct')}
                           </button>
                         )}
                      </div>
                    </>
                  )}
               </div>

               {/* Desktop Attachment Buttons */}
               <div className="hidden md:flex gap-2 shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-14 h-14 flex items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                    title={t('chats.sendImage')}
                  >
                     {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                  </button>

                  {products.length > 0 && (
                    <button
                      onClick={() => setShowProductModal(true)}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                      title={t('chats.sendProduct')}
                    >
                      <ShoppingBag className="w-6 h-6" />
                    </button>
                  )}
               </div>

                <div className="flex-1 bg-muted/30 rounded-2xl flex flex-col min-h-[48px] md:min-h-[52px] border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all px-2 md:px-4 group shadow-sm">
                   <textarea 
                      ref={textareaRef}
                      className="w-full bg-transparent py-3 text-[14px] md:text-[15px] text-foreground placeholder:text-muted-foreground outline-none resize-none custom-scrollbar max-h-48"
                      placeholder={t('chats.typeMessage')}
                      rows={1}
                      value={messageText}
                      onChange={e => {
                         setMessageText(e.target.value);
                         e.target.style.height = 'auto';
                         e.target.style.height = `${Math.min(e.target.scrollHeight, 192)}px`;
                      }}
                      onKeyDown={e => {
                         if (e.key === 'Enter') {
                            if (e.shiftKey) {
                               // Allow new line on Shift+Enter regardless of toggle
                               return;
                            }
                            
                            if (enterToSend) {
                               e.preventDefault();
                               if (messageText.trim()) {
                                  onSendMessage(e);
                               }
                            }
                         }
                      }}
                      autoFocus
                   />
                   
                   {/* Toggle Row */}
                   <div className="flex items-center justify-end px-1 pb-1.5 opacity-0 group-focus-within:opacity-100 transition-opacity">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                         <input 
                            type="checkbox" 
                            checked={enterToSend}
                            onChange={toggleEnterToSend}
                            className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-primary/20 transition-all"
                         />
                         <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Enter to send</span>
                      </label>
                   </div>
                </div>
               <button 
                 disabled={!messageText.trim()}
                 onClick={onSendMessage}
                 className={clsx(
                   "w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90 shadow-lg relative group overflow-hidden",
                   messageText.trim() 
                     ? "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-primary/40" 
                     : "bg-muted text-muted-foreground cursor-not-allowed opacity-50 shadow-none"
                 )}
                 title={t('chats.sendMessage')}
               >
                 <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                 <Send className={clsx(
                   "w-4.5 h-4.5 md:w-6 h-6 transition-all duration-300",
                   messageText.trim() ? "translate-x-0.5 -translate-y-0.5 group-hover:translate-x-1.5 group-hover:-translate-y-1.5 rotate-[-15deg] group-hover:rotate-0" : ""
                 )} />
               </button>
            </div>
         </div>
      </div>
  );
};
