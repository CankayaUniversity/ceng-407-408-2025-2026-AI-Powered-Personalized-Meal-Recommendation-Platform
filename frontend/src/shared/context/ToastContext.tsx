import React, { createContext, useState, useCallback } from 'react';
import { Toast } from '../../components/Toast';

interface ToastContextType {
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        // Toast'u 3.5 saniye sonra otomatik temizle
        setTimeout(() => setToast(null), 3500);
    }, []);

    const hideToast = useCallback(() => {
        setToast(null);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={hideToast}
                />
            )}
        </ToastContext.Provider>
    );
};
