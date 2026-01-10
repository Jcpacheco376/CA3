import React from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon } from 'lucide-react';
import { Tooltip } from '../../components/ui/Tooltip';
import { FilterPopover } from '../../components/ui/FilterPopover'; 
import { DateRangePicker } from '../../components/ui/DateRangePicker';

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
    selectionMode?: 'multiple' | 'single';
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
    currentDate: Date;
    onDateChange: (date: Date) => void;
    showSearch?: boolean;
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
    currentDate,
    onDateChange,
    showSearch = true
}) => {

    return (
        <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                
                {/* SECCIÓN IZQUIERDA: Búsqueda y Filtros */}
                <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                    
                    {/* BUSCADOR CON TU ESTILO (Sombra interna + Transición de ancho) */}
                    {showSearch && (
                        <div className="relative group w-full lg:w-48 transition-all duration-300 focus-within:lg:w-64">
                            <SearchIcon className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 
                                         focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:bg-white 
                                         transition-all shadow-inner"
                                placeholder="Buscar empleado..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}

                    {/* FILTROS (Separador vertical sutil si hay filtros) */}
                    {filterConfigurations.some(c => c.isActive) && showSearch && (
                        <div className="hidden lg:block w-px h-8 bg-slate-200 mx-1"></div>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {filterConfigurations.map(config => (
                            (config.isActive && config.options.length > 0) && (
                                <FilterPopover
                                    key={config.id}
                                    icon={config.icon}
                                    title={config.title}
                                    options={config.options}
                                    selectedValues={config.selectedValues}
                                    onChange={config.onChange}
                                    selectionMode={config.selectionMode}
                                />
                            )
                        ))}
                    </div>
                </div>

                {/* SECCIÓN DERECHA: Navegación de Fechas (Estilo unificado) */}
                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-between lg:justify-end bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm">
                     
                     {/* Selector de Modo */}
                     <div className="flex items-center">
                        {['week', 'fortnight', 'month'].map((mode) => (
                            <button 
                                key={mode} 
                                onClick={() => setViewMode(mode as any)}
                                className={`
                                    px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
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

                    {/* Controles de Fecha */}
                    <div className="flex items-center gap-1">
                        <Tooltip text="Periodo anterior">
                            <button 
                                onClick={handleDatePrev} 
                                className="p-1.5 text-slate-500 hover:bg-white hover:text-[--theme-600] hover:shadow-sm rounded-lg transition-all"
                            >
                                <ChevronLeft size={18} />
                            </button>
                        </Tooltip>
                        
                        <div className="min-w-[140px] flex justify-center">
                            <DateRangePicker 
                                currentDate={currentDate}
                                onDateChange={onDateChange}
                                viewMode={viewMode}
                                rangeLabel={rangeLabel}
                            />
                        </div>
                        
                        <Tooltip text="Periodo siguiente">
                            <button 
                                onClick={handleDateNext} 
                                className="p-1.5 text-slate-500 hover:bg-white hover:text-[--theme-600] hover:shadow-sm rounded-lg transition-all"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </Tooltip>
                    </div>

                </div>
            </div>
        </div>
    );
};