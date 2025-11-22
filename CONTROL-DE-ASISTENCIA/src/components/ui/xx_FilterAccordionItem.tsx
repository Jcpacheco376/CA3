// src/components/ui/FilterAccordionItem.tsx
import React, { useMemo } from 'react'; // <-- Añade useMemo aquí
import { ChevronDown } from 'lucide-react';
import { FilterOption } from '../../features/attendance/AttendanceToolbar';
import { FilterDropdown } from './FilterDropdown'; // Importamos el contenido
import { Tooltip } from './Tooltip'; // Usamos el Tooltip estándar

interface FilterAccordionItemProps {
    icon: React.ReactNode;
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (newSelectedValues: (string | number)[]) => void;
    isOpen: boolean;
    onToggle: () => void;
}

export const FilterAccordionItem = ({
    icon,
    title,
    options,
    selectedValues,
    onChange,
    isOpen,
    onToggle
}: FilterAccordionItemProps) => {

    // Lógica para mostrar el estado "replegado"
    const displayLabel = useMemo(() => {
        if (selectedValues.length === 0) return `Todos`; // Ej. "Todos"
        if (selectedValues.length === 1) {
            // Si solo hay uno, muestra el nombre
            const selectedOption = options.find(o => o.value === selectedValues[0]);
            return selectedOption?.label || `(1)`; // Ej. "Ventas"
        }
        // Si hay más de uno, muestra el contador
        return `(${selectedValues.length})`; // Ej. "(3)"
    }, [selectedValues, options]);
    
    const isFiltered = selectedValues.length > 0;

    return (
        <div 
            // Contenedor principal que se expande
            className={`
                flex items-center bg-white border rounded-lg transition-all duration-300 ease-in-out
                ${isOpen 
                    ? 'border-[--theme-400] shadow-lg' 
                    : 'border-slate-300 hover:border-slate-400'
                }
            `}
        >
            {/* El botón (cápsula) que SIEMPRE está visible */}
            <Tooltip text={title}>
                <button
                    type="button"
                    onClick={onToggle}
                    // Damos más padding cuando está abierto para que se vea integrado
                    className={`flex items-center gap-2 px-3 py-2 transition-colors ${isOpen ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                    {/* El Ícono */}
                    <span className={isFiltered ? 'text-[--theme-500]' : 'text-slate-500'}>
                        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
                    </span>
                    
                    {/* La Etiqueta de Estado */}
                    <span 
                        className={`text-sm font-medium truncate max-w-[120px] ${isFiltered ? 'text-slate-800' : 'text-slate-500'}`}
                        title={displayLabel}
                    >
                        {displayLabel}
                    </span>
                    
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </Tooltip>
            
            {/* El Contenido Expandible (usa las clases de index.css) */}
            <div className={`filter-accordion-content ${isOpen ? 'filter-accordion-content-open' : ''}`}>
                <FilterDropdown 
                    title={title}
                    options={options}
                    selectedValues={selectedValues}
                    onChange={onChange}
                />
            </div>
        </div>
    );
};