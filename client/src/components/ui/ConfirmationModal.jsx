import { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = 'default', // default, danger, warning, success, info
  loading = false
}) {
  const modalRef = useRef(null);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, loading]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const icons = {
    danger: <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-500" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-500" />,
    success: <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />,
    info: <Info className="w-6 h-6 text-blue-600 dark:text-blue-500" />,
    default: <Info className="w-6 h-6 text-primary" />
  };

  const buttonStyles = {
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    warning: "bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-500",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500",
    info: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    default: "bg-primary hover:bg-primary/90 text-primary-foreground focus:ring-primary"
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={modalRef}
        className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl transform transition-all animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx("p-2 rounded-full shrink-0 bg-secondary/50", {
              'bg-red-100 dark:bg-red-900/30': type === 'danger',
              'bg-amber-100 dark:bg-amber-900/30': type === 'warning',
              'bg-emerald-100 dark:bg-emerald-900/30': type === 'success',
              'bg-blue-100 dark:bg-blue-900/30': type === 'info',
            })}>
              {icons[type] || icons.default}
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground mb-2 leading-none mt-1">
                {title}
              </h3>
              <div className="text-muted-foreground text-sm leading-relaxed">
                {message}
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-input rounded-lg hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            
            {onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={clsx(
                  "px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm",
                  buttonStyles[type] || buttonStyles.default
                )}
              >
                {loading ? 'Processing...' : confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
