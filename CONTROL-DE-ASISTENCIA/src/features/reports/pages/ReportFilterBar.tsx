// src/features/reports/pages/ReportFilterBar.tsx
import React, { useState, useMemo } from 'react';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/Modal';
import { FilterPopover } from '../../../components/ui/FilterPopover';
import { format, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../../auth/AuthContext';

interface ReportFilterBarProps {
    onGenerate: (filters: any) => void;
    isLoading: boolean;
}

export const ReportFilterBar = ({ onGenerate, isLoading }: ReportFilterBarProps) => {
    const { user } = useAuth();
    
    // Estado del rango de fechas
    const [dateRange, setDateRange] = useState(() => {
        const now = new Date();
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    });

    // Estado de los filtros de catálogos (inicializados vacíos o con el único valor permitido)
    const [filters, setFilters] = useState({
        depts: user?.Departamentos?.length === 1 ? [user.Departamentos[0].DepartamentoId] : [],
        groups: user?.GruposNomina?.length === 1 ? [user.GruposNomina[0].GrupoNominaId] : [],
        puestos: user?.Puestos?.length === 1 ? [user.Puestos[0].PuestoId] : [],
        estabs: user?.Establecimientos?.length === 1 ? [user.Establecimientos[0].EstablecimientoId] : []
    });

    // Configuración dinámica de los filtros basada en permisos
    const filterConfigs = useMemo(() => [
        {
            id: 'departamentos', title: 'Departamentos', icon: <Filter size={18} />,
            options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [],
            selectedValues: filters.depts, onChange: (v: any) => setFilters(prev => ({ ...prev, depts: v })),
            isActive: user?.activeFilters?.departamentos
        },
        {
            id: 'gruposNomina', title: 'Grupos Nómina', icon: <Filter size={18} />,
            options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [],
            selectedValues: filters.groups, onChange: (v: any) => setFilters(prev => ({ ...prev, groups: v })),
            isActive: user?.activeFilters?.gruposNomina
        },
        // ... (puedes añadir Puestos y Establecimientos aquí si lo deseas)
    ].filter(f => f.isActive), [user, filters]);

    const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        const now = new Date();
        let newRange = { start: now, end: now };

        switch (value) {
            case 'thisWeek':
                newRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
                break;
            case 'lastWeek':
                const lastWeek = subWeeks(now, 1);
                newRange = { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
                break;
            case 'thisMonth':
                newRange = { start: startOfMonth(now), end: endOfMonth(now) };
                break;
            // Puedes añadir más casos (ej. "Quincena actual")
        }
        setDateRange(newRange);
    };

    const handleGenerateClick = () => {
        onGenerate({
            startDate: format(dateRange.start, 'yyyy-MM-dd'),
            endDate: format(dateRange.end, 'yyyy-MM-dd'),
            filters: {
                departamentos: filters.depts,
                gruposNomina: filters.groups,
                puestos: filters.puestos,
                establecimientos: filters.estabs
            }
        });
    };

    return (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
            <div className="flex flex-wrap gap-4 w-full md:w-auto items-end">
                
                {/* Selector de Periodo */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500">Periodo</label>
                    <div className="flex items-center gap-2">
                        <select 
                            className="pl-2 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[--theme-500]"
                            onChange={handlePresetChange}
                            defaultValue="thisWeek"
                        >
                            <option value="thisWeek">Esta Semana</option>
                            <option value="lastWeek">Semana Pasada</option>
                            <option value="thisMonth">Este Mes</option>
                        </select>
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-300 rounded-md text-sm text-slate-600">
                            <Calendar size={16} />
                            <span>{format(dateRange.start, 'dd MMM')} - {format(dateRange.end, 'dd MMM yyyy', { locale: es })}</span>
                        </div>
                    </div>
                </div>

                {/* Filtros Dinámicos */}
                <div className="flex flex-col gap-1">
                     <label className="text-xs font-semibold text-slate-500">Filtros</label>
                     <div className="flex gap-2">
                        {filterConfigs.map(config => (
                            <FilterPopover
                                key={config.id}
                                icon={config.icon}
                                title={config.title}
                                options={config.options}
                                selectedValues={config.selectedValues as (string | number)[]}
                                onChange={config.onChange}
                            />
                        ))}
                     </div>
                </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto justify-end">
                <Button onClick={handleGenerateClick} disabled={isLoading}>
                    {isLoading ? <><Loader2 className="animate-spin mr-2 h-4 w-4"/> Generando...</> : 'Generar Reporte'}
                </Button>
            </div>
        </div>
    );
};