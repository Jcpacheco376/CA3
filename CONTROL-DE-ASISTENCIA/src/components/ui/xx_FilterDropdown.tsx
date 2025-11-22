// src/components/ui/FilterDropdown.tsx
import React, { useState, useMemo } from 'react';
import { Checkbox } from './Checkbox'; // Reutilizamos el checkbox
import { FilterOption } from '../../features/attendance/AttendanceToolbar'; // Reutilizamos el tipo
import { Search } from 'lucide-react';

interface FilterDropdownProps {
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (newSelectedValues: (string | number)[]) => void;
}

export const FilterDropdown = ({ title, options, selectedValues, onChange }: FilterDropdownProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt => 
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    // --- Lógica para "Todos" (Soluciona Req 5 y 6) ---
    // 1. "Todos" solo se muestra si hay más de 1 opción
    const showSelectAll = options.length > 1;
    
    // 2. "Todos" está marcado (checked) solo si TODAS las opciones están seleccionadas
    // ¡No más "indeterminate"! (cuadrito vacío)
    const isAllSelected = useMemo(() => {
        if (options.length === 0) return false;
        return selectedValues.length === options.length;
    }, [options, selectedValues]);

    const handleSelectAll = (isChecked: boolean) => {
        onChange(isChecked ? options.map(o => o.value) : []);
    };

    const handleOptionChange = (isChecked: boolean, value: string | number) => {
        if (isChecked) {
            onChange([...selectedValues, value]);
        } else {
            onChange(selectedValues.filter(v => v !== value));
        }
    };

    return (
        <div className="w-72 space-y-3"> {/* 320px de ancho - padding = w-72 */}
            <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
            
            {/* Buscador interno (solo si hay muchas opciones) */}
            {options.length > 10 && (
                <div className="relative">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar en filtro..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm"
                    />
                </div>
            )}
            
            {/* Lista de Opciones */}
            <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                {showSelectAll && (
                    <div className="border-b border-slate-200 pb-1 mb-1">
                        <Checkbox
                            id={`${title}-all`}
                            label={`Todos los ${title.toLowerCase()}`}
                            checked={isAllSelected}
                            onChange={handleSelectAll}
                        />
                    </div>
                )}
                
                {filteredOptions.map(option => (
                    <Checkbox
                        key={option.value}
                        id={option.value}
                        label={option.label}
                        checked={selectedValues.includes(option.value)}
                        onChange={(isChecked) => handleOptionChange(isChecked, option.value)}
                    />
                ))}
            </div>
        </div>
    );
};