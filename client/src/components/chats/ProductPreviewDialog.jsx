import React from "react";
import { X, Send, Loader2, ShoppingBag, Package } from "lucide-react";

export const ProductPreviewDialog = ({
  productPreview,
  onClose,
  onSend,
  uploading,
  t
}) => {
  if (!productPreview) return null;

  return (
     <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl md:rounded-[2.5rem] shadow-2xl max-w-lg w-full p-5 md:p-8 border border-border animate-in zoom-in-95 duration-200">
           <div className="flex items-center justify-between mb-4 md:mb-6">
             <h3 className="text-lg md:text-xl font-black flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" /> {t('chats.productPreview') || 'Preview'}
             </h3>
             <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all">
               <X className="w-5 h-5 text-muted-foreground" />
             </button>
           </div>

           {(productPreview.product.images?.[0] || productPreview.product.imageUrl) ? (
             <div className="bg-muted/30 rounded-xl md:rounded-3xl p-2 md:p-4 mb-3 md:mb-4 flex items-center justify-center border border-border overflow-hidden">
                <img src={productPreview.product.images?.[0] || productPreview.product.imageUrl} alt="Preview" className="max-h-[25vh] md:max-h-[30vh] w-full object-cover rounded-lg md:rounded-2xl shadow-sm" />
             </div>
           ) : (
             <div className="bg-muted/30 rounded-xl md:rounded-3xl p-8 md:p-12 mb-3 md:mb-4 flex flex-col items-center justify-center border border-border border-dashed">
                <Package className="w-12 h-12 md:w-16 md:h-16 text-muted-foreground opacity-20 mb-4" />
                <span className="text-[10px] font-bold text-muted-foreground opacity-50">No Image</span>
             </div>
           )}

           <div className="bg-muted/30 rounded-xl md:rounded-3xl p-4 md:p-6 mb-5 md:mb-8 border border-border max-h-[20vh] overflow-y-auto custom-scrollbar">
             <div className="whitespace-pre-wrap font-medium text-[13px] md:text-[15px] leading-relaxed text-foreground">
               {productPreview.message.split('\n').map((line, i) => (
                 <div key={i} className={line.startsWith('🛍️') || line.startsWith('💰') ? "font-black mb-0.5" : "mb-0.5"}>
                   {line}
                 </div>
               ))}
             </div>
           </div>

           <div className="flex gap-2 md:gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-3 md:py-4 text-xs md:text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl md:rounded-2xl transition-all border border-border"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button 
                onClick={onSend}
                disabled={uploading}
                className="flex-[2] py-3 md:py-4 bg-primary text-primary-foreground text-xs md:text-sm font-bold rounded-xl md:rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t('chats.send') || 'Send'}
              </button>
           </div>
        </div>
     </div>
  );
};
