import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import styles from './confirmModal.module.css';
import { Trash2, AlertTriangle, Info, AlertCircle } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Ha, o\'chirilsin',
    cancelText: 'Bekor qilish',
    type: 'danger', // 'danger' | 'warning' | 'info'
  });

  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        isOpen: true,
        title: options.title || 'O\'chirishni tasdiqlaysizmi?',
        message: options.message || 'Haqiqatdan ham ushbu ma\'lumotni o\'chirmoqchimisiz? Bu amalni ortga qaytarib bo\'lmaydi.',
        confirmText: options.confirmText || 'Ha, o\'chirilsin',
        cancelText: options.cancelText || 'Bekor qilish',
        type: options.type || 'danger',
      });
    });
  }, []);

  const handleClose = (result) => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
  };

  const getIcon = () => {
    switch (modalState.type) {
      case 'warning':
        return <AlertTriangle size={30} strokeWidth={2.2} />;
      case 'info':
        return <Info size={30} strokeWidth={2.2} />;
      case 'danger':
      default:
        return <Trash2 size={30} strokeWidth={2.2} />;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modalState.isOpen && (
        <div className={styles.overlay} onClick={() => handleClose(false)}>
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={`${styles.iconWrapper} ${styles[modalState.type] || styles.danger}`}>
              {getIcon()}
            </div>
            <h3 className={styles.title}>{modalState.title}</h3>
            <p className={styles.message}>{modalState.message}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => handleClose(false)}
              >
                {modalState.cancelText}
              </button>
              <button
                type="button"
                className={`${styles.confirmBtn} ${styles[modalState.type] || styles.danger}`}
                onClick={() => handleClose(true)}
                autoFocus
              >
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export default ConfirmContext;
