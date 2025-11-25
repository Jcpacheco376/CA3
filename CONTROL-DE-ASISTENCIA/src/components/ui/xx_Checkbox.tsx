// src/components/ui/Checkbox.tsx
import React from 'react';
import { Check } from 'lucide-react';

export const Checkbox = ({ id, label, checked, onChange }: {
    id: string | number,
    label: string,
    checked: boolean,
    onChange: (checked: boolean) => void,
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.checked);
    };

    return (
        <label 
            htmlFor={`cb-${id}`} 
            className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer"
        >
            {/* --- MODIFICACIÓN AQUÍ --- */}
            {/* Este div ahora contiene todos los elementos visuales */}
            <div className="relative w-5 h-5 shrink-0">
                {/* 1. El Input (invisible, pero funcional) */}
                <input 
                    id={`cb-${id}`}
                    type="checkbox" 
                    checked={checked} 
                    onChange={handleChange}
                    className="
                        peer absolute inset-0 w-full h-full 
                        appearance-none 
                        focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[--theme-500]
                        rounded-md
                    "
                />
                
                {/* 2. El Fondo (reacciona al input 'peer') */}
                <div className="
                    absolute inset-0 w-full h-full 
                    rounded-md border-2 border-slate-300
                    peer-checked:bg-[--theme-500] peer-checked:border-[--theme-500]
                    transition-colors
                    pointer-events-none
                "></div>
                
                {/* 3. El Ícono Check (reacciona al input 'peer') */}
                <Check 
                    size={14} 
                    className={`
                        absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                        text-white pointer-events-none 
                        transition-opacity opacity-0 
                        peer-checked:opacity-100
                    `} 
                />
            </div>
            {/* --- FIN DE LA MODIFICACIÓN --- */}

            <span className="text-sm text-slate-700 select-none truncate" title={label}>
                {label}
            </span>
        </label>
    );
};