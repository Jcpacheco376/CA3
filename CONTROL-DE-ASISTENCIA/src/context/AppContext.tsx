// src-FRONT/context/AppContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { API_BASE_URL } from '../config/api'; // Asegúrate de importar tu config de API
import { useAuth } from '../features/auth/AuthContext'; // Para obtener el token si es necesario

interface AppContextType {
    animationsEnabled: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
    weekStartDay: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Domingo, 1=Lunes... (Formato date-fns)
}

const AppContext = createContext<AppContextType>({
    animationsEnabled: true,
    setAnimationsEnabled: () => {},
    weekStartDay: 1, // Por defecto Lunes
});

export const useAppContext = () => useContext(AppContext);

export const AppProvider = ({ children, initialAnimationState }: { children: ReactNode, initialAnimationState: boolean }) => {
    const [animationsEnabled, setAnimationsEnabled] = useState(initialAnimationState);
    const [weekStartDay, setWeekStartDay] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(1);
    const { getToken } = useAuth(); // Asumiendo que AuthContext provee esto

    useEffect(() => {
        const fetchConfig = async () => {
            const token = getToken();
            if(!token) return;

            try {
                // Ajusta la ruta según donde hayas puesto el endpoint en catalog.routes
                const res = await fetch(`${API_BASE_URL}/catalogs/system-config`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.DIA_INICIO_SEMANA) {
                        // SQL usa 1-7, date-fns usa 0-6. Ajustamos si es necesario.
                        // Asumiendo que en SQL guardaste 1=Lunes... 7=Domingo.
                        // En date-fns: 0=Domingo, 1=Lunes... 6=Sábado.
                        
                        let day = parseInt(data.DIA_INICIO_SEMANA, 10);
                        
                        // Conversión: Si SQL 7 (Domingo) -> date-fns 0. Si SQL 1 (Lunes) -> date-fns 1.
                        const dateFnsDay = day === 7 ? 0 : day; 
                        
                        setWeekStartDay(dateFnsDay as any);
                    }
                }
            } catch (error) {
                console.error("Error cargando configuración inicial:", error);
            }
        };

        fetchConfig();
    }, [getToken]);

    return (
        <AppContext.Provider value={{ animationsEnabled, setAnimationsEnabled, weekStartDay }}>
            {children}
        </AppContext.Provider>
    );
};