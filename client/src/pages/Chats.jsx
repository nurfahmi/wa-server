import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useModal } from "../context/ModalContext";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { parseLabels, formatJid } from "../utils/chatUtils";

// Components
import { ChatSidebar } from "../components/chats/ChatSidebar";
import { ChatWindow } from "../components/chats/ChatWindow";
import { ChatInfoPanel } from "../components/chats/ChatInfoPanel";
import { ImageModal } from "../components/chats/ImageModal";
import { ImagePreviewDialog } from "../components/chats/ImagePreviewDialog";
import { ProductPreviewDialog } from "../components/chats/ProductPreviewDialog";
import { ProductSelectionDialog } from "../components/chats/ProductSelectionDialog";
import { HandoverDialog } from "../components/chats/HandoverDialog";
import { DeviceSelectionView } from "../components/chats/DeviceSelectionView";

export default function Chats() {
  const { t, language, changeLanguage } = useLanguage();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
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
  const [viewImage, setViewImage] = useState(null);
  
  // Image Preview & Send State
  const [imagePreview, setImagePreview] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  
  // Product Selection State
  const [showProductModal, setShowProductModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [productPreview, setProductPreview] = useState(null);

  // Handover State
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [enterToSend, setEnterToSend] = useState(localStorage.getItem('enterToSend') !== 'false');
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
       await showAlert({ title: t('modal.error'), message: "Failed to send image", type: 'danger' });
    } finally {
       setUploading(false);
    }
  };

  const handleNewChat = async ({ phoneNumber, message, file }) => {
    if (!device) return;
    
    setUploading(true);
    try {
      let res;
      if (file) {
        // Send as image
        const formData = new FormData();
        formData.append("sessionId", device.sessionId);
        formData.append("recipient", phoneNumber);
        formData.append("file", file);
        formData.append("caption", message);
        formData.append("agentId", String(user.id));
        formData.append("agentName", user.name);

        res = await axios.post("/api/whatsapp/send/image", formData, {
          headers: { 
             Authorization: `Bearer ${localStorage.getItem("token")}`,
             "Content-Type": "multipart/form-data" 
          }
        });
      } else {
        // Send as text
        res = await axios.post("/api/whatsapp/send", {
          sessionId: device.sessionId,
          recipient: phoneNumber,
          message: message,
          agentId: String(user.id),
          agentName: user.name
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
      }

      setShowNewChatModal(false);
      await showAlert({ title: t('modal.success'), message: t('messages.saveSuccess'), type: 'success' });
      
      // Refresh chats and optionally select the new one
      refreshChatList();
      
      // Navigate to the new chat
      const chatId = phoneNumber.includes("@") ? phoneNumber : `${phoneNumber}@s.whatsapp.net`;
      navigate(`/devices/${device.id}/chats?chatId=${formatJid(chatId)}`);

    } catch (err) {
      console.error(err);
      await showAlert({ title: t('modal.error'), message: "Failed to start new chat", type: 'danger' });
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
      await showAlert({ title: t('modal.error'), message: "Failed to send product", type: 'danger' });
    } finally {
      setUploading(false);
    }
  };
  
  const toggleTheme = () => {
      const isDarkNow = document.documentElement.classList.toggle('dark');
      setIsDark(isDarkNow);
      localStorage.setItem('theme', isDarkNow ? 'dark' : 'light');
  };

  const toggleEnterToSend = () => {
    const newValue = !enterToSend;
    setEnterToSend(newValue);
    localStorage.setItem('enterToSend', String(newValue));
  };

  useEffect(() => {
     setIsDark(document.documentElement.classList.contains('dark'));
  }, []);
  
  const params = useParams();
  const deviceId = params.deviceId || searchParams.get("deviceId");
  const urlChatId = params.chatId || searchParams.get("chatId");
  
  // Update URL when chat selection changes
  useEffect(() => {
    if (selectedChat && deviceId) {
      const shortId = formatJid(selectedChat.chatId);
      const currentUrlId = searchParams.get('chatId');
      if (currentUrlId !== shortId) {
        navigate(`/devices/${deviceId}/chats?chatId=${shortId}`, { replace: true });
      }
    }
  }, [selectedChat, deviceId, searchParams, navigate]);
  
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

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
           const update = data.data;
           console.log('[WS] Received message_update:', update);
           
           setMessages(prev => {
               const existing = prev.find(msg => (msg.key?.id || msg.messageId) === update.messageId);
               if (existing) {
                   return prev.map(msg => 
                       (msg.key?.id || msg.messageId) === update.messageId 
                       ? { ...msg, ...update } 
                       : msg
                   );
               }
               
               if (selectedChat) {
                   const isSameChat = update.chatId === selectedChat.chatId || 
                                    (update.phoneNumber && selectedChat.phoneNumber && update.phoneNumber === selectedChat.phoneNumber);
                   
                   if (isSameChat) {
                       return [...prev, {
                           key: { fromMe: update.direction === 'outgoing', id: update.messageId },
                           message: { conversation: update.content },
                           messageType: update.messageType,
                           content: update.content,
                           timestamp: new Date(update.timestamp).getTime() / 1000,
                           agentName: update.agentName,
                           isAiGenerated: update.isAiGenerated
                       }];
                   }
               }
               return prev;
           });
           refreshChatList();
       }
       
       if (data.type === "messages.upsert") {
          const newMsgs = data.data.messages;
          if (selectedChat) {
             const relevant = newMsgs.filter(m => {
                 const jid = m.key.remoteJid;
                 const selectedJid = selectedChat.chatId;
                 if (jid === selectedJid) return true;
                 const jidPhone = jid.split('@')[0];
                 const selectedPhone = selectedJid.split('@')[0];
                 return (jidPhone === selectedPhone) || (selectedChat.phoneNumber && jidPhone === selectedChat.phoneNumber);
             });
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
       if (urlChatId) {
         const found = chatList.find(c => 
           String(c.chatId) === String(urlChatId) || 
           String(c.id) === String(urlChatId) ||
           formatJid(c.chatId) === urlChatId
         );
         if (found) setSelectedChat(found);
       }
    }).finally(() => setLoadingChats(false));
  }, [deviceId, urlChatId]);

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
    // Reset message search when chat changes
    setShowMessageSearch(false);
    setMessageSearchQuery("");
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
      scrollToBottom();
    } catch {
      await showAlert({ title: t('modal.error'), message: "Failed to send", type: 'danger' });
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
    } catch (err) { await showAlert({ title: t('modal.error'), message: t('chats.actionFailed'), type: 'danger' }); }
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
      await showAlert({ title: t('modal.success'), message: `${t('chats.handoverSuccess')} ${selectedAgent.name}`, type: 'success' });
    } catch (err) {
      console.error(err);
      await showAlert({ title: t('modal.error'), message: t('chats.handoverFailed'), type: 'danger' });
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
    } catch (err) { await showAlert({ title: t('modal.error'), message: t('chats.actionFailed'), type: 'danger' }); }
  };

  const handleClearMemory = async () => {
    if (!selectedChat) return;
    
    const confirmed = await showConfirm({
      title: t('chats.clearMemory'),
      message: t('chats.clearMemoryConfirm'),
      type: 'warning',
      confirmText: t('modal.confirm'),
      cancelText: t('modal.cancel')
    });

    if (!confirmed) return;
    
    try {
      await axios.delete(`/api/whatsapp/${deviceId}/${selectedChat.chatId}/memory`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      await showAlert({ title: t('modal.success'), message: t('chats.clearMemorySuccess'), type: 'success' });
    } catch (err) {
      await showAlert({ title: t('modal.error'), message: "Failed to clear memory: " + (err.response?.data?.error || err.message), type: 'danger' });
    }
  };

  const handleDeleteChat = async (chatToDelete = null) => {
    const chat = chatToDelete || selectedChat;
    if (!chat) return;
    
    const confirmed = await showConfirm({
        title: t('chats.deleteChat'),
        message: t('chats.deleteChatConfirm'),
        type: 'danger',
        confirmText: t('modal.delete'),
        cancelText: t('modal.cancel')
    });
    
    if (!confirmed) return;
    
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
      
      await showAlert({ title: t('modal.success'), message: t('chats.deleteChatSuccess'), type: 'success' });
    } catch (err) {
      await showAlert({ title: t('modal.error'), message: "Failed to delete chat: " + (err.response?.data?.error || err.message), type: 'danger' });
    }
  };

  if (!deviceId) return (
     <DeviceSelectionView 
        allDevices={allDevices}
        loadingDevices={loadingDevices}
        fetchAllDevices={fetchAllDevices}
        navigate={navigate}
     />
  );

  return (
    <div className="h-screen w-full flex overflow-hidden bg-background font-sans transition-colors duration-300 relative">
      
      <ChatSidebar 
        chats={chats}
        loadingChats={loadingChats}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        handleDeleteChat={handleDeleteChat}
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        user={user}
        device={device}
        allDevices={allDevices}
        t={t}
        language={language}
        changeLanguage={changeLanguage}
        toggleTheme={toggleTheme}
        isDark={isDark}
        showNewChatModal={showNewChatModal}
        setShowNewChatModal={setShowNewChatModal}
        handleNewChat={handleNewChat}
        enterToSend={enterToSend}
        uploading={uploading}
      />

      <ChatWindow 
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        messages={messages}
        user={user}
        messageText={messageText}
        setMessageText={setMessageText}
        onSendMessage={handleSendMessage}
        fileInputRef={fileInputRef}
        handleFileSelect={handleFileSelect}
        uploading={uploading}
        products={products}
        setShowProductModal={setShowProductModal}
        showInfoPanel={showInfoPanel}
        setShowInfoPanel={setShowInfoPanel}
        handleRelease={handleRelease}
        handleTakeover={handleTakeover}
        handleDeleteChat={handleDeleteChat}
        showMessageSearch={showMessageSearch}
        setShowMessageSearch={setShowMessageSearch}
        messageSearchQuery={messageSearchQuery}
        setMessageSearchQuery={setMessageSearchQuery}
        setViewImage={setViewImage}
        scrollRef={scrollRef}
        enterToSend={enterToSend}
        toggleEnterToSend={toggleEnterToSend}
        t={t}
      />

      <ChatInfoPanel 
        showInfoPanel={showInfoPanel}
        setShowInfoPanel={setShowInfoPanel}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        deviceId={deviceId}
        user={user}
        messages={messages}
        handleUpdateSettings={handleUpdateSettings}
        handleClearMemory={handleClearMemory}
        handleRelease={handleRelease}
        handleTakeover={handleTakeover}
        setShowHandoverModal={setShowHandoverModal}
        t={t}
      />

      <ImageModal src={viewImage} onClose={() => setViewImage(null)} />

      <ImagePreviewDialog 
         imagePreview={imagePreview}
         caption={caption}
         setCaption={setCaption}
         onClose={closePreview}
         onSend={handleSendImage}
         uploading={uploading}
         enterToSend={enterToSend}
         t={t}
      />

      <ProductPreviewDialog 
         productPreview={productPreview}
         onClose={() => setProductPreview(null)}
         onSend={handleSendProduct}
         uploading={uploading}
         t={t}
      />

      <ProductSelectionDialog 
         show={showProductModal}
         onClose={() => setShowProductModal(false)}
         products={products}
         onSelect={handleSelectProduct}
         t={t}
      />

      <HandoverDialog 
         show={showHandoverModal}
         onClose={() => setShowHandoverModal(false)}
         agents={agents}
         selectedAgentId={selectedAgentId}
         setSelectedAgentId={setSelectedAgentId}
         handoverNotes={handoverNotes}
         setHandoverNotes={setHandoverNotes}
         onHandover={handleHandover}
         loadingAgents={loadingAgents}
         uploading={uploading}
         t={t}
      />
    </div>
  );
}
