import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/api.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { X, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';

interface BitacoraProcesosDrawerProps {
    procesoId: number;
    procesoNombre: string;
    onClose: () => void;
}

export const BitacoraProcesosDrawer: React.FC<BitacoraProcesosDrawerProps> = ({ procesoId, procesoNombre, onClose }) => {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { getToken } = useAuth();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/processes/${procesoId}/history`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                if (!res.ok) throw new Error('Error al cargar bitacora');
                const data = await res.json();
                setHistory(data);
            } catch (error) {
                console.error('Error fetching process history:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [procesoId, getToken]);

    const formatDateTime = (dateStr: string) => {
        if (!dateStr) return { date: '-', time: '-' };
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString(),
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity duration-300">
            {/* Backdrop Area to close */}
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-lg h-full flex flex-col shadow-2xl animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
                    <div className="overflow-hidden">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Bitácora de Ejecución</h2>
                        <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest truncate mt-0.5">
                            {procesoNombre}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all shrink-0 ml-4">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3 text-slate-400 italic">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm">Obteniendo registros...</span>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Clock size={32} className="text-slate-300" />
                            </div>
                            <p className="text-sm font-medium">No hay ejecuciones registradas.</p>
                            <p className="text-xs">Este proceso no se ha ejecutado recientemente.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((log) => {
                                const start = formatDateTime(log.FechaHoraInicio);
                                return (
                                    <div key={log.BitacoraId} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                                        <div className="p-4">
                                            <div className="flex justify-between items-start gap-4 mb-3">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        {log.Estatus === 'Exito' ? (
                                                            <CheckCircle size={16} className="text-emerald-500" />
                                                        ) : log.Estatus === 'En Progreso' ? (
                                                            <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse border-2 border-amber-100" />
                                                        ) : (
                                                            <XCircle size={16} className="text-rose-500" />
                                                        )}
                                                        <span className={`text-[11px] font-black uppercase tracking-widest ${log.Estatus === 'Exito' ? 'text-emerald-600' :
                                                                log.Estatus === 'En Progreso' ? 'text-amber-600' : 'text-rose-600'
                                                            }`}>
                                                            {log.Estatus === 'Exito' ? 'Sincronizado' : log.Estatus}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold">
                                                        <span className="flex items-center gap-1"><Calendar size={10} /> {start.date}</span>
                                                        <span className="flex items-center gap-1 text-slate-500"><Clock size={10} /> {start.time}</span>
                                                    </div>
                                                </div>

                                                <div className="text-[9px] font-mono text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 shrink-0">
                                                    #{log.BitacoraId}
                                                </div>
                                            </div>

                                            {log.MensajeLog && (
                                                <div className="text-[11px] bg-slate-900 text-slate-300 p-4 rounded-lg font-mono leading-relaxed border border-slate-800 shadow-inner overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
                                                    <div className="text-emerald-400 opacity-50 mb-1">$ log_output</div>
                                                    {log.MensajeLog}
                                                </div>
                                            )}

                                            {log.FechaHoraFin && (
                                                <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-50 pt-2">
                                                    <span>ID Referencia: <span className="font-mono">{log.ReferenceId || 'N/A'}</span></span>
                                                    <span className="italic">Finalizó: {formatDateTime(log.FechaHoraFin).time}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer / Summary */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Mostrando últimos {history.length} registros
                    </p>
                </div>
            </div>
        </div>
    );
};
