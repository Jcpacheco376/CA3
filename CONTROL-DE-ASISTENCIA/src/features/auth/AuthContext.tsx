// src/features/auth/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo } from 'react';
import { User } from '../../types';
import { API_BASE_URL } from '../../config/api';

const SESSION_STORAGE_KEY = 'app_session';
const APP_DATA_VERSION = '1.0.6';

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<string | true>;
    logout: () => void;
    can: (permission: string) => boolean;
    updateUserPreferences: (prefs: Partial<Pick<User, 'Theme' | 'AnimationsEnabled' | 'DebeCambiarPassword'>>) => void;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
        if (savedSession) {
            try {
                const { version, user: savedUser } = JSON.parse(savedSession);
                if (version === APP_DATA_VERSION) return savedUser;
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

    const login = useCallback(async (username: string, password: string): Promise<string | true> => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: APP_DATA_VERSION, user: userData, token }));
            return true;
            
        } catch (error: any) {
            console.error("Error en el flujo de login:", error);
            return error.message || "No se pudo conectar con el servidor.";
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
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
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: APP_DATA_VERSION, user: updatedUser, token }));
        }
    }, [user, getToken]);

    const value = useMemo(() => ({
        user, login, logout, can, updateUserPreferences, getToken
    }), [user, login, logout, can, updateUserPreferences, getToken]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

