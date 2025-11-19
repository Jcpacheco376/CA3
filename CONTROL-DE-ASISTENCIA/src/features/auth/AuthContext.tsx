// src/features/auth/AuthContext.tsx
import React, { createContext, useState, useContext, ReactNode, useCallback, useMemo, useEffect } from 'react';
import { User } from '../../types'; 
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';
const SESSION_STORAGE_KEY = 'app_session';
const APP_DATA_VERSION = '1.0.6'; 

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
        // Redirigir a la raíz (que mostrará el Login)
        window.location.href = '/'; 
    }, []);

    // --- NUEVO: Interceptor Global de Fetch ---
    // Este efecto "vigila" todas las peticiones de la app. Si alguna devuelve 401, cierra la sesión.
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (input, init) => {
            try {
                const response = await originalFetch(input, init);

                // Si la respuesta es 401 (Unauthorized)
                if (response.status === 401) {
                    // Obtenemos la URL para no interceptar el login (es normal que falle si la clave está mal)
                    const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
                    
                    // Si NO es la ruta de login, entonces es una sesión caducada -> FORCE LOGOUT
                    if (url && !url.includes('/auth/login')) {
                        console.warn("Sesión inválida detectada globalmente (401). Ejecutando logout automático...");
                        logout();
                        // Opcional: Retornar una promesa que nunca se resuelve para "congelar" la UI 
                        // y evitar que el componente muestre errores antes de redirigir.
                        // return new Promise(() => {}); 
                    }
                }
                return response;
            } catch (error) {
                throw error;
            }
        };

        // Limpieza: restaurar el fetch original si el componente se desmonta
        return () => {
            window.fetch = originalFetch;
        };
    }, [logout]);
    // --- FIN DEL INTERCEPTOR ---

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
            // El interceptor global (arriba) capturará el 401 aquí también,
            // pero mantenemos la lógica explícita por seguridad.
            const response = await fetch(`${API_BASE_URL}/users/permissions`, { 
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                 // El interceptor probablemente ya disparó el logout, pero por si acaso:
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