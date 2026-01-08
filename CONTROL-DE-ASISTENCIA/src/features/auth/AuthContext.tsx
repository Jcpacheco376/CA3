// src/features/auth/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { User } from '../../types'; 
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';

const SESSION_STORAGE_KEY = 'app_session';
export const APP_DATA_VERSION = '0.9.8'; 

// --- NUEVO: Constantes para limpieza inteligente ---
const LAST_USER_KEY = 'app_last_logged_user';
const KEYS_TO_CLEAR_ON_USER_CHANGE = [
    'app_attendance_filters',            // Filtros de asistencia
    'attendance_employee_column_width',  // Ancho de columna de empleados
    // Agrega aquí otras preferencias de UI que deban reiniciarse al cambiar de usuario
];

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

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        // NOTA: No borramos LAST_USER_KEY aquí. Lo validamos al siguiente login.
        window.location.href = '/'; 
    }, []);

    // --- Interceptor Global de Fetch ---
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

        return () => {
            window.fetch = originalFetch;
        };
    }, [logout]);

    // --- LOGIN CON LIMPIEZA INTELIGENTE ---
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
            
            // --- LÓGICA DE LIMPIEZA DE PREFERENCIAS ---
            try {
                const lastUser = localStorage.getItem(LAST_USER_KEY);
                // Identificador único del usuario actual (ID o Username)
                const currentUserId = userData.UsuarioId?.toString() || userData.NombreUsuario;

                if (lastUser && lastUser !== currentUserId) {
                    console.log(`Cambio de usuario detectado (${lastUser} -> ${currentUserId}). Limpiando preferencias de UI...`);
                    KEYS_TO_CLEAR_ON_USER_CHANGE.forEach(key => {
                        localStorage.removeItem(key);
                    });
                }
                // Guardamos al nuevo usuario como el "propietario" actual de las preferencias
                localStorage.setItem(LAST_USER_KEY, currentUserId);
            } catch (e) {
                console.warn("No se pudo gestionar la limpieza de preferencias:", e);
            }
            // -------------------------------------------

            setUser(userData);
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: APP_DATA_VERSION, user: userData, token }));
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
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: APP_DATA_VERSION, user: updatedUser, token }));
        }
    }, [user, getToken]);

    // --- Polling para verificar validez de sesión ---
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

    // --- EFECTO: Polling cada 60 segundos ---
    useEffect(() => {
        if (!user) return;
        
        checkSessionStatus();

        const interval = setInterval(() => {
            checkSessionStatus();
        }, 60000); 

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