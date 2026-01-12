import React, { useState, useRef } from "react";
import { X, Smartphone, MessageSquare, Image, Loader2, Send } from "lucide-react";
import clsx from "clsx";

export const NewChatDialog = ({ show, onClose, onSend, enterToSend, uploading, t }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  // Reset state when opened
  React.useEffect(() => {
    if (show) {
      setPhoneNumber("");
      setMessage("");
      setImagePreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [show]);

  if (!show) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setImagePreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleRemoveImage = () => {
    setFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phoneNumber.trim() || !message.trim()) return;
    
    // Ensure phone number has only digits
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    onSend({
      phoneNumber: cleanPhone,
      message,
      file
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 md:p-6 border-b border-border flex items-center justify-between bg-muted/30">
          <div>
            <h3 className="text-lg md:text-xl font-black text-foreground">{t('chats.newChat') || 'New Chat'}</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('chats.newChatSubtitle') || 'Start a new conversation'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 md:p-6 space-y-4 md:space-y-5">
          {/* Phone Number Input */}
          <div className="space-y-1 md:space-y-2">
            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              {t('chats.phoneNumber') || 'Phone Number'}
            </label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-3 w-4 h-4 md:w-5 md:h-5 md:top-3.5 text-muted-foreground" />
              <input
                required
                type="text"
                placeholder={t('chats.phoneNumberPlaceholder') || "e.g. 6281..."}
                className="w-full bg-muted/30 border border-border rounded-xl md:rounded-2xl py-2.5 md:py-3.5 pl-10 md:pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-1 md:space-y-2">
            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              {t('chats.message') || 'Message'}
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-3 w-4 h-4 md:w-5 md:h-5 md:top-3.5 text-muted-foreground" />
              <textarea
                required
                rows={1}
                placeholder={t('chats.messagePlaceholder') || "Type here..."}
                className="w-full bg-muted/30 border border-border rounded-xl md:rounded-2xl py-2.5 md:py-3.5 pl-10 md:pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none custom-scrollbar max-h-32"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) return;
                    
                    if (enterToSend) {
                       e.preventDefault();
                       if (message.trim() && phoneNumber.trim()) {
                         handleSubmit(e);
                       }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Optional Image */}
          <div className="space-y-1 md:space-y-2">
            <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              {t('chats.imageOptional') || 'Image'}
            </label>
            
            {!imagePreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl md:rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center gap-1 md:gap-2 hover:bg-muted/30 hover:border-primary/50 transition-all group"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Image className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Upload Image</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </button>
            ) : (
              <div className="relative aspect-video w-full rounded-xl md:rounded-2xl overflow-hidden border border-border group">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 p-1.5 bg-destructive text-white rounded-lg shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading || !phoneNumber.trim() || !message.trim()}
            className={clsx(
              "w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-xl transition-all flex items-center justify-center gap-2",
              uploading || !phoneNumber.trim() || !message.trim()
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:scale-[1.01] shadow-primary/20 active:scale-[0.98]"
            )}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 md:w-5 md:h-5" />
                {t('chats.sendFirstMessage') || 'Send Message'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
