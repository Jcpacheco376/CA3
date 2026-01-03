// src/features/dashboard/widgets/DailyStatsWidget.tsx
import React, { useEffect, useState } from 'react';
import { Users, Clock, AlertTriangle, CheckCircle2, MoreHorizontal, RefreshCw, HelpCircle } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { Tooltip } from '../../../components/ui/Tooltip';

export const DailyStatsWidget = () => {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    const [stats, setStats] = useState({
        TotalPlantilla: 0,
        Presentes: 0,
        Retardos: 0,
        Ausencias: 0,
        SinHorario: 0
    });

    const fetchData = async () => {
        setLoading(true);
        setError(false);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading stats');
            
            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error(err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const MetricCard = ({ label, value, icon: Icon, colorClass, bgClass, loading, tooltipText }: any) => (
        <Tooltip text={tooltipText}>
            <div className="flex flex-col justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-all duration-300 h-full relative overflow-hidden group cursor">
                <div className={`absolute top-0 right-0 w-12 h-12 ${bgClass} rounded-bl-full -mr-6 -mt-6 opacity-20 group-hover:scale-150 transition-transform duration-500`}></div>

                <div className="flex justify-between items-start z-10 mb-2">
                    <div className={`p-1.5 rounded-lg ${bgClass}`}>
                        <Icon className={colorClass} size={18} />
                    </div>
                    {!loading && value > 0 && label === 'Retardos' && (
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                    )}
                </div>
                
                <div className="z-10 mt-auto">
                    {loading ? (
                        <div className="h-6 w-12 bg-slate-100 animate-pulse rounded mb-1"></div>
                    ) : (
                        <h3 className="text-2xl font-bold text-slate-800 tracking-tight leading-none">{value}</h3>
                    )}
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wide mt-1 truncate" title={label}>{label}</p>
                </div>
            </div>
        </Tooltip>
    );

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
                <Tooltip text="Resumen de asistencia del día de hoy en tiempo real">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 cursor">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        Operación Diaria
                    </h3>
                </Tooltip>
                <div className="flex gap-1">
                    {error && (
                        <Tooltip text="Reintentar carga">
                            <button onClick={fetchData} className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors">
                                <RefreshCw size={14} />
                            </button>
                        </Tooltip>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                <MetricCard 
                    label="Presentes" 
                    value={stats.Presentes} 
                    icon={CheckCircle2} 
                    colorClass="text-emerald-600" 
                    bgClass="bg-emerald-50"
                    loading={loading}
                    tooltipText="Empleados que han registrado entrada o tienen una justificación válida que cuenta como asistencia."
                />
                <MetricCard 
                    label="Retardos" 
                    value={stats.Retardos} 
                    icon={Clock} 
                    colorClass="text-amber-600" 
                    bgClass="bg-amber-50"
                    loading={loading}
                    tooltipText="Empleados que registraron entrada después de la tolerancia permitida."
                />
                <MetricCard 
                    label="Ausencias" 
                    value={stats.Ausencias} 
                    icon={AlertTriangle} 
                    colorClass="text-rose-600" 
                    bgClass="bg-rose-50"
                    loading={loading} 
                    tooltipText="Empleados que debían asistir hoy y no han registrado entrada ni tienen justificación."
                />
                <MetricCard 
                    label="Sin Horario" 
                    value={stats.SinHorario} 
                    icon={HelpCircle} 
                    colorClass="text-slate-500" 
                    bgClass="bg-slate-100"
                    loading={loading}
                    tooltipText="Empleados activos que no tienen un horario programado para el día de hoy."
                />
            </div>
            
            <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between gap-4">
                 <div className="flex flex-col">
                    <Tooltip text="Total de empleados activos permitidos para tu usuario">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase cursor border-b border-dashed border-slate-300">Plantilla Total</span>
                    </Tooltip>
                    <span className="text-sm font-bold text-slate-700">{loading ? '-' : stats.TotalPlantilla}</span>
                 </div>
                 
                 <div className="flex-1 flex flex-col justify-center">
                    <Tooltip text={`Composición: ${stats.Presentes} Presentes, ${stats.Retardos} Retardos, ${stats.Ausencias} Ausencias`}>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex cursor">
                            <div 
                                className="bg-emerald-500 h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${stats.TotalPlantilla > 0 ? (stats.Presentes / stats.TotalPlantilla) * 100 : 0}%` }}
                            ></div>
                            <div 
                                className="bg-amber-400 h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${stats.TotalPlantilla > 0 ? (stats.Retardos / stats.TotalPlantilla) * 100 : 0}%` }}
                            ></div>
                            <div 
                                className="bg-rose-400 h-full transition-all duration-1000 ease-out" 
                                style={{ width: `${stats.TotalPlantilla > 0 ? (stats.Ausencias / stats.TotalPlantilla) * 100 : 0}%` }}
                            ></div>
                        </div>
                    </Tooltip>
                    <div className="flex justify-between mt-1">
                        <span className="text-[9px] text-slate-400">Progreso de Asistencia</span>
                        <span className="text-[9px] font-bold text-slate-600">
                             {stats.TotalPlantilla > 0 ? (((stats.Presentes + stats.Retardos) / stats.TotalPlantilla) * 100).toFixed(0) : 0}%
                        </span>
                    </div>
                 </div>
            </div>
        </div>
    );
};