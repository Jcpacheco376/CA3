import React from 'react';
import { EmployeeStats } from '../../../../types';
import { AlertCircle, Clock, Smartphone, Users } from 'lucide-react';
import { Tooltip } from '../../../../components/ui/Tooltip';

interface SmartStatsHeaderProps {
    stats: EmployeeStats | null;
    isLoading: boolean;
    onFilterClick: (filterType: string) => void;
    activeFilter: string | null;
}

export const SmartStatsHeader: React.FC<SmartStatsHeaderProps> = ({ stats, isLoading, onFilterClick, activeFilter }) => {
    if (isLoading || !stats) {
        return <div className="h-5 w-32 bg-slate-100 rounded animate-pulse"></div>;
    }

    const items = [
        {
            id: 'all',
            label: 'Total',
            value: stats.TotalActivos,
            icon: Users,
            color: 'slate',
            activeClass: 'text-slate-700 bg-slate-200 ring-1 ring-slate-300',
            inactiveClass: 'text-slate-600 bg-slate-100 hover:bg-slate-200',
            tooltip: 'Total de empleados activos en el sistema.'
        },
        {
            id: 'no_schedule',
            label: 'Sin Horario',
            value: stats.SinHorario,
            icon: AlertCircle,
            color: 'rose',
            activeClass: 'text-rose-800 bg-rose-100 ring-1 ring-rose-300',
            inactiveClass: 'text-rose-700 bg-rose-50 hover:bg-rose-100',
            tooltip: 'Empleados sin un horario asignado. No podrán registrar asistencia correctamente.'
        },
        {
            id: 'rotative',
            label: 'Rotativos',
            value: stats.HorarioRotativo,
            icon: Clock,
            color: 'emerald',
            activeClass: 'text-emerald-800 bg-emerald-100 ring-1 ring-emerald-300',
            inactiveClass: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100',
            tooltip: 'Empleados con horario rotativo (turnos cambiantes).'
        },
        {
            id: 'no_device',
            label: 'Sin Disp.',
            value: stats.SinDispositivo,
            icon: Smartphone,
            color: 'indigo',
            activeClass: 'text-indigo-800 bg-indigo-100 ring-1 ring-indigo-300',
            inactiveClass: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100',
            tooltip: 'Empleados que no han sido asignados a ninguna zona/dispositivo biométrico.'
        }
    ];

    return (
        <div className="flex items-center gap-3 pl-4 border-l border-slate-300">
            {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeFilter === item.id || (activeFilter === null && item.id === 'all');

                return (
                    <Tooltip key={item.id} text={item.tooltip}>
                        <button
                            onClick={() => onFilterClick(item.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium border ${isActive ? item.activeClass : item.inactiveClass} ${isActive ? 'shadow-sm' : ''}`}
                        >
                            <Icon size={16} className={isActive ? '' : 'opacity-70'} />
                            <span>{item.label}</span>
                            <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/50' : 'bg-slate-200/50'}`}>
                                {item.value}
                            </span>
                        </button>
                    </Tooltip>
                );
            })}
        </div>
    );
};

