// src/features/auth/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { User } from '../../types'; 
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';

const SESSION_STORAGE_KEY = 'app_session';

// --- CAMBIO: Exportamos la versión para usarla en toda la app ---
export const APP_VERSION = '1.0.6'; 

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<string | true>;
    logout: () => void;
    can: (permission: string) => boolean;
    updateUserPreferences: (prefs: Partial<Pick<User, 'Theme' | 'AnimationsEnabled' | 'DebeCambiarPassword'>>) => void;
    getToken: () => string | null;
    checkSessionStatus: () => Promise<void>; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            try {
                // Usamos la variable exportada APP_VERSION
                const { version, user: savedUser } = JSON.parse(savedSession);
                if (version === APP_VERSION) return savedUser;
            } catch (e) { localStorage.removeItem(SESSION_STORAGE_KEY); }
        }
        return null;
    });

    const getToken = useCallback((): string | null => {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            try { return JSON.parse(savedSession).token; } catch (e) { return null; }
        }
        return null;
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        window.location.href = '/'; 
    }, []);

    useEffect(() => {
        const originalFetch = window.fetch;
        window.fetch = async (input, init) => {
            try {
                const response = await originalFetch(input, init);
                if (response.status === 401) {
                    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
                    if (url && !url.includes('/auth/login')) {
                        console.warn("Sesión inválida detectada globalmente (401). Ejecutando logout automático...");
                        logout();
                    }
                }
                return response;
            } catch (error) {
                throw error;
            }
        };
        return () => { window.fetch = originalFetch; };
    }, [logout]);

    const login = useCallback(async (username: string, password: string): Promise<string | true> => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return errorData.message || "Credenciales inválidas.";
            }
            
            const { token, user: userData } = await response.json(); 
            
            setUser(userData);
            // Usamos APP_VERSION aquí también
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: APP_VERSION, user: userData, token }));
            return true;
            
        } catch (error: any) {
            console.error("Error en el flujo de login:", error);
            return error.message || "No se pudo conectar con el servidor.";
        }
    }, []);

    const can = useCallback((permission: string): boolean => {
        if (!user?.permissions) return false;
        return Object.prototype.hasOwnProperty.call(user.permissions, permission);
    }, [user]);

    const updateUserPreferences = useCallback((prefs: Partial<Pick<User, 'Theme' | 'AnimationsEnabled' | 'DebeCambiarPassword'>>) => {
        if (user) {
            const updatedUser = { ...user, ...prefs };
            setUser(updatedUser);
            const token = getToken();
            // Usamos APP_VERSION aquí también
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: APP_VERSION, user: updatedUser, token }));
        }
    }, [user, getToken]);

    const checkSessionStatus = useCallback(async () => {
        if (!user) return;
        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE_URL}/users/permissions`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                 logout(); 
                 return;
            } 
        } catch (error) {
            console.warn("Error de red al verificar sesión (ignorado):", error);
        }
    }, [user, getToken, logout]);

    useEffect(() => {
        if (!user) return;
        checkSessionStatus();
        const interval = setInterval(() => { checkSessionStatus(); }, 60000); 
        return () => clearInterval(interval);
    }, [user, checkSessionStatus]);

    const value = useMemo(() => ({
        user, login, logout, can, updateUserPreferences, getToken, checkSessionStatus
    }), [user, login, logout, can, updateUserPreferences, getToken, checkSessionStatus]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};