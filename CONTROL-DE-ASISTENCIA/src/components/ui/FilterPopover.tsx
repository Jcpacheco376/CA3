// src/components/ui/FilterPopover.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react'; // <-- Eliminamos 'Check'
import { Tooltip } from './Tooltip'; 

export interface FilterOption {
    value: string | number;
    label: string;
}

// --- ELIMINAMOS EL 'LocalCheckbox' ---

interface FilterPopoverProps {
    icon: React.ReactNode;
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (newSelectedValues: (string | number)[]) => void;
}

export const FilterPopover = ({ icon, title, options, selectedValues, onChange }: FilterPopoverProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const [searchTerm, setSearchTerm] = useState('');

    const activeFilterCount = selectedValues.length;
    const isFiltered = activeFilterCount > 0;

    // ... (lógica de filteredOptions sin cambios) ...
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(opt => 
            opt.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    // --- ELIMINAMOS 'isAllVisibleSelected' y 'handleToggleAllVisible' ---
    
    // --- NUEVA LÓGICA DE TOGGLE ---
    const handleOptionToggle = (value: string | number) => {
        // Usamos un Set para manejar fácilmente la adición/eliminación
        const newSelected = new Set(selectedValues);
        if (newSelected.has(value)) {
            newSelected.delete(value); // Si ya existe, lo quita
        } else {
            newSelected.add(value); // Si no existe, lo añade
        }
        onChange(Array.from(newSelected)); // Convierte el Set de nuevo a un array
    };
    
    // ... (lógica de posición y cierre sin cambios) ...
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
            {/* --- MODIFICACIÓN: Header del Popover --- */}
            <div className="flex justify-between items-center">
                <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
                {/* El botón "Limpiar" solo aparece si hay filtros activos */}
                {isFiltered && (
                    <button
                        onClick={() => onChange([])} // La acción es vaciar el array
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
                        onChange={(e) => setSearchTerm(e.target.value)} // <-- Corregido typo
                        className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm"
                    />
                </div>
            )}
            
            {/* --- MODIFICACIÓN: Lista de Píldoras --- */}
            <div className="max-h-60 overflow-y-auto pr-1">
                {/* Añadimos un contenedor con padding y flex-wrap */}
                <div className="flex flex-wrap gap-2 py-2">
                    {filteredOptions.length === 0 && searchTerm && (
                        <span className="text-sm text-slate-500 italic p-2">No se encontraron coincidencias.</span>
                    )}

                    {filteredOptions.map(option => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleOptionToggle(option.value)}
                                className={`
                                    px-3 py-1.5 rounded-full text-sm font-medium transition-all
                                    ${isSelected
                                        // Estilo Activo (Azul)
                                        ? 'bg-blue-600 text-white shadow-md'
                                        // Estilo Inactivo (Gris)
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
            {/* El botón principal (con el efecto de expansión) no cambia */}
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
// // src/components/ui/FilterPopover.tsx
// import React, { useState, useRef, useEffect, useMemo } from 'react';
// import ReactDOM from 'react-dom';
// import { ChevronDown, Search, X, Check } from 'lucide-react';
// import { Tooltip } from './Tooltip'; 

// export interface FilterOption {
//     value: string | number;
//     label: string;
// }

// // --- Checkbox Local (reemplaza a Checkbox.tsx) ---
// const LocalCheckbox = ({ id, label, checked, onChange }: {
//     id: string | number,
//     label: string,
//     checked: boolean,
//     onChange: (checked: boolean) => void,
// }) => {
//     return (
//         <label 
//             htmlFor={`cb-local-${id}`} 
//             className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 cursor-pointer"
//         >
//             <div className="relative w-5 h-5 shrink-0">
//                 <input 
//                     id={`cb-local-${id}`}
//                     type="checkbox" 
//                     checked={checked} 
//                     onChange={(e) => onChange(e.target.checked)}
//                     className="
//                         peer appearance-none w-5 h-5 rounded-md
//                         focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
//                     "
//                 />
//                 <div className="
//                     absolute inset-0 w-full h-full 
//                     rounded-md border-2 border-slate-300
//                     peer-checked:bg-blue-500 peer-checked:border-blue-500
//                     transition-colors
//                     pointer-events-none
//                 "></div>
//                 <Check 
//                     size={14} 
//                     className={`
//                         absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
//                         text-white pointer-events-none 
//                         transition-opacity opacity-0 
//                         peer-checked:opacity-100
//                     `} 
//                 />
//             </div>
//             <span className="text-sm text-slate-700 select-none truncate" title={label}>
//                 {label}
//             </span>
//         </label>
//     );
// };
// // --- Fin Checkbox Local ---


// interface FilterPopoverProps {
//     icon: React.ReactNode;
//     title: string;
//     options: FilterOption[];
//     selectedValues: (string | number)[];
//     onChange: (newSelectedValues: (string | number)[]) => void;
// }

// export const FilterPopover = ({ icon, title, options, selectedValues, onChange }: FilterPopoverProps) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const triggerRef = useRef<HTMLButtonElement>(null);
//     const panelRef = useRef<HTMLDivElement>(null);
//     const [position, setPosition] = useState({ top: 0, left: 0 });
//     const [searchTerm, setSearchTerm] = useState('');

//     const activeFilterCount = selectedValues.length;
//     const isFiltered = activeFilterCount > 0;

//     // ... (lógica interna, sin cambios) ...
//     const filteredOptions = useMemo(() => {
//         if (!searchTerm) return options;
//         return options.filter(opt => 
//             opt.label.toLowerCase().includes(searchTerm.toLowerCase())
//         );
//     }, [options, searchTerm]);

//     const isAllVisibleSelected = useMemo(() => {
//         if (filteredOptions.length === 0) return false;
//         return filteredOptions.every(opt => selectedValues.includes(opt.value));
//     }, [filteredOptions, selectedValues]);

//     const handleToggleAllVisible = () => {
//         if (isAllVisibleSelected) {
//             const visibleValues = filteredOptions.map(o => o.value);
//             onChange(selectedValues.filter(v => !visibleValues.includes(v)));
//         } else {
//             const newValues = filteredOptions.map(o => o.value);
//             onChange([...new Set([...selectedValues, ...newValues])]);
//         }
//     };

//     const handleOptionChange = (isChecked: boolean, value: string | number) => {
//         if (isChecked) {
//             onChange([...selectedValues, value]);
//         } else {
//             onChange(selectedValues.filter(v => v !== value));
//         }
//     };
    
//     // ... (lógica de posición y cierre sin cambios) ...
//     useEffect(() => {
//         if (isOpen && triggerRef.current) {
//             const rect = triggerRef.current.getBoundingClientRect();
//             let leftPos = rect.left;
//             if (leftPos + 300 > window.innerWidth) {
//                 leftPos = window.innerWidth - 308;
//             }
//             setPosition({
//                 top: rect.bottom + 8,
//                 left: leftPos,
//             });
//         }
//     }, [isOpen]);

//     useEffect(() => {
//         const handleClickOutside = (event: MouseEvent) => {
//             if (
//                 panelRef.current && !panelRef.current.contains(event.target as Node) &&
//                 triggerRef.current && !triggerRef.current.contains(event.target as Node)
//             ) {
//                 setIsOpen(false);
//             }
//         };
//         document.addEventListener('mousedown', handleClickOutside);
//         return () => document.removeEventListener('mousedown', handleClickOutside);
//     }, []);


//     const PopoverContent = (
//         <div
//             ref={panelRef}
//             className="fixed bg-white rounded-lg shadow-xl border z-50 w-72 animate-fade-in-fast p-3 space-y-2"
//             style={{ top: position.top, left: position.left }}
//             onClick={(e) => e.stopPropagation()}
//         >
//             <div className="flex justify-between items-center">
//                 <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
//                 {options.length > 1 && (
//                     <button
//                         onClick={handleToggleAllVisible}
//                         className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline"
//                     >
//                         {isAllVisibleSelected ? "Limpiar" : "Seleccionar todos"}
//                     </button>
//                 )}
//             </div>
            
//             {options.length > 10 && (
//                 <div className="relative">
//                     <Search size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
//                     <input 
//                         type="text" 
//                         placeholder="Buscar..."
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.g.target.value)}
//                         className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded-md text-sm"
//                     />
//                 </div>
//             )}
            
//             <div className="max-h-60 overflow-y-auto pr-1">
//                 {filteredOptions.map(option => (
//                     <LocalCheckbox
//                         key={option.value}
//                         id={option.value}
//                         label={option.label}
//                         checked={selectedValues.includes(option.value)}
//                         onChange={(isChecked) => handleOptionChange(isChecked, option.value)}
//                     />
//                 ))}
//             </div>
//         </div>
//     );

//     return (
//         <>
//             {/* --- MODIFICACIÓN DEL BOTÓN PRINCIPAL --- */}
//             <button
//                 ref={triggerRef}
//                 type="button"
//                 onClick={() => setIsOpen(!isOpen)}
//                 className={`
//                     flex items-center pl-2 pr-1.5 py-2 rounded-lg transition-all duration-300
//                     group
//                     border border-slate-300
//                     ${/* 1. Fondo blanco en ambos casos, hover gris */''}
//                     bg-white hover:bg-slate-100
//                     ${/* 2. Color de texto gris por defecto si NO está filtrado */''}
//                     ${!isFiltered ? 'text-slate-500' : ''}
//                     ${isOpen ? 'bg-slate-200 shadow-inner' : ''}
//                 `}
//             >
//                 {/* Ícono (ya tiene la lógica correcta) */}
//                 <span className={isFiltered ? 'text-[--theme-500]' : 'text-slate-400'}>
//                     {React.cloneElement(icon as React.ReactElement, { size: 18 })}
//                 </span>
                
//                 {/* Título (con expansión) */}
//                 <span className={`
//                     text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
//                     ${/* 3. Color de texto del tema si está filtrado */''}
//                     ${isFiltered ? 'text-[--theme-500]' : 'text-slate-500 group-hover:text-slate-800'}
//                     ${/* Lógica de expansión (sin cambios) */''}
//                     ${isOpen 
//                         ? 'max-w-[200px] opacity-100 ml-1.5' 
//                         : 'max-w-0 opacity-0 group-hover:max-w-[200px] group-hover:opacity-100 group-hover:ml-1.5'
//                     }
//                 `}>
//                     {title}
//                 </span>
                
//                 {/* Badge (sin cambios, ya tiene el color del tema) */}
//                 {isFiltered && (
//                     <span className="text-xs font-bold px-1.5 py-0.5 bg-white rounded-full shadow-sm text-[--theme-600] shrink-0 ml-1.5">
//                         {activeFilterCount}
//                     </span>
//                 )}
                
//                 {/* Chevron */}
//                 <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 ml-1.5`} />
//             </button>
            
//             {isOpen && ReactDOM.createPortal(PopoverContent, document.body)}
//         </>
//     );
// };