/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { useLanguage } from './LanguageContext';

const ModalContext = createContext();

export function ModalProvider({ children }) {
  const { t } = useLanguage();
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "default",
    confirmText: "",
    cancelText: "",
    onConfirm: null,
    onCancel: null,
    singleAction: false, // For alert style (only OK button)
  });

  const awaiterRef = useRef(null);

  const close = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    if (awaiterRef.current) {
        awaiterRef.current.resolve(false);
        awaiterRef.current = null;
    }
  }, []);

  const showConfirm = useCallback(({ 
    title, 
    message, 
    type = 'default',
    confirmText,
    cancelText
  }) => {
    return new Promise((resolve) => {
      awaiterRef.current = { resolve };
      setModalState({
        isOpen: true,
        title: title || t('modal.confirm'),
        message,
        type,
        confirmText: confirmText || t('modal.confirm'),
        cancelText: cancelText || t('modal.cancel'),
        singleAction: false,
        onConfirm: () => {
          resolve(true);
          setModalState(prev => ({ ...prev, isOpen: false }));
          awaiterRef.current = null;
        },
        onCancel: () => {
          resolve(false);
          setModalState(prev => ({ ...prev, isOpen: false }));
          awaiterRef.current = null;
        }
      });
    });
  }, [t]);

  const showAlert = useCallback(({ 
    title, 
    message, 
    type = 'info',
    okText
  }) => {
    return new Promise((resolve) => {
      awaiterRef.current = { resolve };
      setModalState({
        isOpen: true,
        title: title || t('modal.info'),
        message,
        type,
        confirmText: okText || t('modal.ok'),
        cancelText: null, // Hidden for alert
        singleAction: true,
        onConfirm: () => {
          resolve(true);
          setModalState(prev => ({ ...prev, isOpen: false }));
          awaiterRef.current = null;
        },
        onCancel: () => { // Back/Outside click
          resolve(true);
          setModalState(prev => ({ ...prev, isOpen: false }));
          awaiterRef.current = null;
        }
      });
    });
  }, [t]);

  return (
    <ModalContext.Provider value={{ showConfirm, showAlert, close }}>
      {children}
      <ConfirmationModal 
        isOpen={modalState.isOpen}
        onClose={modalState.onCancel} // Clicking X or background acts as cancel/close
        onConfirm={modalState.onConfirm}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        confirmText={modalState.confirmText}
        cancelText={modalState.cancelText}
      />
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
