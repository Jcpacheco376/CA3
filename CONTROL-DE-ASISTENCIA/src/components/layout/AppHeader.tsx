// src/components/layout/AppHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { User } from '../../types';
import { useNotification } from '../../context/NotificationContext.tsx';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';


const NotificationPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { notifications, markAllAsRead, clearNotifications, markOneAsRead } = useNotification();
    const panelRef = useRef<HTMLDivElement>(null);
    const [show, setShow] = useState(isOpen);

    useEffect(() => {
        let autoCloseTimer: NodeJS.Timeout;
        if (isOpen) {
            setShow(true);
            autoCloseTimer = setTimeout(() => onClose(), 10000);
        } else {
            const exitTimer = setTimeout(() => setShow(false), 200);
            return () => clearTimeout(exitTimer);
        }
        return () => clearTimeout(autoCloseTimer);
    }, [isOpen, onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    if (!show) return null;
    
    const typeIcons = {
        success: <CheckCircle2 className="text-green-500" />,
        error: <AlertCircle className="text-red-500" />,
        info: <Info className="text-blue-500" />
    };

    return (
        <div ref={panelRef} className={`absolute top-14 right-0 w-80 bg-white rounded-lg shadow-xl border border-slate-200 z-50 ${isOpen ? 'animate-fade-in' : 'animate-fade-out'}`}>
            <div className="p-3 flex justify-between items-center border-b">
                <h3 className="font-semibold text-slate-800">Notificaciones</h3>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100"><X size={18} /></button>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                    <p className="text-center text-slate-500 text-sm p-6">No hay notificaciones</p>
                ) : (
                    notifications.map(notif => (
                        <button key={notif.id} onClick={() => markOneAsRead(notif.id)} className={`w-full text-left p-3 border-b border-slate-100 flex items-start gap-3 transition-colors hover:bg-slate-100 ${!notif.read ? 'bg-blue-50' : 'bg-white'}`}>
                            <div className="mt-1 shrink-0">{typeIcons[notif.type]}</div>
                            <div className="flex-grow">
                                <p className="font-semibold text-sm text-slate-700">{notif.title}</p>
                                <p className="text-sm text-slate-500">{notif.message}</p>
                                <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(notif.timestamp, { addSuffix: true, locale: es })}</p>
                            </div>
                        </button>
                    ))
                )}
            </div>
            {notifications.length > 0 && (
                <div className="p-2 bg-slate-50 rounded-b-lg flex justify-between">
                    <button onClick={markAllAsRead} className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"><Check size={14}/> Marcar como leído</button>
                    <button onClick={clearNotifications} className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"><Trash2 size={14}/> Borrar todo</button>
                </div>
            )}
        </div>
    )
}

export const AppHeader = ({ user, onProfileClick, themeColors }: { user: User, onProfileClick: () => void, themeColors: any }) => {
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [isBellAnimating, setIsBellAnimating] = useState(false);
    const { notifications } = useNotification();
    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        if (notifications.length > 0) {
            if (!notifications[0].read) {
                setIsBellAnimating(true);
                const timer = setTimeout(() => setIsBellAnimating(false), 600);
                return () => clearTimeout(timer);
            }
        }
    }, [notifications]);

    const avatarInitial = user?.NombreCompleto ? user.NombreCompleto.charAt(0).toUpperCase() : '?';
    const fullName = user?.NombreCompleto || 'Cargando...';
    const roles = user?.Roles?.map(r => r.NombreRol).join(', ') || 'Usuario';

    return (
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-end px-6 shrink-0">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button onClick={() => setIsPanelOpen(prev => !prev)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500">
                        <Bell size={20} className={isBellAnimating ? 'animate-ring' : ''} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                        )}
                    </button>
                    <NotificationPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />
                </div>
                <button onClick={onProfileClick} className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-100">
                    <img 
                        src={`https://placehold.co/40x40/${themeColors[100].substring(1)}/${themeColors[900].substring(1)}?text=${avatarInitial}`} 
                        alt="Avatar" 
                        className="w-9 h-9 rounded-full" 
                    />
                    <div>
                        <p className="text-sm font-semibold text-slate-700 text-left">{fullName}</p>
                        <p className="text-xs text-slate-500 text-left">{roles}</p>
                    </div>
                </button>
            </div>
        </header>
    );
};

