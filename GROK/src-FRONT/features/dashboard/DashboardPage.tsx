// src/features/dashboard/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { WelcomeWidget } from './widgets/WelcomeWidget';
import { DailyStatsWidget } from './widgets/DailyStatsWidget';
import { ActionCenterWidget } from './widgets/ActionCenterWidget';
import { PayrollStatusWidget } from './widgets/PayrollStatusWidget';
import { WeeklyTrendsWidget } from './widgets/WeeklyTrendsWidget';
import { DailyDistributionWidget } from './widgets/DailyDistributionWidget';
import { LayoutDashboard } from 'lucide-react';

// --- ARQUITECTURA ESCALABLE ---
interface DashboardWidget {
    id: string;
    component: React.ReactNode;
    permission?: string; // El permiso específico que controla este widget
    colSpan?: string;
    className?: string; 
}

interface DashboardPageProps {
    setActiveView: (view: any) => void;
}

export const DashboardPage = ({ setActiveView }: DashboardPageProps) => {
    const { user, can } = useAuth();

    // DEFINICIÓN DE WIDGETS CON PERMISOS GRANULARES
    const widgets: DashboardWidget[] = [
        // 1. HERO: Bienvenida 
        {
            id: 'welcome_hero',
            component: <WelcomeWidget user={user} />,
            colSpan: 'col-span-1 md:col-span-2 lg:col-span-3',
            className: 'min-h-[160px]',
            permission: 'dashboard.welcome.read', // Ahora incluso el saludo es controlable
        },
        
        // 2. NIVEL OPERATIVO
        {
            id: 'daily_stats',
            component: <DailyStatsWidget />,
            colSpan: 'col-span-1 md:col-span-2 lg:col-span-2',
            className: 'h-60',
            permission: 'dashboard.daily_stats.read', // <--- Permiso específico
        },
        {
            id: 'daily_distribution',
            component: <DailyDistributionWidget />,
            colSpan: 'col-span-1 md:col-span-2 lg:col-span-1',
            className: 'h-60',
            permission: 'dashboard.distribution.read', // <--- Permiso específico (aunque use datos de stats)
        },

        // 3. NIVEL TENDENCIAS
        {
            id: 'weekly_trends',
            component: <WeeklyTrendsWidget />,
            colSpan: 'col-span-1 md:col-span-2 lg:col-span-2',
            className: 'h-60',
            permission: 'dashboard.weekly_trends.read', // <--- Permiso específico
        },
        {
            id: 'payroll_status',
            // CORRECCIÓN AQUÍ: Pasamos la prop setActiveView
            component: <PayrollStatusWidget setActiveView={setActiveView} />,
            colSpan: 'col-span-1 md:col-span-1 lg:col-span-1',
            className: 'h-52',
            permission: 'dashboard.payroll_status.read',
        },

        // 4. NIVEL ACCIÓN
        {
            id: 'action_center',
            component: <ActionCenterWidget setActiveView={setActiveView} />,
            colSpan: 'col-span-1 md:col-span-2 lg:col-span-3',
            className: 'h-80',
            permission: 'dashboard.action_center.read', // <--- Permiso específico
        },
    ];

    // Filtramos los widgets visibles
    const visibleWidgets = widgets.filter(widget => {
        return !widget.permission || can(widget.permission);
    });

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10">
            
            {visibleWidgets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleWidgets.map((widget) => (
                        <div 
                            key={widget.id} 
                            className={`
                                ${widget.colSpan || 'col-span-1'} 
                                ${widget.className || ''} 
                                transition-all duration-300
                            `}
                        >
                            <div className="h-full w-full">
                                {widget.component}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="min-h-[65vh] flex flex-col items-center justify-center p-8 text-center relative">
                    {/* Fondo decorativo sutil */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-b from-indigo-50/50 to-transparent rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative mb-8 group">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center justify-center transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                            <LayoutDashboard size={48} className="text-indigo-500 opacity-80" strokeWidth={1.5} />
                        </div>
                        {/* Pequeño indicador de estado activo */}
                        <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-xl shadow-sm border border-slate-50">
                            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">
                        Bienvenido a Control de Asistencia
                    </h2>
                    <p className="text-slate-500 max-w-md text-base leading-relaxed mb-8">
                        Tu sesión está activa. Este espacio está reservado para tus widgets y métricas clave, que se visualizarán aquí una vez habilitados.
                    </p>

                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-400 shadow-sm">
                        <span>{user?.NombreCompleto || 'Usuario'}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>{user?.Roles?.[0]?.NombreRol || 'Sin Rol'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};