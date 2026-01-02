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
    // CAMBIO IMPORTANTE: Estado inicial es 'dashboard'
    const [activeView, setActiveView] = useState<View>('dashboard');
    
    useEffect(() => {
        setTheme(auth.user?.Theme || 'indigo');
    }, [auth.user?.Theme]);

    const themeColors = themes[theme] || themes.indigo;

    useEffect(() => {
        const root = document.documentElement;
        Object.entries(themeColors).forEach(([key, value]) => {
            root.style.setProperty(`--theme-${key}`, value);
        });
        
        return () => {
            // No removemos las variables para evitar parpadeos al desmontar
        };
    }, [themeColors]);
    
    const handleSetTheme = (newTheme: string) => {
        if (!auth.user) return;
        setTheme(newTheme);
    };
    
    if (!auth.user) {
        return <LoginPage />;
    }
    
    if (auth.user.DebeCambiarPassword) {
        return (
             <ForcePasswordChangeModal user={auth.user} />
        );
    }

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