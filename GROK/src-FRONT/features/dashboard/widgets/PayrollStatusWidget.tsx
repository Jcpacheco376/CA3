// src/features/dashboard/widgets/PayrollStatusWidget.tsx
import React, { useState, useEffect } from 'react';
import { Banknote, ChevronRight, RefreshCw, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { Tooltip } from '../../../components/ui/Tooltip';

interface PayrollStatusWidgetProps {
    setActiveView: (view: string) => void;
}

export const PayrollStatusWidget = ({ setActiveView }: PayrollStatusWidgetProps) => {
    const { getToken, can } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [groups, setGroups] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        setError(false);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/dashboard/payroll`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading payroll');
            
            const result = await response.json();
            setGroups(Array.isArray(result) ? result : [result]);
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

    const formatPeriod = (start: string, end: string) => {
        if (!start || !end) return '';
        const s = new Date(start);
        const e = new Date(end);
        s.setMinutes(s.getMinutes() + s.getTimezoneOffset());
        e.setMinutes(e.getMinutes() + e.getTimezoneOffset());
        return `${s.getDate()}/${s.getMonth()+1} - ${e.getDate()}/${e.getMonth()+1}`;
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full min-h-[240px] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-2 px-1">
                <div className="flex items-center gap-2">
                     <div className="p-1 bg-blue-50 text-blue-600 rounded-md">
                        <Banknote size={14} />
                    </div>
                    <Tooltip text="Progreso del periodo actual para cada grupo de nómina">
                        <h3 className="text-sm font-bold text-slate-700 cursor">Cierre de Nómina</h3>
                    </Tooltip>
                </div>
                {error && (
                     <Tooltip text="Reintentar carga">
                         <button onClick={fetchData} className="p-1 text-slate-400 hover:text-blue-600 rounded">
                             <RefreshCw size={12} />
                         </button>
                     </Tooltip>
                 )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse bg-slate-50 p-2 rounded-lg">
                            <div className="h-3 w-1/2 bg-slate-200 rounded mb-2"></div>
                            <div className="h-2 w-full bg-slate-200 rounded"></div>
                        </div>
                    ))
                ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 py-4">
                        <AlertCircle size={24} className="mb-1 opacity-50" />
                        <span className="text-xs">No hay periodos activos.</span>
                    </div>
                ) : (
                    groups.map((group, idx) => {
                        const timeProgress = Math.min(100, Math.max(0, group.ProgresoTiempo));
                        const workProgress = Math.min(100, Math.max(0, group.ProgresoCaptura));
                        
                        const isLate = timeProgress > workProgress + 10; 
                        const isDone = workProgress >= 100;

                        return (
                            <Tooltip key={idx} text={`Progreso: ${group.ProgresoCaptura}% fichas listas | Tiempo transcurrido: ${group.ProgresoTiempo}%`}>
                                <div className="p-2 border border-slate-100 rounded-lg hover:border-slate-200 hover:bg-slate-50 transition-colors cursor-default">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isDone ? 'bg-emerald-500' : isLate ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                                            <span className="text-xs font-bold text-slate-700 truncate" title={group.NombreGrupo}>
                                                {group.NombreGrupo}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                            {formatPeriod(group.InicioPeriodo, group.FinPeriodo)}
                                        </span>
                                    </div>

                                    <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="absolute top-0 left-0 h-full bg-slate-200"
                                            style={{ width: `${timeProgress}%` }}
                                        ></div>

                                        <div 
                                            className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out flex items-center justify-end pr-1
                                                ${isDone ? 'bg-emerald-500' : isLate ? 'bg-amber-400' : 'bg-blue-500'}
                                            `}
                                            style={{ width: `${workProgress}%` }}
                                        >
                                        </div>
                                        
                                        {timeProgress > workProgress && (
                                            <div 
                                                className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10 opacity-50" 
                                                style={{ left: `${timeProgress}%` }}
                                            ></div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center mt-1 text-[9px] text-slate-500 font-medium">
                                        <span className="flex items-center gap-1">
                                            <Clock size={8} className="text-slate-400"/> 
                                            {group.DiasRestantes} días rest.
                                        </span>
                                        <span className={`font-bold ${isDone ? 'text-emerald-600' : isLate ? 'text-amber-600' : 'text-blue-600'}`}>
                                            {workProgress}% Completado
                                        </span>
                                    </div>
                                </div>
                            </Tooltip>
                        );
                    })
                )}
            </div>
            
            {can('nomina.admin') && (
                <div className="mt-2 pt-2 border-t border-slate-100">              
                        <button 
                            onClick={() => setActiveView('payroll_closing')}
                            className="w-full py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 text-[10px] font-bold uppercase tracking-wide rounded-lg transition-colors flex items-center justify-center gap-1 group"
                        >
                            <span>Gestionar Cierre</span>
                            <ChevronRight size={10} className="group-hover:translate-x-1 transition-transform" />
                        </button>                    
                </div>
            )}
        </div>
    );
};