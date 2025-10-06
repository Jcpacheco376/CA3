// src/context/NotificationContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

// --- TIPOS Y COMPONENTES INTERNOS ---

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    read: boolean;
    timestamp: Date;
}
interface Toast extends Omit<Notification, 'read' | 'timestamp'> {}
interface NotificationContextType {
    notifications: Notification[];
    addNotification: (title: string, message: string, type: 'success' | 'error' | 'info') => void;
    markAllAsRead: () => void;
    markOneAsRead: (id: number) => void;
    clearNotifications: () => void;
}

const ToastComponent = ({ toast, onRemove }: { toast: Toast; onRemove: (id: number) => void }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onRemove(toast.id), 400); 
        }, 5000);
        return () => clearTimeout(exitTimer);
    }, [toast.id, onRemove]);

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 400);
    };

    const typeClasses = {
        success: { bg: 'bg-green-500', icon: <CheckCircle2 /> },
        error: { bg: 'bg-red-500', icon: <AlertCircle /> },
        info: { bg: 'bg-blue-500', icon: <Info /> }
    };
    const animationClass = isExiting ? 'animate-fade-out-right' : 'animate-fade-in-right';

    return (
        <div className={`relative flex items-start p-4 rounded-lg shadow-2xl text-white w-80 md:w-96 overflow-hidden ${typeClasses[toast.type].bg} ${animationClass}`}>
            <div className="shrink-0 mr-3 mt-0.5">{typeClasses[toast.type].icon}</div>
            <div className="flex-grow">
                <p className="font-bold text-sm">{toast.title}</p>
                <p className="text-sm opacity-90">{toast.message}</p>
            </div>
            <button onClick={handleRemove} className="ml-4 -mr-1 -mt-1 p-1 rounded-full hover:bg-white/20 shrink-0">
                <X size={18} />
            </button>
            <div className="absolute bottom-0 right-0 h-1 bg-white/40 animate-progress-bar"></div>
        </div>
    );
};

// --- PROVEEDOR Y HOOK DEL CONTEXTO ---

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_STORAGE_KEY = 'app_notification_history';

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification debe ser usado dentro de un NotificationProvider');
    return context;
};

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
    const [history, setHistory] = useState<Notification[]>(() => {
        try {
            const savedHistory = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
            if (savedHistory) {
                // Es crucial convertir las fechas de string a objeto Date al cargar.
                return JSON.parse(savedHistory).map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
            }
        } catch (e) {
            console.error("Error al cargar historial de notificaciones:", e);
        }
        return [];
    });
    const [toasts, setToasts] = useState<Toast[]>([]);

    const saveHistory = (newHistory: Notification[]) => {
        setHistory(newHistory);
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newHistory));
    };

    const addNotification = useCallback((title: string, message: string, type: 'success' | 'error' | 'info') => {
        //const newNotification: Notification = { id: Date.now(), title, message, type, read: false, timestamp: new Date() };
          const uniqueId = Date.now() + Math.random();
        const newNotification: Notification = { id: uniqueId, title, message, type, read: false, timestamp: new Date() };
        
        const updatedHistory = [newNotification, ...history].slice(0, 10);
        saveHistory(updatedHistory);
        
        setToasts(prev => [...prev, { id: newNotification.id, title, message, type }]);
    }, [history]);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const markOneAsRead = useCallback((id: number) => {
        const updatedHistory = history.map(n => n.id === id ? { ...n, read: true } : n);
        saveHistory(updatedHistory);
    }, [history]);
    
    const markAllAsRead = useCallback(() => {
        const updatedHistory = history.map(n => ({ ...n, read: true }));
        saveHistory(updatedHistory);
    }, [history]);

    const clearNotifications = useCallback(() => {
        saveHistory([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications: history, addNotification, markAllAsRead, clearNotifications, markOneAsRead }}>
            {children}
            <div className="fixed bottom-5 right-5 z-[100] space-y-3">
                {toasts.map(toast => (
                    <ToastComponent key={toast.id} toast={toast} onRemove={removeToast} />
                ))}
            </div>
        </NotificationContext.Provider>
    );
};

