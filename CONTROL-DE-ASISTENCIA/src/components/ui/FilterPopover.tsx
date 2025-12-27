// src/components/ui/FilterPopover.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react'; // Se agregó 'Check'
import { Tooltip } from './Tooltip';

export interface FilterOption {
    value: string | number;
    label: string;
}

interface FilterPopoverProps {
    icon: React.ReactNode;
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (newSelectedValues: (string | number)[]) => void;
    selectionMode?: 'multiple' | 'single'; // Nuevo prop con valor por defecto 'multiple'
}

export const FilterPopover = ({ 
    icon, 
    title, 
    options, 
    selectedValues, 
    onChange, 
    selectionMode = 'multiple' 
}: FilterPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    const activeFilterCount = selectedValues.length;
    const isFiltered = activeFilterCount > 0;

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt => 
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    // Nueva lógica de toggle que soporta modo single y multiple
    const handleOptionToggle = (value: string | number) => {
        if (selectionMode === 'single') {
            // Modo único: selecciona solo este valor y cierra el popover
            onChange([value]);
            setIsOpen(false);
        } else {
            // Modo múltiple: toggle normal
            const newSelected = new Set(selectedValues);
            if (newSelected.has(value)) {
                newSelected.delete(value);
            } else {
                newSelected.add(value);
            }
            onChange(Array.from(newSelected));
        }
    };

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let leftPos = rect.left;
            if (leftPos + 300 > window.innerWidth) {
                leftPos = window.innerWidth - 308;
            }
            setPosition({
                top: rect.bottom + 8,
                left: leftPos,
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const PopoverContent = (
        <div
            ref={panelRef}
            className="fixed bg-white rounded-lg shadow-xl border z-50 w-72 animate-fade-in-fast p-3 space-y-2"
            style={{ top: position.top, left: position.left }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
                {/* Botón "Limpiar" solo en modo multiple y cuando hay filtros activos */}
                {isFiltered && selectionMode === 'multiple' && (
                    <button
                        onClick={() => onChange([])}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {options.length > 10 && (
                <div className="relative">
                    <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm"
                    />
                </div>
            )}

            <div className="max-h-60 overflow-y-auto pr-1">
                <div className={`py-2 ${selectionMode === 'single' ? 'space-y-1' : 'flex flex-wrap gap-2'}`}>
                    {filteredOptions.length === 0 && searchTerm && (
                        <span className="text-sm text-slate-500 italic p-2">No se encontraron coincidencias.</span>
                    )}

                    {filteredOptions.map(option => {
                        const isSelected = selectedValues.includes(option.value);

                        // Renderizado para modo 'single' (lista con check a la derecha)
                        if (selectionMode === 'single') {
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleOptionToggle(option.value)}
                                    className={`
                                        w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-between
                                        ${isSelected
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-700 hover:bg-slate-100'
                                        }
                                    `}
                                >
                                    <span>{option.label}</span>
                                    {isSelected && <Check size={16} className="text-blue-600" />}
                                </button>
                            );
                        }

                        // Renderizado por defecto (píldoras) para modo 'multiple'
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionToggle(option.value)}
                                className={`
                                    px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                    ${isSelected
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }
                                `}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center pl-2 pr-1.5 py-2 rounded-lg transition-all duration-300
                    group
                    border border-slate-300
                    bg-white hover:bg-slate-100
                    ${!isFiltered ? 'text-slate-500' : ''}
                    ${isOpen ? 'bg-slate-200 shadow-inner' : ''}
                `}
            >
                <span className={isFiltered ? 'text-[--theme-500]' : 'text-slate-400'}>
                    {React.cloneElement(icon as React.ReactElement, { size: 18 })}
                </span>
                
                <span className={`
                    text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                    ${isFiltered ? 'text-[--theme-500]' : 'text-slate-500 group-hover:text-slate-800'}
                    ${isOpen 
                        ? 'max-w-[200px] opacity-100 ml-1.5' 
                        : 'max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:ml-1.5'
                    }
                `}>
                    {title}
                </span>
                
                {isFiltered && (
                    <span className="text-xs font-bold px-1.5 py-0.5 bg-white rounded-full shadow-sm text-[--theme-600] shrink-0 ml-1.5">
                        {activeFilterCount}
                    </span>
                )}
                
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 ml-1.5`} />
            </button>
            
            {isOpen && ReactDOM.createPortal(PopoverContent, document.body)}
        </>
    );
};