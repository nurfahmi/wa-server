import React from "react";
import { X, ShoppingBag, Package } from "lucide-react";

export const ProductSelectionDialog = ({
  show,
  onClose,
  products,
  onSelect,
  t
}) => {
  if (!show) return null;

  return (
     <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
       <div className="bg-card rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] md:max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
         <div className="px-5 py-4 md:p-6 border-b border-border flex items-center justify-between">
           <h3 className="text-lg md:text-xl font-black flex items-center gap-2">
             <ShoppingBag className="w-5 h-5 text-primary" />
             {t('chats.selectProductToSend') || 'Select Product'}
           </h3>
           <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
             <X className="w-5 h-5" />
           </button>
         </div>
         
         <div className="p-4 md:p-6 overflow-y-auto max-h-[calc(85vh-100px)] custom-scrollbar">
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">{t('chats.noProductsAvailable') || 'No products available'}</p>
              <p className="text-sm mt-2">{t('chats.addProductsHint') || 'Add products in AI Settings to send them to customers'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product, index) => (
                <div
                  key={index}
                  onClick={() => onSelect(product)}
                  className="p-3 md:p-4 border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  {(product.images?.[0] || product.imageUrl) ? (
                    <img 
                      src={product.images?.[0] || product.imageUrl} 
                      alt={product.name}
                      className="w-full h-32 md:h-40 object-cover rounded-lg mb-2 md:mb-3"
                    />
                  ) : (
                    <div className="w-full h-32 md:h-40 bg-muted/30 flex flex-col items-center justify-center rounded-lg mb-2 md:mb-3 border border-border border-dashed">
                       <Package className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground opacity-20 mb-2" />
                       <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground opacity-50">No Image</span>
                    </div>
                  )}
                  <h4 className="font-bold text-sm md:text-base text-foreground mb-1 md:mb-2 group-hover:text-primary transition-colors line-clamp-1">{product.name}</h4>
                  <p className="text-xs md:text-sm font-black text-primary mb-1 md:mb-2">
                    {product.currency || 'IDR'} {product.price}
                  </p>
                  {product.description && (
                    <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1 md:line-clamp-2 mb-2">{product.description}</p>
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
  );
};
