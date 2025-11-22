// src/App.tsx
import React, { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './features/auth/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { MainLayout } from './components/layout/MainLayout';
import { View } from './types';
import { themes } from './config/theme';
import { AppProvider } from './context/AppContext';
import { ForcePasswordChangeModal } from './features/auth/ForcePasswordChangeModal';
import { NotificationProvider } from './context/NotificationContext';

function AppContent() {
    const auth = useAuth();
    const [theme, setTheme] = useState(auth.user?.Theme || 'indigo');
    const [activeView, setActiveView] = useState<View>('attendance_weekly');
    
    useEffect(() => {
        setTheme(auth.user?.Theme || 'indigo');
    }, [auth.user?.Theme]);

    const themeColors = themes[theme] || themes.indigo;

    // --- SOLUCIÓN AL PROBLEMA DE COLORES EN PORTALES ---
    // Aplicamos las variables CSS al :root (html) para que estén disponibles
    // GLOBALMENTE, incluyendo Modales, Popovers y DateRangePicker que usan Portals.
    useEffect(() => {
        const root = document.documentElement;
        Object.entries(themeColors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
        
        // Limpieza opcional (no estrictamente necesaria en SPA, pero buena práctica)
        return () => {
            // No removemos las variables para evitar parpadeos al desmontar
        };
    }, [themeColors]);
    // --- FIN DE LA SOLUCIÓN ---
    
    const handleSetTheme = (newTheme: string) => {
        if (!auth.user) return;
        setTheme(newTheme);
    };
    
    if (!auth.user) {
        return <LoginPage />;
    }
    
    if (auth.user.DebeCambiarPassword) {
        // Ya no necesitamos el style={{...}} aquí
        return (
             <ForcePasswordChangeModal user={auth.user} />
        );
    }

    // Ya no necesitamos el style={{...}} aquí tampoco
    return (
        <MainLayout 
            user={auth.user}
            onLogout={auth.logout}
            activeView={activeView}
            setActiveView={setActiveView}
            setTheme={handleSetTheme}
            themeColors={themeColors}
        />
    );
}

function AppContentWrapper() {
    const { user } = useAuth();
    const initialAnimationState = user?.AnimationsEnabled ?? true;
    return (
        <AppProvider initialAnimationState={initialAnimationState}>
            <AppContent />
        </AppProvider>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <NotificationProvider>
                <AppContentWrapper />
            </NotificationProvider>
        </AuthProvider>
    );
}