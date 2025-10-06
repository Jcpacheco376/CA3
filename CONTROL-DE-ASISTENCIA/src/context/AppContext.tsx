// src/context/AppContext.tsx
import React, { createContext, useState, useContext, ReactNode } from 'react';

// Definimos la estructura del contexto
interface AppContextType {
    animationsEnabled: boolean;
    setAnimationsEnabled: (enabled: boolean) => void;
}

// Creamos el contexto con un valor por defecto
const AppContext = createContext<AppContextType>({
    animationsEnabled: true,
    setAnimationsEnabled: () => {},
});

// Exportamos el hook personalizado para usar el contexto
export const useAppContext = () => useContext(AppContext);

// Exportamos el proveedor que envolverá la aplicación
export const AppProvider = ({ children, initialAnimationState }: { children: ReactNode, initialAnimationState: boolean }) => {
    const [animationsEnabled, setAnimationsEnabled] = useState(initialAnimationState);

    return (
        <AppContext.Provider value={{ animationsEnabled, setAnimationsEnabled }}>
            {children}
        </AppContext.Provider>
    );
};

