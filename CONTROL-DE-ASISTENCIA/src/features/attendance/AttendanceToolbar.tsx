// src/features/attendance/AttendanceToolbar.tsx

import React from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react'; // Eliminados íconos no usados
// import { Button } from '../../components/ui/Modal'; // Ya no se usa Button aquí
import { Tooltip } from '../../components/ui/Tooltip';
import { FilterPopover } from '../../components/ui/FilterPopover'; 
import { DateRangePicker } from '../../components/ui/DateRangePicker'; // <-- Importar nuevo componente

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
    // Nuevas props para el DatePicker
    currentDate: Date; // Necesitamos saber la fecha actual para inicializar el calendario
    onDateChange: (date: Date) => void; // Para actualizar la fecha desde el calendario
}

export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
    searchTerm,
    setSearchTerm,
    filterConfigurations,
    viewMode,
    setViewMode,
    rangeLabel,
    handleDatePrev,
    handleDateNext,
    currentDate,   // <-- Nuevo
    onDateChange   // <-- Nuevo
}) => {

 return (
        <div className="p-4 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                
                {/* SECCIÓN IZQUIERDA: Búsqueda y Filtros */}
                <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap">
                    <Tooltip text="Busca por nombre, apellido o ID de empleado.">
                         <div className="relative flex-grow lg:flex-grow-0">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input type="text" placeholder="Buscar empleado..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[--theme-500] lg:min-w-[240px] text-sm"/>
                        </div>
                    </Tooltip>

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

                <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                     
                     <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                        {['week', 'fortnight', 'month'].map((mode) => (
                            <button 
                                key={mode} 
                                onClick={() => setViewMode(mode as any)}
                                className={`
                                    px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200
                                    ${viewMode === mode 
                                        ? 'bg-white text-[--theme-600] shadow-sm ring-1 ring-black/5' 
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                    }
                                `}
                            >
                                {mode === 'week' ? 'Semana' : mode === 'fortnight' ? 'Quincena' : 'Mes'}
                            </button>
                        ))}
                    </div>

                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                    <div className="flex items-center gap-1">
                        <Tooltip text="Periodo anterior">
                            <button 
                                onClick={handleDatePrev} 
                                className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        </Tooltip>
                        
                        <DateRangePicker 
                            currentDate={currentDate}
                            onDateChange={onDateChange}
                            viewMode={viewMode}
                            rangeLabel={rangeLabel}
                        />
                        
                        <Tooltip text="Periodo siguiente">
                            <button 
                                onClick={handleDateNext} 
                                className="p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-lg transition-colors"
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