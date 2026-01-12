import React from "react";
import { X } from "lucide-react";

export const ImageModal = ({ src, onClose }) => {
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
