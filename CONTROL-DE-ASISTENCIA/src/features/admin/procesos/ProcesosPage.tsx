import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/api.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { Play, Edit, History, Clock, Settings, CheckCircle, XCircle } from 'lucide-react';
import { ConfigurarProcesoModal } from './ConfigurarProcesoModal.tsx';
import { BitacoraProcesosModal } from './BitacoraProcesosModal.tsx';
import { Tooltip } from '../../../components/ui/Tooltip.tsx';
import { Button } from '../../../components/ui/Modal.tsx';
import { useNotification } from '../../../context/NotificationContext.tsx';

const humanizeCron = (cron: string) => {
    if (!cron) return 'No definido';
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const dayNames: { [key: string]: string } = { '1': 'Lun', '2': 'Mar', '3': 'Mié', '4': 'Jue', '5': 'Vie', '6': 'Sáb', '0': 'Dom', '7': 'Dom' };
    let daysDesc = 'Diario';
    if (parts[4] !== '*') {
        const selected = parts[4].split(',').map(d => dayNames[d] || d);
        daysDesc = selected.join(', ');
    }

    const minPart = parts[0];
    const hourPart = parts[1];

    if (!isNaN(Number(minPart)) && !isNaN(Number(hourPart))) {
        return `${daysDesc} a las ${hourPart.padStart(2, '0')}:${minPart.padStart(2, '0')}`;
    }

    let freqDesc = '';
    let windowDesc = '';

    if (hourPart.includes('-')) {
        const [range, step] = hourPart.split('/');
        const [start, end] = range.split('-');
        windowDesc = ` (de ${start.padStart(2, '0')}:00 a ${end.padStart(2, '0')}:00)`;

        if (minPart.startsWith('*/')) {
            freqDesc = `cada ${minPart.replace('*/', '')} min.`;
        } else if (minPart === '0') {
            const stepVal = step || '1';
            freqDesc = stepVal === '1' ? 'cada hora' : `cada ${stepVal} horas`;
        } else if (minPart === '*') {
            freqDesc = 'cada minuto';
        }
    } else {
        if (minPart.startsWith('*/')) freqDesc = `cada ${minPart.replace('*/', '')} min.`;
        else if (hourPart.startsWith('*/')) freqDesc = `cada ${hourPart.replace('*/', '')} horas`;
        else if (minPart === '*' && hourPart === '*') freqDesc = 'cada minuto';
        else if (minPart === '0' && hourPart === '*') freqDesc = 'cada hora';
        else return `${daysDesc} (Horario avanzado: ${cron})`;
    }

    return `${daysDesc}, ${freqDesc}${windowDesc}`;
};

export const ProcesosPage = () => {
    const [processes, setProcesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [executingIds, setExecutingIds] = useState<number[]>([]);
    const [selectedProceso, setSelectedProceso] = useState<any | null>(null);
    const [viewingHistory, setViewingHistory] = useState<any | null>(null);
    const { getToken, can } = useAuth();
    const { addNotification } = useNotification();

    const canManage = can('procesos.manage');

    const fetchProcesses = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/processes`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (!res.ok) throw new Error('Error al cargar');
            const data = await res.json();
            setProcesses(data);
        } catch (error) {
            console.error('Error fetching processes:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProcesses();
    }, []);

    const handleExecuteManual = async (id: number) => {
        const proc = processes.find(p => p.ProcesoId === id);
        if (!proc) return;
        setExecutingIds(prev => [...prev, id]);
        try {
            const res = await fetch(`${API_BASE_URL}/processes/${id}/run`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (!res.ok) throw new Error('Error al ejecutar proceso');

            addNotification('Proceso Iniciado', `La ejecución de "${proc.Nombre}" comenzó en segundo plano`, 'success');
            fetchProcesses();
        } catch (error) {
            console.error('Error executing manual run', error);
            addNotification('Error', 'No se pudo iniciar la ejecución manual', 'error');
        } finally {
            setExecutingIds(prev => prev.filter(x => x !== id));
        }
    };

    if (loading) return <div className="p-8 text-slate-500 italic">Cargando procesos...</div>;

    const renderStatusBadge = (activo: boolean) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${activo ? 'bg-emerald-100 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
            {activo ? 'Activo' : 'Inactivo'}
        </span>
    );

    return (
        <div className="space-y-6 animate-content-fade-in p-6">
            <div className="flex flex-col mb-4">
                <h2 className="text-2xl font-bold text-slate-800">Procesos Automáticos</h2>
                <p className="text-slate-500 text-sm">Gestiona la frecuencia y supervisa las ejecuciones del sistema.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {processes.map((proceso) => (
                    <div key={proceso.ProcesoId} className="group bg-white rounded-xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-all duration-200 relative">

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg border ${proceso.Activo ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                    <Settings size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <h3 className="font-semibold text-slate-700 leading-tight tracking-tight">{proceso.Nombre}</h3>
                                    {renderStatusBadge(proceso.Activo)}
                                </div>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-300">ID: {proceso.ProcesoId}</span>
                        </div>

                        <p className="text-xs text-slate-400 mb-6 leading-relaxed line-clamp-2 min-h-[32px]">
                            {proceso.Descripcion}
                        </p>

                        <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 mb-6 space-y-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5 leading-none">
                                    <Clock size={10} /> Recurrencia
                                </span>
                                <span className="text-xs font-semibold text-slate-600">
                                    {humanizeCron(proceso.CronExpression)}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-1.5 leading-none">
                                    <History size={10} /> Última Actividad
                                </span>
                                {proceso.UltimaEjecucion ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-slate-500">
                                            {new Date(proceso.UltimaEjecucion.replace('Z', '')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${proceso.UltimoEstatus === 'Exito' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                            {proceso.UltimoEstatus === 'Exito' ? 'Éxito' : 'Error'}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-[11px] text-slate-300 italic">Nunca ejecutado</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-100">
                            <div className="flex gap-1">
                                <Tooltip text="Configurar">
                                    <button
                                        onClick={() => setSelectedProceso(proceso)}
                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all"
                                    >
                                        <Edit size={18} />
                                    </button>
                                </Tooltip>
                                <Tooltip text="Ver Historial">
                                    <button
                                        onClick={() => setViewingHistory(proceso)}
                                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
                                    >
                                        <History size={18} />
                                    </button>
                                </Tooltip>
                            </div>

                            {canManage && (
                                <Button
                                    onClick={() => handleExecuteManual(proceso.ProcesoId)}
                                    size="sm"
                                    disabled={executingIds.includes(proceso.ProcesoId)}
                                >
                                    {executingIds.includes(proceso.ProcesoId) ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Iniciando...
                                        </>
                                    ) : (
                                        <>
                                            <Play size={12} fill="currentColor" />
                                            Ejecutar
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {
                selectedProceso && (
                    <ConfigurarProcesoModal
                        proceso={selectedProceso}
                        onClose={() => setSelectedProceso(null)}
                        onSuccess={() => { setSelectedProceso(null); fetchProcesses(); }}
                    />
                )
            }

            {
                viewingHistory && (
                    <BitacoraProcesosModal
                        procesoId={viewingHistory.ProcesoId}
                        procesoNombre={viewingHistory.Nombre}
                        onClose={() => setViewingHistory(null)}
                    />
                )
            }
        </div >
    );
};
