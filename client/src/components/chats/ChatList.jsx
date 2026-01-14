import React from "react";
import { Loader2, Trash2, User, Bot, TrendingUp, Flame } from "lucide-react";
import clsx from "clsx";
import { parseLabels, formatJid } from "../../utils/chatUtils";

export const ChatList = ({ 
  chats, 
  selectedChatId, 
  onSelect, 
  onDelete, 
  loading, 
  filter, 
  currentUserId, 
  searchQuery, 
  userRole,
  t 
}) => {
  if (loading) return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <Loader2 className="animate-spin w-6 h-6 mr-2"/> {t('loading')}
    </div>
  );

  const filteredChats = chats.filter(chat => {
    // Search query filter
    const searchMatch = !searchQuery || 
      (chat.contactName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (chat.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (chat.phoneNumber?.includes(searchQuery)) ||
      (chat.chatId?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!searchMatch) return false;

    // Tab filters
    if (filter === 'all') return true;
    if (filter === 'unassigned') return !chat.assignedAgentId;
    if (filter === 'human') return String(chat.assignedAgentId) === String(currentUserId);
    return chat.status === filter;
  });

  if (!filteredChats.length) return (
    <div className="p-8 text-center text-muted-foreground text-sm">
      {t('chats.noChatsFound')} {filter !== 'all' && `(${filter})`}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {filteredChats.map(chat => {
        const isSelected = String(selectedChatId) === String(chat.id) || selectedChatId === chat.chatId;
        return (
          <div 
            key={chat.id} 
            className={clsx(
              "p-3 flex items-center border-b border-border transition-all relative hover:bg-muted/50 group",
              isSelected ? "bg-muted shadow-inner" : "bg-card"
            )}
          >
            {/* Delete Button - Top Right Corner */}
            {userRole !== 'agent' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat);
                }}
                className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/10 hover:bg-destructive/20 text-destructive z-10"
                title="Delete chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            <div 
              onClick={() => onSelect(chat)}
              className="flex items-center flex-1 cursor-pointer min-w-0"
            >
              <div className="relative flex-shrink-0 mr-3">
                {chat.profilePictureUrl ? (
                  <img 
                    src={chat.profilePictureUrl} 
                    alt={chat.name} 
                    className="w-12 h-12 rounded-2xl object-cover border border-border"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {(chat.contactName || chat.name || "?").substring(0, 1).toUpperCase()}
                  </div>
                )}
                <div className={clsx(
                  "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card",
                  chat.status === 'open' ? "bg-green-500" : 
                  chat.status === 'pending' ? "bg-yellow-500" :
                  chat.status === 'resolved' ? "bg-blue-500" : "bg-muted-foreground"
                )} />
              </div>
              
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                       <h3 className={clsx(
                         "truncate text-[15px] flex-1 min-w-0",
                         chat.unreadCount > 0 ? "font-black text-foreground" : "font-bold text-foreground"
                       )}>
                         {chat.contactName || chat.name || chat.phoneNumber || formatJid(chat.chatId)}
                       </h3>
                       {chat.unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0"></span>}
                    </div>
                    
                    <p className={clsx(
                      "text-xs truncate mb-1",
                      chat.unreadCount > 0 ? "text-foreground font-semibold" : "text-muted-foreground"
                    )}>
                       {chat.lastMessageContent || chat.lastMessage || "No messages"}
                    </p>

                    <div className="flex flex-wrap gap-1 items-center">
                        {chat.unreadCount > 0 && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded font-black uppercase tracking-tighter shadow-sm shadow-blue-500/20">{t('chats.new')}</span>}
                        {chat.priority === 'urgent' && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded font-black uppercase tracking-tighter shadow-sm shadow-red-500/20">{t('chats.urgent')}</span>}
                        {chat.priority === 'high' && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[9px] rounded font-black uppercase tracking-tighter">{t('chats.high')}</span>}
                        
                        {/* Purchase Intent Score Badge */}
                        {chat.purchaseIntentScore > 0 && (
                          <span 
                            className={clsx(
                              "px-1.5 py-0.5 text-[9px] rounded font-bold flex items-center gap-1",
                              chat.purchaseIntentStage === 'closing' && "bg-gradient-to-r from-red-500 to-orange-500 text-white animate-pulse shadow-md shadow-red-500/30",
                              chat.purchaseIntentStage === 'hot' && "bg-gradient-to-r from-orange-400 to-yellow-400 text-white",
                              chat.purchaseIntentStage === 'interested' && "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-500/30",
                              chat.purchaseIntentStage === 'curious' && "bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30",
                              chat.purchaseIntentStage === 'cold' && "bg-gray-500/20 text-gray-600 dark:text-gray-400 border border-gray-500/30"
                            )}
                            title={`Intent Score: ${chat.purchaseIntentScore}% | Stage: ${chat.purchaseIntentStage || 'cold'}`}
                          >
                            {(chat.purchaseIntentStage === 'hot' || chat.purchaseIntentStage === 'closing') && (
                              <Flame className="w-2.5 h-2.5" />
                            )}
                            {chat.purchaseIntentStage === 'interested' && (
                              <TrendingUp className="w-2.5 h-2.5" />
                            )}
                            {chat.purchaseIntentScore}%
                          </span>
                        )}

                        {/* AI / Agent Status Indicator */}
                        {chat.humanTakeover ? (
                          <span className="px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[9px] rounded font-bold border border-purple-500/20 flex items-center gap-1 uppercase tracking-wider">
                            <User className="w-2.5 h-2.5" />
                            {t('chats.human')}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-teal-500/10 text-teal-600 dark:text-teal-400 text-[9px] rounded font-bold border border-teal-500/20 flex items-center gap-1 uppercase tracking-wider">
                            <Bot className="w-2.5 h-2.5" />
                            {t('chats.ai')}
                          </span>
                        )}

                        {chat.assignedAgentName && (
                          <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] rounded font-bold border border-blue-500/20 max-w-[80px] truncate">
                            👤 {String(chat.assignedAgentId) === String(currentUserId) ? t('chats.me') : chat.assignedAgentName}
                          </span>
                        )}
                        {parseLabels(chat.labels).filter(l => !['cold-lead', 'curious-lead', 'interested-lead', 'hot-lead', 'closing-deal'].includes(l)).map((l, i) => {
                          return (
                            <span 
                              key={i} 
                              className="px-1.5 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider border flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                            >
                              {l.replace('-', ' ')}
                            </span>
                          );
                        })}
                    </div>
                 </div>

                 {/* Metadata Column (Time & Unread) */}
                 <div className="flex flex-col items-end gap-1.5 shrink-0 min-w-[56px] self-start pt-1">
                    <span className="text-[10px] text-muted-foreground font-bold whitespace-nowrap bg-muted/50 px-1.5 py-0.5 rounded text-right">
                      {chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                       chat.conversationTimestamp ? new Date(chat.conversationTimestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                    
                    {chat.unreadCount > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                        {chat.unreadCount}
                      </span>
                    )}
                 </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
