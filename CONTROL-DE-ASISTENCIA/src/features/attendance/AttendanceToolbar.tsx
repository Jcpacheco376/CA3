import React, { useState, useEffect, useMemo, useContext } from 'react';
import { ChevronLeft, ChevronRight, Search as SearchIcon, Lock, Briefcase, Building, Tag, MapPin } from 'lucide-react';
import { addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { Tooltip } from '../../components/ui/Tooltip';
import { FilterPopover } from '../../components/ui/FilterPopover'; 
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { useAuth } from '../auth/AuthContext'; 
import { useAttendanceToolbarContext } from './AttendanceToolbarContext';

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
    // Búsqueda (Opcionales, si no se pasan usa filters.search)
    searchTerm?: string;
    setSearchTerm?: (value: string) => void;
    
    // Configuración Manual (Opcional)
    filterConfigurations?: FilterConfig[]; 
    
    // Estado Compartido (Necesario para el modo automático)
    filters?: { groups?: any[], depts?: any[], puestos?: any[], estabs?: any[], search?: string };
    setFilters?: React.Dispatch<React.SetStateAction<any>>;

    viewMode?: 'week' | 'fortnight' | 'month'; // Ahora opcionales
    setViewMode?: (value: 'week' | 'fortnight' | 'month') => void;
    rangeLabel?: string;
    currentDate?: Date;
    onDateChange?: (date: Date) => void;
    showSearch?: boolean;
    enablePayrollSync?: boolean; 
    weekMode?: 'base' | 'natural';
    setWeekMode?: (mode: 'base' | 'natural') => void;
    allowNaturalWeek?: boolean;
}

export const AttendanceToolbar: React.FC<AttendanceToolbarProps> = ({
    searchTerm,
    setSearchTerm,
    filterConfigurations, 
    filters: propFilters,              
    setFilters: propSetFilters,           
    viewMode: propViewMode,
    setViewMode: propSetViewMode,
    rangeLabel: propRangeLabel,
    currentDate: propCurrentDate,
    onDateChange: propOnDateChange,
    showSearch = true,
    enablePayrollSync = false,
    weekMode: propWeekMode,
    setWeekMode: propSetWeekMode,
    allowNaturalWeek = false
}) => {
    const { user } = useAuth();
    const [isWeekModeHovered, setIsWeekModeHovered] = useState(false);
    const [isPeriodHovered, setIsPeriodHovered] = useState(false);
    
    // --- CONFIGURACIÓN DE UI ---
    // true = Modo retráctil (ahorra espacio), false = Modo fijo (siempre visible)
    const IS_WEEK_MODE_RETRACTABLE = true;
    const IS_PERIOD_MODE_RETRACTABLE = false;
    
    // --- 0. CONTEXTO HÍBRIDO ---
    // Intentamos obtener datos del contexto de forma segura
    let context = null;
    try { context = useAttendanceToolbarContext(); } catch (e) { /* Ignorar si no hay provider */ }

    // Prioridad: Props > Contexto > Default
    const filters = propFilters || context?.filters;
    const setFilters = propSetFilters || context?.setFilters;
    const viewMode = propViewMode || context?.viewMode || 'week';
    const setViewMode = propSetViewMode || context?.setViewMode;
    const rangeLabel = propRangeLabel || context?.rangeLabel || '';
    const currentDate = propCurrentDate || context?.currentDate || new Date();
    // Mapeamos setCurrentDate del contexto a onDateChange
    const onDateChange = propOnDateChange || context?.setCurrentDate;
    const weekMode = propWeekMode || context?.weekMode || 'base';
    const setWeekMode = propSetWeekMode || context?.setWeekMode;

    // --- 1. MANEJO DE BÚSQUEDA UNIFICADO ---
    const effectiveSearchTerm = searchTerm ?? filters?.search ?? '';
    
    const handleSearchChange = (val: string) => {
        if (setSearchTerm) {
            setSearchTerm(val);
        } else if (setFilters) {
            setFilters((prev: any) => ({ ...prev, search: val }));
        }
    };

    // --- 2. GENERACIÓN AUTOMÁTICA DE FILTROS ---
    const activeConfigs = useMemo(() => {
        // A) Si el padre manda configuración manual (incluso vacía), la usamos.
        if (typeof filterConfigurations !== 'undefined') return filterConfigurations;

        // B) Si no, construimos los defaults.
        // Requerimos que existan los setters para poder funcionar
        // if (!setFilters) return [];

        const currentFilters = filters || { groups: [], depts: [], puestos: [], estabs: [] };

        const defaults: FilterConfig[] = [
            {
                id: 'gruposNomina',
                title: 'Grupos Nómina',
                icon: <Briefcase size={16} />,
                options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [],
                selectedValues: currentFilters.groups || [],
                onChange: (vals) => setFilters && setFilters((prev: any) => ({ ...prev, groups: vals as number[] })),
                isActive: user?.activeFilters?.gruposNomina ?? true,
                selectionMode: enablePayrollSync ? 'single' : 'multiple'
            },
            {
                id: 'departamentos',
                title: 'Departamentos',
                icon: <Building size={16} />,
                options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [],
                selectedValues: currentFilters.depts || [],
                onChange: (vals) => setFilters && setFilters((prev: any) => ({ ...prev, depts: vals as number[] })),
                isActive: user?.activeFilters?.departamentos ?? true
            },
            {
                id: 'puestos',
                title: 'Puestos',
                icon: <Tag size={16} />,
                options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [],
                selectedValues: currentFilters.puestos || [],
                onChange: (vals) => setFilters && setFilters((prev: any) => ({ ...prev, puestos: vals as number[] })),
                isActive: user?.activeFilters?.puestos ?? true
            },
            {
                id: 'establecimientos',
                title: 'Establecimientos',
                icon: <MapPin size={16} />,
                options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [],
                selectedValues: currentFilters.estabs || [],
                onChange: (vals) => setFilters && setFilters((prev: any) => ({ ...prev, estabs: vals as number[] })),
                isActive: user?.activeFilters?.establecimientos ?? true
            }
        ];

        // Filtramos solo los que están activos y tienen opciones para mostrar
        return defaults.filter(c => c.isActive && c.options.length > 0);

    }, [filterConfigurations, user, filters, setFilters, enablePayrollSync]);


    // --- 3. AUTOCORRECCIÓN (Single Mode) ---
    useEffect(() => {
        activeConfigs.forEach(config => {
            if (config.isActive && config.selectionMode === 'single' && config.selectedValues.length > 1) {
                const fixedValue = [config.selectedValues[0]];
                config.onChange(fixedValue);
            }
        });
    }, [activeConfigs]);

    // --- 4. LÓGICA DE NÓMINA (Sync Periodo) ---
    const activeGroupId = useMemo(() => {
        if (!enablePayrollSync) return null;
        // Buscamos 'gruposNomina' O 'groups' para compatibilidad
        const groupFilter = activeConfigs.find(f => f.id === 'gruposNomina' || f.id === 'groups');
        return (groupFilter && groupFilter.selectedValues.length > 0) ? groupFilter.selectedValues[0] : null;
    }, [enablePayrollSync, activeConfigs]);

    useEffect(() => {
        if (!enablePayrollSync || !activeGroupId || !user?.GruposNomina) return;

        // Asegurar que tenemos un setter válido (del contexto o de props)
        const updateViewMode = setViewMode || context?.setViewMode;
        if (!updateViewMode) return;

        // Comparamos string vs string para evitar errores de tipo (1 vs "1")
        const groupInfo = user.GruposNomina.find(g => String(g.GrupoNominaId) === String(activeGroupId));

        if ((groupInfo as any)?.Periodo) {
            const p = (groupInfo as any).Periodo.toUpperCase();
            if (p === 'SEMANAL' && viewMode !== 'week') updateViewMode('week');
            else if (p === 'QUINCENAL' && viewMode !== 'fortnight') updateViewMode('fortnight');
            else if (p === 'MENSUAL' && viewMode !== 'month') updateViewMode('month');
        }
    }, [activeGroupId, user, viewMode, setViewMode, context, enablePayrollSync]);

    const isPeriodLocked = !!activeGroupId;

    // --- 5. NAVEGACIÓN DE FECHAS INTERNA ---
    const handleInternalPrev = () => {
        let newDate = new Date(currentDate);
        switch (viewMode) {
            case 'fortnight':
                if (currentDate.getDate() <= 15) {
                    newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 16);
                } else {
                    newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                }
                break;
            case 'month':
                newDate = subMonths(currentDate, 1);
                break;
            case 'week':
            default:
                newDate = subWeeks(currentDate, 1);
                break;
        }
        if (onDateChange) onDateChange(newDate);
    };

    const handleInternalNext = () => {
        let newDate = new Date(currentDate);
        switch (viewMode) {
            case 'fortnight':
                if (currentDate.getDate() <= 15) {
                    newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16);
                } else {
                    newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                }
                break;
            case 'month':
                newDate = addMonths(currentDate, 1);
                break;
            case 'week':
            default:
                newDate = addWeeks(currentDate, 1);
                break;
        }
        if (onDateChange) onDateChange(newDate);
    };

    return (
        <div className="p-4 border-b border-slate-200 bg-white rounded-t-lg">
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                
                {/* IZQUIERDA: Buscador + Filtros */}
                <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
                    {showSearch && (
                        <Tooltip text="Buscar por nombre o ID de empleado">
                            <div className="relative group w-full lg:w-48 transition-all duration-300 focus-within:lg:w-64">
                                <SearchIcon className="absolute left-3 top-2.5 text-slate-400 group-focus-within:text-[--theme-500] transition-colors" size={16} />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 placeholder-slate-400 
                                            focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:bg-white 
                                            transition-all shadow-inner"
                                    placeholder="Buscar empleado..."
                                    value={effectiveSearchTerm}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>
                        </Tooltip>
                    )}

                    {activeConfigs.length > 0 && showSearch && (
                        <div className="hidden lg:block w-px h-8 bg-slate-200 mx-1"></div>
                    )}

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {activeConfigs.map(config => (
                            <FilterPopover
                                key={config.id}
                                icon={config.icon}
                                title={config.title}
                                options={config.options}
                                selectedValues={config.selectedValues}
                                onChange={config.onChange}
                                selectionMode={config.selectionMode}
                            />
                        ))}
                    </div>
                </div>

                {/* DERECHA: Fechas */}
                <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-between lg:justify-end bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm relative">
                     <div className="flex items-center relative gap-2">
                        {setWeekMode && !isPeriodLocked && allowNaturalWeek && (
                            <div 
                                className="flex items-center bg-slate-200/50 rounded-lg p-0.5 gap-1"
                                onMouseEnter={() => setIsWeekModeHovered(true)}
                                onMouseLeave={() => setIsWeekModeHovered(false)}
                            >
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${(!IS_WEEK_MODE_RETRACTABLE || weekMode === 'base' || isWeekModeHovered) ? 'max-w-[50px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                    <Tooltip text="Semana según corte de Nómina">
                                        <button 
                                            onClick={() => setWeekMode('base')}
                                            className={`w-full px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${weekMode === 'base' ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            CORTE
                                        </button>
                                    </Tooltip>
                                </div>
                                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${(!IS_WEEK_MODE_RETRACTABLE || weekMode === 'natural' || isWeekModeHovered) ? 'max-w-[50px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                    <Tooltip text="Semana Natural (Lunes-Domingo)">
                                        <button 
                                            onClick={() => setWeekMode('natural')}
                                            className={`w-full px-2 py-1 rounded-md text-[10px] font-bold transition-all whitespace-nowrap ${weekMode === 'natural' ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            NAT
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        )}
                         <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                        <div 
                            className="flex items-center relative bg-slate-200/50 rounded-lg p-0.5 gap-1"
                            onMouseEnter={() => !isPeriodLocked && setIsPeriodHovered(true)}
                            onMouseLeave={() => setIsPeriodHovered(false)}
                        >
                            {isPeriodLocked && (
                                <div className="absolute inset-0 z-10 ">
                                    <Tooltip text="Periodo definido por la nómina seleccionada.">
                                        <div className="w-full h-full"></div>
                                    </Tooltip>
                                </div>
                            )}
                            {['week', 'fortnight', 'month'].map((mode) => {
                                const isActive = viewMode === mode;
                                const isVisible = !IS_PERIOD_MODE_RETRACTABLE || isActive || isPeriodHovered;
                                const label = mode === 'week' ? 'Semana' : mode === 'fortnight' ? 'Quincena' : 'Mes';

                                return (
                                    <div key={mode} className={`transition-all duration-300 ease-in-out overflow-hidden ${isVisible ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                        <button 
                                            onClick={() => !isPeriodLocked && setViewMode && setViewMode(mode as any)}
                                            disabled={isPeriodLocked}
                                            className={`
                                                w-full px-3 py-1 rounded-md text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1 whitespace-nowrap
                                                ${isActive 
                                                    ? 'bg-white text-[--theme-600] shadow-sm ring-1 ring-black/5' 
                                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                                }
                                                ${isPeriodLocked && !isActive ? 'opacity-40 grayscale' : ''}
                                            `}
                                        >
                                            {isPeriodLocked && isActive && <Lock size={10} className="opacity-70" />}
                                            {label}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
                    <div className="flex items-center gap-1">
                        <Tooltip text="Anterior">
                            <button onClick={handleInternalPrev} className="p-1.5 text-slate-500 hover:bg-white hover:text-[--theme-600] hover:shadow-sm rounded-lg transition-all"><ChevronLeft size={18} /></button>
                        </Tooltip>
                        <div className="min-w-[140px] flex justify-center">
                            <DateRangePicker currentDate={currentDate} onDateChange={onDateChange!} viewMode={viewMode} rangeLabel={rangeLabel} />
                        </div>
                        <Tooltip text="Siguiente">
                            <button onClick={handleInternalNext} className="p-1.5 text-slate-500 hover:bg-white hover:text-[--theme-600] hover:shadow-sm rounded-lg transition-all"><ChevronRight size={18} /></button>
                        </Tooltip>
                    </div>
                </div>
            </div>
        </div>
    );
};