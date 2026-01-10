import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useSearchParams, useParams, useNavigate, Link } from "react-router-dom";
import { 
  Send, Search, Loader2, MoreVertical, Phone, 
  Info, X, Bot, User, UserPlus, CheckCheck, Plus, Sun, Moon,
  Smartphone, AlertCircle, ChevronLeft, Brain, RefreshCw, Paperclip, Trash2, ShoppingBag,
  Package, ChevronDown, ArrowRight, ShieldCheck
} from "lucide-react";
import clsx from "clsx";

// --- Helpers ---
const parseLabels = (labelsJson) => {
  try {
    if (!labelsJson) return [];
    return typeof labelsJson === 'string' ? JSON.parse(labelsJson) : labelsJson;
  } catch (e) {
    return [];
  }
};

const formatJid = (jid) => {
  if (!jid) return "";
  return jid.split("@")[0];
};

// --- Sub-Components ---

const ChatList = ({ chats, selectedChatId, onSelect, onDelete, loading, filter, currentUserId, searchQuery }) => {
  if (loading) return (
    <div className="flex items-center justify-center p-8 text-muted-foreground">
      <Loader2 className="animate-spin w-6 h-6 mr-2"/> Loading...
    </div>
  );

  const filteredChats = chats.filter(chat => {
    // Search query filter
    const searchMatch = !searchQuery || 
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
      No {filter} chats found
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {filteredChats.map(chat => {
        const isSelected = String(selectedChatId) === String(chat.id) || selectedChatId === chat.chatId;
        const statusIcons = { open: '🟢', pending: '🟡', resolved: '🔵', closed: '⚫' };
        return (
          <div 
            key={chat.id} 
            className={clsx(
              "p-3 flex items-center border-b border-border transition-all relative hover:bg-muted/50 group",
              isSelected ? "bg-muted shadow-inner" : "bg-card"
            )}
          >
            {/* Delete Button - Top Right Corner */}
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
                        <span className="text-[10px]" title={chat.status}>{statusIcons[chat.status] || '🟢'}</span>
                        {chat.unreadCount > 0 && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] rounded font-black uppercase tracking-tighter shadow-sm shadow-blue-500/20">New</span>}
                        {chat.priority === 'urgent' && <span className="px-1.5 py-0.5 bg-red-500 text-white text-[9px] rounded font-black uppercase tracking-tighter shadow-sm shadow-red-500/20">Urgent</span>}
                        {chat.priority === 'high' && <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[9px] rounded font-black uppercase tracking-tighter">High</span>}
                        {chat.assignedAgentName && (
                          <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] rounded font-bold border border-blue-500/20 max-w-[80px] truncate">
                            👤 {String(chat.assignedAgentId) === String(currentUserId) ? 'Me' : chat.assignedAgentName}
                          </span>
                        )}
                        {parseLabels(chat.labels).map((l, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] rounded font-medium border border-indigo-500/20">
                            {l}
                          </span>
                        ))}
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

const MessageBubble = ({ msg, isMe, onViewImage }) => {
  const isImage = msg.messageType === 'image' || !!msg.message?.imageMessage;
  const mediaUrl = msg.mediaUrl || msg.filePath; // Support both DB fields if different
  const thumbnail = msg.message?.imageMessage?.jpegThumbnail;
  const contentText = msg.content || msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  const caption = msg.caption || msg.message?.imageMessage?.caption || (contentText !== "[Image]" ? contentText : null);

  const date = new Date((msg.messageTimestamp ? msg.messageTimestamp * 1000 : msg.timestamp) || Date.now());
  const isAi = msg.isAiGenerated || msg.rawMessage?.isAiGenerated;
  const senderName = isMe 
    ? (msg.agentName || (isAi ? "AI Assistant" : "System")) 
    : (msg.pushName || msg.senderName);

  // Function to render image source
  // Function to render image source
  const renderImage = () => {
      if (mediaUrl) return <img src={mediaUrl} alt="Chat Media" className="rounded-lg mb-2 max-w-[280px] h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm" onClick={() => onViewImage && onViewImage(mediaUrl)} />;
      if (thumbnail) {
          // Identify if it's already base64 or a buffer array
          const src = typeof thumbnail === 'string' 
              ? `data:image/jpeg;base64,${thumbnail}` 
              : `data:image/jpeg;base64,${Buffer.from(thumbnail).toString('base64')}`;
          return <img src={src} alt="Preview" className="rounded-lg mb-2 max-w-[280px] h-auto object-cover blur-[2px] hover:blur-none transition-all shadow-sm cursor-pointer" onClick={() => onViewImage && onViewImage(src)} />;
      }
      return isImage ? <div className="bg-gray-200 dark:bg-gray-700 h-32 w-48 rounded-lg mb-2 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading Image...</div> : null;
  };

  return (
    <div className={clsx("flex mb-3 group animate-in fade-in slide-in-from-bottom-2 duration-300", isMe ? "justify-end" : "justify-start")}>
       <div className={clsx(
         "max-w-[85%] md:max-w-[75%] px-3 py-2 rounded-2xl shadow-sm relative text-[13.5px] leading-relaxed transition-all",
         isMe ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-gray-100" 
              : "bg-card text-gray-900 dark:text-gray-100 border border-border/50",
         isMe ? "rounded-tr-none" : "rounded-tl-none",
         isAi && !isMe && "border-2 border-purple-500 shadow-lg shadow-purple-500/10 !bg-purple-50 dark:!bg-[#3d1f5c]/40"
       )}>
          {/* Sender/Agent Name */}
          {senderName && (
            <div className={clsx(
              "text-[10px] font-black uppercase tracking-widest mb-1 opacity-70",
              isMe ? "text-primary dark:text-emerald-400" : "text-indigo-500 dark:text-indigo-400"
            )}>
              {isMe ? `👤 Agent: ${senderName}` : senderName}
            </div>
          )}

          {isAi && (
            <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-purple-500/20 text-purple-600 dark:text-purple-300 font-black text-[10px] uppercase tracking-widest">
              <Bot className="w-3.5 h-3.5" /> AI Response
            </div>
          )}
          
          {isImage && renderImage()}
          {caption && <div className="whitespace-pre-wrap font-medium">{caption}</div>}
          
          <div className={clsx(
            "text-[9px] mt-1 text-right flex items-center justify-end gap-1 opacity-60 font-black uppercase tracking-tighter",
             isMe ? "text-gray-600 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"
          )}>
             {date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
             {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />} 
          </div>
       </div>
    </div>
  );
};

// --- Image Modal ---
const ImageModal = ({ src, onClose }) => {
  if (!src) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
       <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all">
         <X className="w-6 h-6" />
       </button>
       <img 
         src={src} 
         alt="Full View" 
         className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200" 
         onClick={(e) => e.stopPropagation()} 
       />
    </div>
  );
};

// --- Main Component ---
export default function Chats() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // State
  const [chats, setChats] = useState([]);
  const [device, setDevice] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [filter, setFilter] = useState('all'); 
  const [searchQuery, setSearchQuery] = useState("");
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [wsConfig, setWsConfig] = useState(null);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [newLabelText, setNewLabelText] = useState("");
  const [viewImage, setViewImage] = useState(null);
  const [showDeviceDropdown, setShowDeviceDropdown] = useState(false);
  
  // Image Preview & Send State
  const [imagePreview, setImagePreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  // Product Selection State
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [productPreview, setProductPreview] = useState(null);

  // Handover State
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [agents, setAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [handoverNotes, setHandoverNotes] = useState("");
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [allDevices, setAllDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const fileInputRef = useRef(null);

  const fetchAllDevices = async () => {
    try {
      setLoadingDevices(true);
      const res = await axios.get("/api/whatsapp/devices", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setAllDevices(res.data.sessions || []);
    } catch (err) {
      console.error("Failed to fetch devices:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  useEffect(() => {
    fetchAllDevices();
  }, []);

  const handleFileSelect = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setPreviewFile(file);
      setImagePreview(URL.createObjectURL(file));
      e.target.value = null; // Reset input
  };

  const handleSendImage = async () => {
    if (!previewFile || !selectedChat || !device) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("sessionId", device.sessionId);
    formData.append("recipient", selectedChat.chatId);
    formData.append("file", previewFile);
    formData.append("caption", caption);
    formData.append("agentId", String(user.id));
    formData.append("agentName", user.name);
    
    try {
      // 1. Upload & Send via API
      const res = await axios.post("/api/whatsapp/send/image", formData, {
        headers: { 
           Authorization: `Bearer ${localStorage.getItem("token")}`,
           "Content-Type": "multipart/form-data" 
        }
      });
      
      const mediaUrl = res.data.mediaUrl;
      
      // 2. Optimistic Update
      setMessages(prev => [...prev, {
         key: { fromMe: true, id: res.data.whatsappMessageId || res.data.messageId || 'temp-' + Date.now() },
         message: { 
             imageMessage: { 
                 caption: caption,
                 jpegThumbnail: null 
             }
         },
         messageType: 'image',
         mediaUrl: mediaUrl,
         caption: caption,
         timestamp: Date.now() / 1000,
         agentName: user.name
      }]);
      
      // 3. Cleanup
      closePreview();
      scrollToBottom();
      
    } catch (err) {
       console.error(err);
       alert("Failed to send image");
    } finally {
       setUploading(false);
    }
  };

  const closePreview = () => {
      setImagePreview(null);
      setPreviewFile(null);
      setCaption("");
      setProductPreview(null);
  };

  const handleSelectProduct = (product) => {
    if (!product) return;
    
    // Format product message
    const productMessage = `🛍️ *${product.name}*\n\n` +
      `💰 Price: ${product.currency || 'IDR'} ${product.price}\n` +
      `${product.description ? `\n📝 ${product.description}\n` : ''}` +
      `${product.inStock ? '\n✅ In Stock' : '\n❌ Out of Stock'}`;

    setProductPreview({
      product,
      message: productMessage
    });
    setShowProductModal(false);
  };

  const handleSendProduct = async () => {
    if (!selectedChat || !productPreview || !device) return;
    
    setUploading(true);
    const productImageUrl = productPreview.product.images?.[0] || productPreview.product.imageUrl;
    
    try {
      const res = await axios.post(
        `/api/whatsapp/send`,
        {
          sessionId: device.sessionId,
          recipient: selectedChat.chatId,
          message: productPreview.message,
          imageUrl: productImageUrl,
          agentId: String(user.id),
          agentName: user.name
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
      );

      // Add to messages optimistically
      setMessages(prev => [...prev, {
        key: { fromMe: true, id: res.data.whatsappMessageId || res.data.messageId || 'temp-' + Date.now() },
        message: productImageUrl ? {
          imageMessage: {
            caption: productPreview.message,
            jpegThumbnail: null
          }
        } : { conversation: productPreview.message },
        messageType: productImageUrl ? 'image' : 'text',
        mediaUrl: productImageUrl,
        caption: productImageUrl ? productPreview.message : null,
        timestamp: Date.now() / 1000,
        agentName: user.name
      }]);

      setProductPreview(null);
      scrollToBottom();
    } catch (err) {
      console.error(err);
      alert("Failed to send product");
    } finally {
      setUploading(false);
    }
  };
  
  const toggleTheme = () => {
      const isDarkNow = document.documentElement.classList.toggle('dark');
      setIsDark(isDarkNow);
      localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
  };

  useEffect(() => {
     setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  
  const params = useParams();
  const deviceId = params.deviceId || searchParams.get("deviceId");
  const initialChatId = params.chatId || searchParams.get("chatId");
  
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const TABS = [
    { id: 'all', label: 'All' },
    { id: 'unassigned', label: 'Queued' },
    { id: 'open', label: 'Active' },
    { id: 'pending', label: 'Pending' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'human', label: 'Mine' }
  ];

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
       scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // 1. Fetch Auth/WS Config
  useEffect(() => {
    axios.get("/api/auth/me", {
       headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => {
       setWsConfig({ token: res.data.wsToken, port: res.data.wsPort });
    });
  }, []);

  // 0. Fetch Device Info
  useEffect(() => {
    if (!deviceId) return;
    axios.get(`/api/whatsapp/devices/${deviceId}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => setDevice(res.data.device));
  }, [deviceId]);

  // Fetch Products from AI Settings
  useEffect(() => {
    if (!deviceId) return;
    axios.get(`/api/whatsapp/devices/${deviceId}/settings/ai`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => {
      // The backend returns it directly in the object for getAISettings
      // and in res.data.settings for updateAISettings
      const productCatalog = res.data.aiProductCatalog || res.data.settings?.aiProductCatalog;
      if (productCatalog?.items) {
        // Migrate legacy formats
        const migratedItems = productCatalog.items.map(item => {
           if (!item) return null;
           const images = Array.isArray(item.images) ? item.images : (item.imageUrl ? [item.imageUrl] : []);
           return { ...item, images };
        }).filter(Boolean);
        setProducts(migratedItems);
      }
    }).catch(err => console.error('Failed to fetch products:', err));
  }, [deviceId]);

  // Fetch agents for handover
  useEffect(() => {
    if (showHandoverModal && agents.length === 0) {
      setLoadingAgents(true);
      axios.get('/api/whatsapp/agents', {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      }).then(res => {
        setAgents(res.data.agents || []);
      }).catch(err => {
        console.error('Failed to fetch agents:', err);
      }).finally(() => {
        setLoadingAgents(false);
      });
    }
  }, [showHandoverModal]);


  // 2. Initialize WebSocket
  useEffect(() => {
     if (!wsConfig || !device?.sessionId) return;
     
     const wsUrl = `ws://${window.location.hostname}:${wsConfig.port}?token=${wsConfig.token}`;
     const ws = new WebSocket(wsUrl);
     wsRef.current = ws;

     ws.onopen = () => {
       ws.send(JSON.stringify({ type: "subscribe", sessionId: device.sessionId }));
     };

     ws.onmessage = (event) => {
       const data = JSON.parse(event.data);
       if (data.type === "message_update") {
           console.log('[WS] Received message_update:', data.data);
           setMessages(prev => prev.map(msg => {
              const msgId = msg.key?.id || msg.messageId;
              if (msgId === data.data.messageId) {
                 console.log('[WS] Updating message with mediaUrl:', msgId, data.data.mediaUrl);
                 return { ...msg, mediaUrl: data.data.mediaUrl };
              }
              return msg;
           }));
       }
       
       if (data.type === "messages.upsert") {
          const newMsgs = data.data.messages;
          if (selectedChat) {
             const relevant = newMsgs.filter(m => m.key.remoteJid === selectedChat.chatId);
              if (relevant.length) {
                  setMessages(prev => {
                    const newMessages = [];
                    // 1. Filter out duplicates based on ID
                    const existingIds = new Set(prev.map(m => m.key?.id || m.messageId));
                    const uniqueNew = relevant.filter(m => !existingIds.has(m.key?.id));
                    
                    // 2. Remove temp messages if real one matches content
                    let cleanedPrev = [...prev];
                    uniqueNew.forEach(newMsg => {
                        if (newMsg.key?.fromMe) {
                           // Handle Text Matching
                           const newText = newMsg.message?.conversation || newMsg.message?.extendedTextMessage?.text;
                           if (newText) {
                               cleanedPrev = cleanedPrev.filter(prevMsg => {
                                   if (prevMsg.key?.id?.startsWith('temp-')) {
                                       const prevText = prevMsg.message?.conversation || prevMsg.content;
                                       return prevText !== newText;
                                   }
                                   return true;
                               });
                           }
                           
                           // Handle Image Matching (remove first found temp image)
                           if (newMsg.message?.imageMessage || newMsg.messageType === 'image') {
                               const matchIndex = cleanedPrev.findIndex(p => 
                                   p.key?.id?.startsWith('temp-') && 
                                   (p.messageType === 'image' || p.message?.imageMessage)
                               );
                               if (matchIndex !== -1) {
                                   cleanedPrev.splice(matchIndex, 1);
                               }
                           }
                        }
                        newMessages.push(newMsg);
                    });
                    
                    return [...cleanedPrev, ...newMessages];
                 });
                scrollToBottom();
              }
          }
          // Also trigger chat list update
          refreshChatList();
       }
     };

     return () => ws.close();
  }, [wsConfig, device?.sessionId, selectedChat, scrollToBottom]);





  const refreshChatList = () => {
    if (!deviceId) return;
    axios.get(`/api/whatsapp/devices/${deviceId}/chats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => setChats(res.data.chats || []));
  };

  // 3. Initial Chat Fetch
  useEffect(() => {
    if (!deviceId) return;
    setLoadingChats(true);
    axios.get(`/api/whatsapp/devices/${deviceId}/chats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => {
       const chatList = res.data.chats || [];
       setChats(chatList);
       if (initialChatId) {
         const found = chatList.find(c => String(c.chatId) === String(initialChatId) || String(c.id) === String(initialChatId));
         if (found) setSelectedChat(found);
       }
    }).finally(() => setLoadingChats(false));
  }, [deviceId, initialChatId]);

  // 4. Fetch Messages and Profile Picture from History
  useEffect(() => {
    if (!selectedChat || !deviceId) return;
    
    // Fetch History
    axios.get(`/api/whatsapp/devices/${deviceId}/chats/${selectedChat.chatId}/history`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => {
       const history = res.data.messages || [];
       setMessages([...history].reverse());
       scrollToBottom();
    });

    // Fetch Profile Picture
    axios.get(`/api/whatsapp/devices/${deviceId}/profile/${selectedChat.chatId}`, {
       headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(res => {
       const newUrl = res.data.profilePictureUrl?.url;
       if (newUrl && newUrl !== selectedChat.profilePictureUrl) {
          // Update local state immediately
          setSelectedChat(prev => prev && prev.chatId === selectedChat.chatId ? { ...prev, profilePictureUrl: newUrl } : prev);
          // PERSIST to database so we don't fetch next time (as per user preference)
          handleUpdateSettings({ profilePictureUrl: newUrl });
       }
    }).catch(() => {}); // Ignore errors for PPs
  }, [selectedChat?.chatId, deviceId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat || !device) return;
    
    const text = messageText;
    setMessageText("");
    
    try {
      await axios.post("/api/whatsapp/send", {
         sessionId: device.sessionId,
         recipient: selectedChat.chatId,
         message: text,
         agentId: String(user.id),
         agentName: user.name
      }, {
         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      // Backend should trigger WS update, but we add locally for snappy UI
      setMessages(prev => [...prev, {
         key: { fromMe: true, id: 'temp-' + Date.now() },
         message: { conversation: text },
         messageTimestamp: Date.now() / 1000,
         agentName: user.name
      }]);
      scrollToBottom();
    } catch {
      alert("Failed to send");
    }
  };

  const handleUpdateSettings = async (updates) => {
  if (!selectedChat) return;
  try {
    const res = await axios.put(`/api/whatsapp/devices/${deviceId}/chats/${selectedChat.chatId}/settings`, updates, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    // Use functional update to preserve local-only state like 'isEditingName'
    setSelectedChat(prev => {
       if (!prev || prev.chatId !== selectedChat.chatId) return prev;
       return { ...prev, ...res.data.chatSettings };
    });
    setChats(prev => prev.map(c => c.chatId === selectedChat.chatId ? { ...c, ...res.data.chatSettings } : c));
  } catch (err) { console.error(err); }
};
  
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

  const handleTakeover = async () => {
    if (!selectedChat) return;
    try {
        const res = await axios.post(`/api/whatsapp/devices/${deviceId}/chats/${selectedChat.chatId}/takeover`, {
            agentId: String(user.id),
            agentName: user.name
        }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }});
        
        const updated = { ...selectedChat, ...res.data.chatSettings };
        setSelectedChat(updated);
        setChats(prev => prev.map(c => c.id === updated.id ? { ...c, ...res.data.chatSettings } : c));
    } catch (err) { alert("Action failed"); }
  };

  const handleHandover = async () => {
    if (!selectedChat || !selectedAgentId || !device) return;
    
    const selectedAgent = agents.find(a => String(a.id) === String(selectedAgentId));
    if (!selectedAgent) return;

    try {
      await axios.post(`/api/whatsapp/devices/${deviceId}/chats/${selectedChat.chatId}/handover`, {
        toAgentId: selectedAgent.id,
        toAgentName: selectedAgent.name,
        notes: handoverNotes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      // Update local state
      setSelectedChat(prev => ({
        ...prev,
        assignedAgentId: selectedAgent.id,
        assignedAgentName: selectedAgent.name,
        notes: handoverNotes ? `${prev.notes || ''}\n[Handover] ${user.name} → ${selectedAgent.name}: ${handoverNotes}` : prev.notes
      }));
      
      setChats(prev => prev.map(c => 
        (c.chatId === selectedChat.chatId || c.id === selectedChat.id)
          ? { ...c, assignedAgentId: selectedAgent.id, assignedAgentName: selectedAgent.name }
          : c
      ));

      setShowHandoverModal(false);
      setSelectedAgentId("");
      setHandoverNotes("");
      alert(`Chat handed over to ${selectedAgent.name}`);
    } catch (err) {
      console.error(err);
      alert("Failed to handover chat");
    }
  };

  const handleRelease = async () => {
    if (!selectedChat) return;
    try {
        const res = await axios.post(`/api/whatsapp/devices/${deviceId}/chats/${selectedChat.chatId}/release`, {}, { 
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const updated = { ...selectedChat, ...res.data.chatSettings };
        setSelectedChat(updated);
        setChats(prev => prev.map(c => c.id === updated.id ? { ...c, ...res.data.chatSettings } : c));
    } catch (err) { alert("Action failed"); }
  };

  const handleClearMemory = async () => {
    if (!selectedChat || !window.confirm("Are you sure you want the AI to forget the current conversation context? This won't delete your chat history, but the AI will start fresh.")) return;
    
    try {
      await axios.delete(`/api/whatsapp/${deviceId}/${selectedChat.chatId}/memory`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      alert("AI memory cleared successfully!");
    } catch (err) {
      alert("Failed to clear memory: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDeleteChat = async (chatToDelete = null) => {
    const chat = chatToDelete || selectedChat;
    if (!chat) return;
    
    const confirmMessage = `Are you sure you want to delete this chat with ${chat.name || chat.contactName || chat.phoneNumber}?\n\nThis will permanently delete:\n- All message history\n- Chat settings\n- Conversation context\n\nThis action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      await axios.delete(
        `/api/whatsapp/devices/${deviceId}/chat-settings/${chat.phoneNumber}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}
      );
      
      // Remove from local state
      setChats(prev => prev.filter(c => c.phoneNumber !== chat.phoneNumber));
      
      // Clear selected chat if it was the deleted one
      if (selectedChat?.phoneNumber === chat.phoneNumber) {
        setSelectedChat(null);
        setMessages([]);
      }
      
      alert("Chat deleted successfully!");
    } catch (err) {
      alert("Failed to delete chat: " + (err.response?.data?.error || err.message));
    }
  };

  if (!deviceId) return (
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

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background font-sans transition-colors duration-300 relative">
      
      {/* 1. Left Sidebar (Chat List) */}
      <div className={clsx(
        "w-full md:w-[380px] max-w-full flex flex-col border-r border-border bg-card overflow-hidden shrink-0 transition-all duration-300",
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
                              String(d.id) === String(deviceId) ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-muted text-foreground"
                            )}
                          >
                             <div className={clsx(
                               "w-8 h-8 rounded-lg flex items-center justify-center",
                               String(d.id) === String(deviceId) ? "bg-white/20" : "bg-muted"
                             )}>
                                <Smartphone className="w-4 h-4" />
                             </div>
                             <div className="min-w-0">
                                <p className="font-bold text-xs truncate">{d.name || d.sessionId}</p>
                                <p className={clsx(
                                  "text-[9px] font-black uppercase tracking-tighter opacity-70",
                                  d.status === 'connected' ? (String(d.id) === String(deviceId) ? "text-white" : "text-green-500") : "text-red-500"
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
                           <p className="font-black text-[10px] uppercase tracking-widest">Connect New Device</p>
                        </Link>
                     </div>
                  </div>
                </>
              )}
           </div>
           
           <div className="flex gap-1 shrink-0">
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
        />
      </div>

      {/* 2. Main Chat Area */}
      <div className={clsx(
        "flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a] relative overlay-pattern transition-colors duration-300",
        !selectedChat ? "hidden md:flex" : (showInfoPanel ? "hidden md:flex" : "flex")
      )}>
         {selectedChat ? (
           <>
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
                          onClick={() => handleUpdateSettings({ humanTakeover: false })}
                          className={clsx(
                             "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-[10px] font-black uppercase tracking-wider",
                             !selectedChat.humanTakeover 
                                ? "bg-primary text-primary-foreground shadow-sm" 
                                : "text-muted-foreground hover:text-foreground"
                          )}
                       >
                          <Bot className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">AI</span>
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
                          <span className="hidden lg:inline">Human</span>
                       </button>
                    </div>

                    {/* Delete Chat Button */}
                    <button 
                      onClick={handleDeleteChat}
                      className="p-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                      title="Delete chat"
                    >
                      <Trash2 className="w-5 h-5"/>
                    </button>

                    <button className="hidden sm:block p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"><Search className="w-5 h-5"/></button>
                    <button 
                      onClick={() => setShowInfoPanel(!showInfoPanel)}
                      className={clsx(
                        "p-2.5 rounded-xl transition-all flex items-center gap-2 font-bold text-sm",
                        showInfoPanel ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      <Info className="w-5 h-5"/>
                      <span className="hidden sm:inline">Details</span>
                    </button>
                 </div>
             </div>
             
             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 md:p-6 z-0 custom-scrollbar flex flex-col">
                <div className="flex-1" /> {/* Push messages to bottom */}
                {messages.map((msg, i) => (
                   <MessageBubble key={msg.key?.id || msg.id || i} msg={msg} isMe={msg.key?.fromMe ?? msg.fromMe} onViewImage={setViewImage} />
                 ))}
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
                   <button
                     onClick={() => fileInputRef.current?.click()}
                     disabled={uploading}
                     className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
                     title="Send image"
                   >
                      {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                   </button>

                   {/* Product Selection Button */}
                   {products.length > 0 && (
                     <button
                       onClick={() => setShowProductModal(true)}
                       className="w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all flex-shrink-0"
                       title="Send product"
                     >
                       <ShoppingBag className="w-6 h-6" />
                     </button>
                   )}

                   <div className="flex-1 bg-muted/30 rounded-2xl flex items-center min-h-[48px] md:min-h-[52px] border border-border focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 transition-all px-4 group shadow-sm">
                      <input 
                         className="w-full bg-transparent py-3 text-[14px] md:text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
                         placeholder="Message..."
                         value={messageText}
                         onChange={e => setMessageText(e.target.value)}
                         autoFocus
                         onKeyDown={e => e.key === 'Enter' && handleSendMessage(e)}
                      />
                   </div>
                   <button 
                     disabled={!messageText.trim()}
                     onClick={handleSendMessage}
                     className="w-12 h-12 md:w-14 md:h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 shadow-lg shadow-primary/25 disabled:opacity-50 disabled:grayscale"
                   >
                     <Send className="w-5 h-5 md:w-6 md:h-6" />
                   </button>
                </div>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-700">
              <div className="w-72 h-72 bg-card/50 backdrop-blur-3xl rounded-[4rem] mb-12 flex items-center justify-center border border-white/10 shadow-2xl relative group overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-indigo-600/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                 <Bot className="w-40 h-40 text-primary opacity-20 group-hover:scale-110 transition-transform duration-700" />
              </div>
              <h2 className="text-4xl font-black text-foreground mb-4 tracking-tight">Select a Chat to Start</h2>
              <p className="text-muted-foreground max-w-sm text-lg leading-relaxed font-medium">
                Switch between unassigned queues and your own active chats to provide excellent customer service.
              </p>
           </div>
         )}
      </div>

      {/* 3. Right Info Panel (Sidebar) */}
      {showInfoPanel && selectedChat && (
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
                    <User className="w-4.5 h-4.5 text-primary" /> Contact info
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
                              <User className="w-4 h-4" /> <span>Name</span>
                           </button>
                           <button 
                             onClick={() => {
                                if (window.confirm(`Are you sure you want to block ${selectedChat.phoneNumber || formatJid(selectedChat.chatId)}?`)) {
                                    alert("Contact blocked successfully.");
                                }
                             }}
                             className="flex flex-col items-center justify-center gap-1.5 p-2 bg-red-500/5 text-red-600 hover:bg-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/10"
                             title="Block Contact"
                           >
                              <ShieldCheck className="w-4 h-4" /> <span>Block</span>
                           </button>
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
                              <RefreshCw className="w-4 h-4" /> <span>Export</span>
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
                    <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Handover
                  </button>
                  
                  <div className="grid grid-cols-1 gap-4">
                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Control</label>
                        <div className="p-1 rounded-xl bg-muted/30 border border-border flex items-center">
                           <button 
                              onClick={handleRelease}
                              className={clsx(
                                 "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider",
                                 !selectedChat.humanTakeover ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                              )}
                           >
                              <Bot className="w-3.5 h-3.5" /> AI
                           </button>
                           <button 
                              onClick={handleTakeover}
                              className={clsx(
                                 "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-all font-bold text-[10px] uppercase tracking-wider",
                                 selectedChat.humanTakeover ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                              )}
                           >
                              <User className="w-3.5 h-3.5" /> Human
                           </button>
                        </div>
                     </div>

                     <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Status</label>
                        {String(selectedChat.assignedAgentId) === String(user.id) ? (
                           <div className="flex items-center justify-between p-2.5 bg-green-500/5 border border-green-500/10 rounded-xl">
                              <span className="text-[10px] font-bold text-green-600">Assigned to me</span>
                              <button onClick={handleRelease} className="text-[9px] font-black uppercase text-red-500 hover:underline">Release</button>
                           </div>
                        ) : (
                           <button onClick={handleTakeover} className="w-full py-2.5 bg-primary text-primary-foreground text-[10px] font-black rounded-xl shadow-lg shadow-primary/10 hover:opacity-90 uppercase tracking-widest">
                              Take Control
                           </button>
                        )}
                     </div>
                  </div>
               </div>

               {/* Settings */}
               <div className="px-4 py-4 space-y-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">Status</label>
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
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">Priority</label>
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
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">AI Controls</label>
                     <div className="flex flex-col gap-1.5">
                        <Link to={`/devices/${deviceId}/ai-settings`} className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-lg text-[9px] font-black uppercase border border-border hover:bg-accent transition-all">
                           <Brain className="w-3 h-3 text-primary" /> Settings
                        </Link>
                        <button onClick={handleClearMemory} className="flex items-center gap-2 py-1.5 px-3 bg-muted rounded-lg text-[9px] font-black uppercase border border-border hover:bg-accent transition-all text-amber-600">
                           <RefreshCw className="w-3 h-3" /> Reset
                        </button>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Labels</label>
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
                  <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mb-2 block">Internal Notes</label>
                  <textarea 
                    className="w-full h-20 p-3 rounded-lg bg-card border border-border text-[11px] font-medium focus:ring-1 focus:ring-primary/20 resize-none transition-all"
                    placeholder="Add context..."
                    defaultValue={selectedChat.notes || ''}
                    onBlur={(e) => handleUpdateSettings({ notes: e.target.value })}
                  />
               </div>

           </div>
        </div>
      )}
      {/* Image Modal */}
      <ImageModal src={viewImage} onClose={() => setViewImage(null)} />

      {/* Image Preview & Caption Modal */}
      {imagePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-card w-full max-w-lg p-6 rounded-3xl shadow-2xl relative animate-in zoom-in-95 border border-border">
              <button 
                onClick={closePreview}
                className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                 <Paperclip className="w-5 h-5 text-primary" /> Send Image
              </h3>
              
              <div className="bg-muted/30 rounded-2xl p-4 mb-4 flex items-center justify-center border border-dashed border-border">
                 <img src={imagePreview} alt="Preview" className="max-h-[60vh] rounded-lg shadow-sm" />
              </div>
              
              <div className="space-y-4">
                 <div className="relative">
                    <input 
                      autoFocus
                      placeholder="Add a caption..."
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendImage()}
                      className="w-full pl-4 pr-12 py-3 bg-muted/50 border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                 </div>
                 
                 <div className="flex justify-end gap-2">
                    <button 
                      onClick={closePreview}
                      className="px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSendImage}
                      disabled={uploading}
                      className="px-6 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Send
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Product Preview Modal */}
      {productPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
           <div className="bg-card rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 border border-border animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black flex items-center gap-2">
                   <ShoppingBag className="w-5 h-5 text-primary" /> Product Preview
                </h3>
                <button onClick={() => setProductPreview(null)} className="p-2 hover:bg-muted rounded-full transition-all">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              {(productPreview.product.images?.[0] || productPreview.product.imageUrl) ? (
                <div className="bg-muted/30 rounded-3xl p-4 mb-4 flex items-center justify-center border border-border overflow-hidden">
                   <img src={productPreview.product.images?.[0] || productPreview.product.imageUrl} alt="Preview" className="max-h-[30vh] w-full object-cover rounded-2xl shadow-sm" />
                </div>
              ) : (
                <div className="bg-muted/30 rounded-3xl p-12 mb-4 flex flex-col items-center justify-center border border-border border-dashed">
                   <Package className="w-16 h-16 text-muted-foreground opacity-20 mb-4" />
                   <span className="text-xs font-bold text-muted-foreground opacity-50">No Image Available</span>
                </div>
              )}

              <div className="bg-muted/30 rounded-3xl p-6 mb-8 border border-border">
                <div className="whitespace-pre-wrap font-medium text-[15px] leading-relaxed text-foreground">
                  {productPreview.message.split('\n').map((line, i) => (
                    <div key={i} className={line.startsWith('🛍️') || line.startsWith('💰') ? "font-black mb-1" : "mb-0.5"}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                 <button 
                   onClick={() => setProductPreview(null)}
                   className="flex-1 py-4 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-2xl transition-all border border-border"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSendProduct}
                   disabled={uploading}
                   className="flex-[2] py-4 bg-primary text-primary-foreground text-sm font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                 >
                   {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                   Send to Customer
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Product Selection Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowProductModal(false)}>
          <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-xl font-black flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                Select Product to Send
              </h3>
              <button onClick={() => setShowProductModal(false)} className="p-2 hover:bg-muted rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)] custom-scrollbar">
              {products.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="font-medium">No products available</p>
                  <p className="text-sm mt-2">Add products in AI Settings to send them to customers</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product, index) => (
                    <div
                      key={index}
                      onClick={() => handleSelectProduct(product)}
                      className="p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                      {(product.images?.[0] || product.imageUrl) ? (
                        <img 
                          src={product.images?.[0] || product.imageUrl} 
                          alt={product.name}
                          className="w-full h-40 object-cover rounded-lg mb-3"
                        />
                      ) : (
                        <div className="w-full h-40 bg-muted/30 flex flex-col items-center justify-center rounded-lg mb-3 border border-border border-dashed">
                           <Package className="w-10 h-10 text-muted-foreground opacity-20 mb-2" />
                           <span className="text-[10px] font-bold text-muted-foreground opacity-50">No Image</span>
                        </div>
                      )}
                      <h4 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{product.name}</h4>
                      <p className="text-sm font-black text-primary mb-2">
                        {product.currency || 'IDR'} {product.price}
                      </p>
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                      )}
                      <div className="flex items-center gap-2">
                        {product.inStock ? (
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded font-bold">
                            ✅ In Stock
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded font-bold">
                            ❌ Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Handover Modal */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="bg-card w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-border bg-muted/30 flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-black text-foreground mb-1">Handover Chat</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Transfer to another agent</p>
                 </div>
                 <button onClick={() => setShowHandoverModal(false)} className="p-3 hover:bg-muted rounded-2xl transition-all">
                    <X className="w-6 h-6 text-muted-foreground" />
                 </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">Select Target Agent</label>
                    <div className="relative">
                       <UserPlus className="absolute left-4 top-4 w-5 h-5 text-primary" />
                       <select 
                          value={selectedAgentId}
                          onChange={(e) => setSelectedAgentId(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-muted/50 border border-border rounded-2xl text-foreground font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all appearance-none"
                       >
                          <option value="">Choose an agent...</option>
                          {agents.map(agent => (
                             <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                          ))}
                       </select>
                       {loadingAgents && <Loader2 className="absolute right-4 top-4 w-5 h-5 animate-spin text-muted-foreground" />}
                    </div>
                    {agents.length === 0 && !loadingAgents && (
                      <p className="text-[10px] text-amber-500 font-bold px-1">No other agents available for handover.</p>
                    )}
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 px-1">Handover Notes (Optional)</label>
                    <textarea 
                       placeholder="Explain why you're transferring this chat..."
                       value={handoverNotes}
                       onChange={(e) => setHandoverNotes(e.target.value)}
                       className="w-full p-4 bg-muted/50 border border-border rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/10 transition-all min-h-[120px] resize-none"
                    />
                 </div>
              </div>

              <div className="p-8 bg-muted/20 border-t border-border flex gap-3">
                 <button 
                    onClick={() => setShowHandoverModal(false)}
                    className="flex-1 py-4 text-sm font-black text-muted-foreground hover:bg-muted rounded-2xl transition-all uppercase tracking-widest"
                 >
                    Cancel
                 </button>
                 <button 
                    onClick={handleHandover}
                    disabled={!selectedAgentId || uploading}
                    className="flex-[2] py-4 bg-primary text-primary-foreground text-sm font-black rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50"
                 >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Confirm Handover
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
