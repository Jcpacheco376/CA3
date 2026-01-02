// src/features/dashboard/widgets/ActionCenterWidget.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, ChevronRight, FileSearch, RefreshCw, Clock } from 'lucide-react';
import { useAuth } from '../../../features/auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { IncidentDetailModal } from '../../reports/components/IncidentDetailModal';
import { Tooltip } from '../../../components/ui/Tooltip';

export const ActionCenterWidget = ({ setActiveView }: { setActiveView: (v: any) => void }) => {
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tasks, setTasks] = useState<any[]>([]);
    
    // Estado para el modal de detalles
    const [selectedIncidenciaId, setSelectedIncidenciaId] = useState<number | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(false);
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE_URL}/dashboard/actions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error loading actions');
            
            const data = await response.json();
            setTasks(data);
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

    const handleIncidenciaUpdated = () => {
        // Recargar la lista si se resolvió algo en el modal
        fetchData();
        setSelectedIncidenciaId(null);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    // Helper para abrir el modal de forma segura
    const handleOpenDetail = (task: any) => {
        // Validación robusta del ID: busca ambas variaciones por si acaso
        const id = task.IncidenciaId || task.incidenciaId;
        if (id) {
            console.log("Abriendo incidencia:", id); // Debug temporal
            setSelectedIncidenciaId(Number(id));
        } else {
            console.error("No se encontró ID válido en la tarea:", task);
        }
    };

    return (
        <>
            {/* Quitamos overflow-hidden del contenedor principal si causa conflicto con tooltips internos, 
                o confiamos en que el Tooltip usa Portal. Por seguridad visual, overflow-visible permite que el tooltip salga. */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-visible relative">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                    <Tooltip text="Lista de incidencias pendientes que requieren tu autorización">
                        <div className="flex items-center gap-2 cursor">
                            <AlertCircle size={18} className="text-orange-500" />
                            <h3 className="text-base font-bold text-slate-800">
                                Requieren tu Atención
                            </h3>
                            {!loading && tasks.length > 0 && (
                                <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full font-bold ml-1">
                                    {tasks.length}
                                </span>
                            )}
                        </div>
                    </Tooltip>
                    
                    <div className="flex gap-2 items-center">
                        {error && (
                            <Tooltip text="Reintentar conexión">
                                <button onClick={fetchData} className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors">
                                    <RefreshCw size={14} />
                                </button>
                            </Tooltip>
                        )}
                        <Tooltip text="Ver todas las incidencias">
                            <button 
                                onClick={() => setActiveView('report_incidencias')}
                                className="text-xs text-indigo-600 font-medium hover:underline flex items-center gap-1 p-1 rounded hover:bg-indigo-50"
                            >
                                Ver todo <ChevronRight size={14} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto max-h-[300px] p-2 custom-scrollbar relative">
                    {loading ? (
                        [1, 2].map((i) => (
                            <div key={i} className="p-3 mb-2 flex items-center gap-3 animate-pulse">
                                <div className="w-10 h-10 bg-slate-100 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-2 bg-slate-100 rounded w-1/2"></div>
                                </div>
                            </div>
                        ))
                    ) : tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                            <Check size={32} className="mb-2 opacity-50" />
                            <p className="text-sm">Todo al día. ¡Buen trabajo!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {tasks.map((task, index) => (
                                <div key={index} className="group p-3 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-sm bg-slate-400 uppercase`}>
                                            {task.Usuario ? task.Usuario.substring(0,2) : '??'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 truncate">
                                                {task.Usuario || 'Usuario Desconocido'}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 truncate max-w-[150px]" title={task.Descripcion}>
                                                    {task.Descripcion}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 whitespace-nowrap">
                                                    {task.Estado}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <Tooltip text={`Solicitado: ${formatDate(task.Fecha)}`}>
                                            <div className="text-[10px] text-slate-400 hidden sm:flex items-center gap-1 mr-2 cursor-default">
                                                <Clock size={10} />
                                                {task.Fecha ? new Date(task.Fecha).toLocaleDateString() : '-'}
                                            </div>
                                        </Tooltip>
                                        
                                        <Tooltip text="Ver detalles">
                                            <button 
                                                onClick={() => handleOpenDetail(task)}
                                                className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors shadow-sm active:scale-95" 
                                            >
                                                <FileSearch size={16} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Detalle de Incidencia */}
            {selectedIncidenciaId && (
                <IncidentDetailModal
                    isOpen={true}
                    onClose={() => setSelectedIncidenciaId(null)}
                    incidentId={selectedIncidenciaId}
                    onRefresh={handleIncidenciaUpdated}
                />
            )}
        </>
    );
};