import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../../config/api.ts';
import { useAuth } from '../../auth/AuthContext.tsx';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { Modal, Button } from '../../../components/ui/Modal.tsx';

interface BitacoraProcesosModalProps {
    procesoId: number;
    procesoNombre: string;
    onClose: () => void;
}

export const BitacoraProcesosModal: React.FC<BitacoraProcesosModalProps> = ({ procesoId, procesoNombre, onClose }) => {
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
        const d = new Date(dateStr.replace('Z', ''));
        return {
            date: d.toLocaleDateString(),
            time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        };
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Bitácora de Ejecución"
            size="5xl"
            footerActions={
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest pl-2">
                    Mostrando últimos {history.length} registros
                </span>
            }
            footer={
                <Button variant="secondary" onClick={onClose}>Cerrar</Button>
            }
        >
            <div className="space-y-4 py-2">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest px-1">
                        Proceso: {procesoNombre}
                    </p>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-[500px]">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="font-mono text-xs">Cargando bitácora...</span>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                <Clock size={24} className="text-slate-300 mb-2" />
                                <p className="font-mono text-xs">No hay registros para este proceso.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                <div className="flex flex-col divide-y divide-slate-100">
                                    {history.map((log) => {
                                        const start = formatDateTime(log.FechaHoraInicio);
                                        const end = log.FechaHoraFin ? formatDateTime(log.FechaHoraFin) : null;
                                        const isError = log.Estatus === 'Error';
                                        const isSuccess = log.Estatus === 'Exito';
                                        const isProg = log.Estatus === 'En Progreso';

                                        return (
                                            <div
                                                key={log.BitacoraId}
                                                className="group flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-slate-50 p-4 transition-colors text-slate-700 text-xs"
                                            >
                                                {/* Timestamp & Status Icon */}
                                                <div className="flex items-center gap-3 shrink-0 w-52 pt-0.5">
                                                    <span className="text-slate-500 font-medium tabular-nums">{start.time}</span>
                                                    {isSuccess ? (
                                                        <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                                                    ) : isProg ? (
                                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse ring-2 ring-amber-100 shrink-0" />
                                                    ) : (
                                                        <XCircle size={15} className="text-rose-500 shrink-0" />
                                                    )}
                                                    <span className={`uppercase font-bold tracking-widest text-[10px] ${isSuccess ? 'text-emerald-600' : isProg ? 'text-amber-500' : 'text-rose-600'
                                                        }`}>
                                                        {isSuccess ? 'COMPLETADO' : log.Estatus}
                                                    </span>
                                                </div>

                                                {/* Message */}
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className={`leading-relaxed ${isError ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                                                        {log.MensajeLog || '-'}
                                                    </p>
                                                </div>

                                                {/* Meta Info (Right Side) */}
                                                <div className="flex flex-col items-end gap-1 shrink-0 text-[11px] text-slate-400 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <span className="font-semibold text-slate-500">
                                                        Ref: #{log.BitacoraId}
                                                    </span>
                                                    <span className="tabular-nums">
                                                        {end ? `Fin: ${end.time}` : '--:--:--'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
