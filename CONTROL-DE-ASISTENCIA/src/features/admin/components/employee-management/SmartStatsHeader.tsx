import React from 'react';
import { EmployeeStats } from '../../../../types';
import { AlertCircle, Clock, Smartphone, Users, CameraOff, UserX } from 'lucide-react';
import { Tooltip } from '../../../../components/ui/Tooltip';

interface SmartStatsHeaderProps {
    stats: EmployeeStats | null;
    isLoading: boolean;
    onFilterClick: (filterType: string) => void;
    activeFilter: string | null;
    showInactive?: boolean;
}

export const SmartStatsHeader: React.FC<SmartStatsHeaderProps> = ({ stats, isLoading, onFilterClick, activeFilter, showInactive = false }) => {
    const [hoveredId, setHoveredId] = React.useState<string | null>(null);

    if (isLoading || !stats) {
        return <div className="h-5 w-32 bg-slate-100 rounded animate-pulse"></div>;
    }

    const items = [
        {
            id: 'all',
            label: showInactive ? 'Todos' : 'Activos',
            value: showInactive ? (stats.TotalActivos + (stats.TotalInactivos || 0)) : stats.TotalActivos,
            icon: Users,
            color: showInactive ? 'orange' : 'slate', // Highlight when showing all? Or keep slate.
            tooltip: showInactive ? 'Mostrando todos (Activos + Inactivos)' : 'Mostrando solo empleados activos.'
        },
        {
            id: 'no_photo',
            label: 'Sin Foto',
            value: stats.SinFoto || 0,
            icon: CameraOff,
            color: 'orange',
            tooltip: 'Empleados sin fotografía de perfil.'
        },
        {
            id: 'no_schedule',
            label: 'Sin Horario',
            value: stats.SinHorario,
            icon: AlertCircle,
            color: 'rose',
            tooltip: 'Empleados sin horario asignado.'
        },
        {
            id: 'rotative',
            label: 'Rotativos',
            value: stats.HorarioRotativo,
            icon: Clock,
            color: 'emerald',
            tooltip: 'Empleados con horario rotativo.'
        },
        {
            id: 'no_device',
            label: 'Sin Zona',
            value: stats.SinDispositivo,
            icon: Smartphone,
            color: 'indigo',
            tooltip: 'Empleados sin zona asignada.'
        }
    ];

    return (
        <div className="flex items-center gap-1">
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeFilter === item.id || (activeFilter === null && item.id === 'all');
                const isHovered = hoveredId === item.id;
                const showLabel = isActive || isHovered;

                // Color mapping for Active State text
                const activeColorClass = {
                    'slate': 'text-slate-700',
                    'orange': 'text-orange-600',
                    'rose': 'text-rose-600',
                    'emerald': 'text-emerald-600',
                    'indigo': 'text-indigo-600'
                }[item.color] || 'text-slate-700';

                return (
                    <Tooltip key={item.id} text={item.tooltip}>
                        <button
                            onClick={() => onFilterClick(item.id)}
                            onMouseEnter={() => setHoveredId(item.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-500 ease-in-out text-sm font-medium border border-transparent
                                ${isActive && item.id === 'inactive' ? 'bg-rose-50 border-rose-200' : ''}
                                ${isActive
                                    ? `bg-white shadow-sm ring-1 ring-black/5 ${activeColorClass}`
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'
                                }
                            `}
                        >
                            <Icon size={16} className={isActive ? '' : 'opacity-70'} />

                            <span className={`overflow-hidden whitespace-nowrap transition-all duration-500 ${showLabel ? 'max-w-[100px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                {item.label}
                            </span>

                            <span className={`text-xs font-semibold ${isActive ? '' : 'opacity-70'}`}>
                                {item.value}
                            </span>
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
};

