// src/components/ui/UserAvatar.tsx
import React from 'react';
import { themes } from '../../config/theme';

interface UserAvatarProps {
    name?: string;
    photoUrl?: string; // Preparado para el futuro
    theme?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const UserAvatar = ({ name, photoUrl, theme, size = 'md', className = '' }: UserAvatarProps) => {
    // 1. Normalizar: Convertir a minúsculas para evitar problemas (ej. "Blue" vs "blue")
    const normalizedTheme = theme?.toLowerCase();
    
    // 2. Validar: ¿Existe este tema en nuestro catálogo?
    const isValidTheme = normalizedTheme && (normalizedTheme in themes);

    // 3. Seleccionar Key: Si es válido usarlo, si no, generar uno basado en el nombre (Hash)
    // Esto asegura que si el usuario no tiene tema, al menos tenga un color consistente y no todos sean iguales.
    let themeKey = isValidTheme ? normalizedTheme : undefined;

    if (!themeKey) {
        const safeName = name || '?';
        // Excluimos colores muy apagados para el fallback automático
        const keys = Object.keys(themes).filter(k => !['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(k));
        let hash = 0;
        for (let i = 0; i < safeName.length; i++) {
            hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
        }
        themeKey = keys[Math.abs(hash) % keys.length];
    }

    // Fallback final de seguridad
    const themeColors = themes[themeKey as keyof typeof themes] || themes.indigo;
    
    const sizeClasses = {
        sm: 'w-6 h-6 text-[10px]',
        md: 'w-8 h-8 text-xs',
        lg: 'w-10 h-10 text-sm',
        xl: 'w-12 h-12 text-base'
    };

    const initial = name ? name.charAt(0).toUpperCase() : '?';

    if (photoUrl) {
        return (
            <img 
                src={photoUrl} 
                alt={name || 'User'} 
                className={`rounded-full object-cover border-2 border-white shadow-sm shrink-0 ${sizeClasses[size]} ${className}`} 
            />
        );
    }

    return (
        <div 
            className={`rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm shrink-0 ${sizeClasses[size]} ${className}`}
            style={{ 
                backgroundColor: themeColors[100], 
                color: themeColors[700],
            }}
            title={name}
        >
            {initial}
        </div>
    );
};
