// src/features/attendance/AttendanceToolbar.tsx

import React from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon, Building, Briefcase, Tag, MapPin } from 'lucide-react'; 
import { Tooltip } from '../../components/ui/Tooltip'; // <-- Importado
import { FilterPopover } from '../../components/ui/FilterPopover'; 
import { useAuth } from '../auth/AuthContext'; 

export interface FilterOption {
    value: string | number;
    label: string;
}

export interface FilterConfig {
    id: string;
    icon: React.ReactNode;
    title: string;
    options: FilterOption[];
    selectedValues: (string | number)[];
    onChange: (newSelectedValues: (string | number)[]) => void;
    isActive: boolean; 
}

interface AttendanceToolbarProps {
    searchTerm: string;
    setSearchTerm: (value: string) => void;
    filterConfigurations: FilterConfig[]; 
    viewMode: 'week' | 'fortnight' | 'month';
    setViewMode: (value: 'week' | 'fortnight' | 'month') => void;
    rangeLabel: string;
    handleDatePrev: () => void;
    handleDateNext: () => void;
}

export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
    searchTerm,
    setSearchTerm,
    filterConfigurations,
    viewMode,
    setViewMode,
    rangeLabel,
    handleDatePrev,
    handleDateNext
}) => {

 return (
        <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                
                <div className="flex items-center gap-2 w-full md:w-auto">
                    {/* Búsqueda */}
                    <Tooltip text="Busca por nombre, apellido o ID de empleado.">
                         <div className="relative flex-grow md:flex-grow-0">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Buscar empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--theme-500] md:min-w-[20rem]"/>
                        </div>
                    </Tooltip>

                    {/* Filtros Popover */}
                    {filterConfigurations.map(config => (
                        (config.isActive && config.options.length > 0) && (
                            <FilterPopover
                                key={config.id}
                                icon={config.icon}
                                title={config.title}
                                options={config.options}
                                selectedValues={config.selectedValues}
                                onChange={config.onChange}
                            />
                        )
                    ))}
                </div>

                {/* --- SECCIÓN DERECHA: FECHA (REDISENADA) --- */}
                <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                     
                     <div className="flex items-center rounded-lg border border-slate-300 p-0-5 bg-slate-100">
                        {['week', 'fortnight', 'month'].map((mode) => (
                            <button key={mode} onClick={() => setViewMode(mode as any)}
                                className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${viewMode === mode ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:bg-slate-200'}`}
                            >
                                {mode === 'week' ? 'Semana' : mode === 'fortnight' ? 'Quincena' : 'Mes'}
                            </button>
                        ))}
                    </div>
                    
                    {/* Controlador de Fecha Unificado */}
                    <div className="flex items-center rounded-lg border border-slate-300 overflow-hidden">
                        
                        {/* --- MODIFICACIÓN AQUÍ (Tooltip añadido) --- */}
                        <Tooltip text="Periodo anterior">
                            <button 
                                onClick={handleDatePrev} 
                                className="p-2 text-slate-500 hover:bg-slate-100 transition-colors border-r border-slate-300"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        </Tooltip>
                        
                        <div className="text-center w-60 md:w-64 px-3 py-1.5 bg-white">
                            <p className="font-semibold text-slate-700 whitespace-nowrap capitalize">{rangeLabel}</p>
                        </div>
                        
                        {/* --- MODIFICACIÓN AQUÍ (Tooltip añadido) --- */}
                        <Tooltip text="Periodo siguiente">
                            <button 
                                onClick={handleDateNext} 
                                className="p-2 text-slate-500 hover:bg-slate-100 transition-colors border-l border-slate-300"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </Tooltip>
                    </div>

                </div>
            </div>
        </div>
    );
};