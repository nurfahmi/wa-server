import React from "react";
import { X, Send, Loader2, Paperclip } from "lucide-react";

export const ImagePreviewDialog = ({ 
  imagePreview, 
  caption, 
  setCaption, 
  onClose, 
  onSend, 
  uploading,
  enterToSend,
  t 
}) => {
  if (!imagePreview) return null;

  const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
          if (e.shiftKey) return;
          
          if (enterToSend) {
              e.preventDefault();
              onSend();
          }
      }
  };

  return (
     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-card w-full max-w-lg p-5 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl relative animate-in zoom-in-95 border border-border">
           <button 
             onClick={onClose}
             className="absolute top-3 right-3 md:top-4 md:right-4 p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-full transition-all z-10"
           >
             <X className="w-4 h-4 md:w-5 md:h-5" />
           </button>
           
           <h3 className="font-black text-base md:text-lg mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-primary" /> {t('chats.sendImage') || 'Send Image'}
           </h3>
           
           <div className="bg-muted/30 rounded-xl md:rounded-2xl p-2 md:p-4 mb-4 flex items-center justify-center border border-dashed border-border/50 overflow-hidden">
              <img src={imagePreview} alt="Preview" className="max-h-[50vh] md:max-h-[60vh] rounded-lg shadow-sm object-contain" />
           </div>
           
           <div className="space-y-4">
              <div className="relative">
                 <textarea 
                   autoFocus
                   rows={1}
                   placeholder="Add a caption..."
                   value={caption}
                   onChange={e => {
                      setCaption(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                   }}
                   onKeyDown={handleKeyDown}
                   className="w-full px-4 py-2.5 md:py-3 bg-muted/50 border border-border rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none custom-scrollbar"
                 />
              </div>
              
              <div className="flex justify-end gap-2 md:gap-3">
                 <button 
                   onClick={onClose}
                   className="px-4 py-2.5 text-xs md:text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all"
                 >
                   {t('common.cancel') || 'Cancel'}
                 </button>
                 <button 
                   onClick={onSend}
                   disabled={uploading}
                   className="px-5 md:px-6 py-2.5 bg-primary text-primary-foreground text-xs md:text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                 >
                   {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                   {t('chats.send') || 'Send'}
                 </button>
              </div>
           </div>
        </div>
     </div>
  );
};
