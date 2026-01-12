import React from "react";
import { CheckCheck, Bot } from "lucide-react";
import clsx from "clsx";

// Helper for base64
const toBase64 = (data) => {
    try {
        if (!data) return "";
        if (typeof data === 'string') return data;
        // If it's a Buffer object from Node serialization (has .data property)
        if (data.type === 'Buffer' && Array.isArray(data.data)) {
            data = data.data;
        }
        // content is likely a Uint8Array or Array
        const bytes = new Uint8Array(data);
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    } catch (e) {
        console.error("Failed to convert to base64", e);
        return "";
    }
};

export const MessageBubble = ({ msg, isMe, onViewImage }) => {
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
  const renderImage = () => {
      if (mediaUrl) return <img src={mediaUrl} alt="Chat Media" className="rounded-lg mb-2 max-w-[280px] h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm" onClick={() => onViewImage && onViewImage(mediaUrl)} />;
      if (thumbnail) {
          const b64 = toBase64(thumbnail);
          if(b64) {
             const src = `data:image/jpeg;base64,${b64}`;
             return <img src={src} alt="Preview" className="rounded-lg mb-2 max-w-[280px] h-auto object-cover blur-[2px] hover:blur-none transition-all shadow-sm cursor-pointer" onClick={() => onViewImage && onViewImage(src)} />;
          }
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
