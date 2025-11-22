// src/features/reports/components/IncidentDetailModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../../components/ui/Modal';
import { 
    MessageSquare, User, CheckCircle, Shield, Loader2, 
    ArrowRightLeft, Hash, Clock, UserCog, Calendar, Briefcase,
    FileSignature, XCircle, Hourglass, Info, X // Importamos X para cancelar
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip'; // Asegúrate de importar Tooltip
import { API_BASE_URL } from '../../../config/api';
import { useAuth } from '../../auth/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface IncidentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    incidentId: number | null;
    onRefresh: () => void;
}

export const IncidentDetailModal = ({ isOpen, onClose, incidentId, onRefresh }: IncidentDetailModalProps) => {
    const { getToken, user } = useAuth();
    
    const [data, setData] = useState<any>(null);
    const [managers, setManagers] = useState<any[]>([]);
    const [resolutionOptions, setResolutionOptions] = useState<any[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [action, setAction] = useState<'assign' | 'resolve' | 'auth' | null>(null);
    const [comment, setComment] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    // Carga Inicial
    useEffect(() => {
        if (isOpen && incidentId) {
            setData(null); setAction(null); setComment(''); setSelectedUser(''); setSelectedStatus('');
            fetchDetails();
        }
    }, [isOpen, incidentId]);

    // Carga Lazy
    useEffect(() => {
        if (!action) return;
        const loadDependencies = async () => {
            const token = getToken();
            if (!token) return;
            try {
                if (action === 'assign' && managers.length === 0) {
                    const res = await fetch(`${API_BASE_URL}/incidents/managers`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setManagers(await res.json());
                }
                if (action === 'resolve' && resolutionOptions.length === 0 && incidentId) {
                    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/resolution-options`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (res.ok) setResolutionOptions(await res.json());
                }
            } catch (e) { console.error(e); }
        };
        loadDependencies();
    }, [action, incidentId, getToken]);

    const fetchDetails = async () => {
        setIsLoading(true);
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/details`, { headers: { 'Authorization': `Bearer ${token}` } });
            if(res.ok) setData(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    // Acción General
    const handleSubmitAction = async () => {
        setIsSubmitting(true);
        const token = getToken();
        let endpoint = '';
        let body = {};

        if (action === 'assign') {
            endpoint = `/incidents/${incidentId}/assign`;
            body = { targetUserId: selectedUser, comment };
        } else if (action === 'resolve') {
            endpoint = `/incidents/${incidentId}/resolve`;
            body = { newStatus: selectedStatus, comment };
        } else if (action === 'auth') {
            endpoint = `/incidents/${incidentId}/auth-request`;
            body = { comment };
        }

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                onRefresh();
                onClose();
            } else {
                alert("Error al procesar.");
            }
        } catch (e) { console.error(e); } 
        finally { setIsSubmitting(false); }
    };

    // Cancelar Apelación
    const handleCancelAuth = async () => {
        if(!confirm("¿Estás seguro de cancelar la solicitud? La incidencia regresará a su estado anterior.")) return;
        
        setIsSubmitting(true);
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/auth-cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ comment: "Cancelado por usuario." })
            });
            if (res.ok) {
                onRefresh();
                fetchDetails(); // Recargar para ver el nuevo estado
            }
        } catch(e) { console.error(e); }
        finally { setIsSubmitting(false); }
    };

    // Helpers Fechas
    const formatDateHeader = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const cleanDate = dateString.toString().substring(0, 10);
            const date = new Date(cleanDate + 'T12:00:00');
            return !isNaN(date.getTime()) ? format(date, 'EEEE d MMMM, yyyy', { locale: es }) : '-';
        } catch { return '-'; }
    };
    const formatDateTime = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            return !isNaN(date.getTime()) ? format(date, 'dd MMM HH:mm', { locale: es }) : '-';
        } catch { return '-'; }
    };

    let content;

    if (isLoading || !data) {
        content = (
            <div className="h-[550px] flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-2" size={40} />
                <p className="text-sm font-medium">Cargando expediente...</p>
            </div>
        );
    } else {
        const { header, timeline, authorizations } = data;
        const amIAssigned = header.AsignadoAUsuarioId === user?.UsuarioId;
        const isClosed = ['Resuelta', 'Cancelada'].includes(header.Estado);
        const isPendingAuth = header.Estado === 'PorAutorizar'; // Detectar modo apelación

        // Lógica de permisos visuales
        const canAssign = !isClosed && !isPendingAuth && (header.Estado === 'Nueva' || amIAssigned || user?.permissions['incidencias.manage']);
        const canAct = !isClosed && !isPendingAuth && amIAssigned;
        const canCancelAuth = isPendingAuth && (amIAssigned || user?.permissions['incidencias.manage']);

        content = (
            <div className="flex h-[550px] gap-0 border border-slate-200 rounded-xl overflow-hidden">
                {/* IZQUIERDA */}
                <div className="w-2/5 flex flex-col border-r border-slate-200 bg-white pr-0">
                    
                    {/* Header Ficha */}
                    <div className="p-5 pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-200 flex items-center gap-1">
                                <Hash size={10}/> {incidentId}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                header.Estado === 'PorAutorizar' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                header.Estado === 'Nueva' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                header.Estado === 'Resuelta' ? 'bg-green-50 text-green-600 border-green-100' :
                                'bg-slate-50 text-slate-600 border-slate-100'
                            }`}>
                                {header.Estado}
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight truncate" title={header.Empleado}>{header.Empleado}</h3>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5"><Briefcase size={12} className="text-slate-400"/> {header.Departamento || 'Sin Depto'}</div>
                            <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400"/> {formatDateHeader(header.Fecha)}</div>
                        </div>
                    </div>

                    {/* VS Component */}
                    <div className="px-5 mb-4">
                        <div className="relative flex shadow-sm rounded-lg overflow-hidden border border-slate-200 h-20">
                            <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Clock size={9}/> Sistema</div>
                                <div className="text-2xl font-black text-slate-600">{header.EstatusChecadorOriginal || '-'}</div>
                            </div>
                            <div className="w-px bg-slate-200 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center z-10 shadow-sm"><span className="text-[8px] font-black text-slate-400 italic">VS</span></div></div>
                            <div className="flex-1 bg-indigo-50/50 flex flex-col items-center justify-center">
                                <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">Manual <UserCog size={9}/></div>
                                <div className="text-2xl font-black text-indigo-600">{header.EstatusSupervisorOriginal || '-'}</div>
                            </div>
                        </div>
                    </div>

                    {/* ZONA DE ACCIONES / FIRMAS */}
                    <div className="flex-1 overflow-y-auto space-y-2 px-5 pb-5 custom-scrollbar">
                        
                        {/* CASO 1: MODO APELACIÓN (TABLERO DE FIRMAS) */}
                        {isPendingAuth ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                        <Hourglass size={12}/> Proceso de Aprobación
                                    </p>
                                    {canCancelAuth && (
                                        <button 
                                            onClick={handleCancelAuth}
                                            disabled={isSubmitting}
                                            className="text-[10px] text-red-500 hover:text-red-700 font-semibold underline flex items-center gap-1"
                                        >
                                            <XCircle size={10}/> Cancelar Solicitud
                                        </button>
                                    )}
                                </div>

                                {authorizations?.map((auth: any) => (
                                    <div key={auth.AutorizacionId} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                auth.Estatus === 'Aprobado' ? 'bg-green-100 text-green-600' :
                                                auth.Estatus === 'Rechazado' ? 'bg-red-100 text-red-600' :
                                                'bg-slate-100 text-slate-400'
                                            }`}>
                                                {auth.Estatus === 'Aprobado' ? <CheckCircle size={16}/> : 
                                                 auth.Estatus === 'Rechazado' ? <XCircle size={16}/> : 
                                                 <FileSignature size={16}/>}
                                            </div>
                                            
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs font-bold text-slate-700 truncate">{auth.RolRequerido}</span>
                                                    {auth.Estatus === 'Pendiente' && (
                                                        <Tooltip text={`Firmantes: ${auth.PosiblesFirmantes || 'Sin asignar'}`}>
                                                            <Info size={12} className="text-slate-400 cursor-help"/>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    {auth.UsuarioNombre ? `Por: ${auth.UsuarioNombre}` : 'Esperando firma...'}
                                                </div>
                                            </div>
                                        </div>
                                        {auth.Estatus === 'Pendiente' && <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pendiente</span>}
                                    </div>
                                ))}
                                
                                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 mt-4">
                                    <p>La incidencia está bloqueada hasta recibir todas las firmas requeridas.</p>
                                </div>
                            </div>
                        ) : (
                            /* CASO 2: ACCIONES NORMALES */
                            <>
                                {!isClosed ? (
                                    <>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opciones de Gestión</p>
                                        
                                        {canAssign && (
                                            <button onClick={() => setAction('assign')} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all shadow-sm group text-left ${action === 'assign' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                                                <div className={`p-2 rounded-md shrink-0 ${action === 'assign' ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}><ArrowRightLeft size={18}/></div>
                                                <div><div className="text-sm font-bold text-slate-700">Asignar Incidencia</div><div className="text-[10px] text-slate-500 leading-tight mt-0.5">Delegar a otro usuario.</div></div>
                                            </button>
                                        )}

                                        {canAct && (
                                            <>
                                                <button onClick={() => setAction('resolve')} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all shadow-sm group text-left ${action === 'resolve' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'}`}>
                                                    <div className={`p-2 rounded-md shrink-0 ${action === 'resolve' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}><CheckCircle size={18}/></div>
                                                    <div><div className="text-sm font-bold text-slate-700">Corregir y Cerrar</div><div className="text-[10px] text-slate-500 leading-tight mt-0.5">Aplicar corrección válida.</div></div>
                                                </button>
                                                
                                                <button onClick={() => setAction('auth')} className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all shadow-sm group text-left ${action === 'auth' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-200' : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md'}`}>
                                                    <div className={`p-2 rounded-md shrink-0 ${action === 'auth' ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500 group-hover:bg-amber-50 group-hover:text-amber-600'}`}><Shield size={18}/></div>
                                                    <div><div className="text-sm font-bold text-slate-700">Apelar (Excepción)</div><div className="text-[10px] text-slate-500 leading-tight mt-0.5">Defender estatus manual.</div></div>
                                                </button>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-sm bg-slate-50/30 m-5 rounded-lg border border-dashed border-slate-200">
                                        <CheckCircle size={32} className="mb-2 text-slate-300"/> Incidencia cerrada
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* DERECHA: CHAT + FORMULARIO FLOTANTE */}
                <div className="w-3/5 flex flex-col bg-slate-50 h-full relative">
                    {/* ... (Header y Chat se mantienen igual) ... */}
                    <div className="h-12 border-b border-slate-200 flex items-center px-5 bg-white/50 backdrop-blur-sm z-20 shrink-0">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14}/> Historial de Actividad</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 relative">
                        {timeline.map((log: any, index: number) => (
                            <div key={log.BitacoraId} className="relative flex gap-3 group">
                                {index !== timeline.length - 1 && <div className="absolute left-[15px] top-8 bottom-[-20px] w-0.5 bg-slate-200 group-last:hidden"></div>}
                                <div className="relative z-10 flex-shrink-0">
                                    <div className="w-8 h-8 rounded-full bg-white border-2 border-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shadow-sm">
                                        {log.UsuarioNombre?.charAt(0) || '?'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between mb-1 pl-1">
                                        <span className="text-xs font-bold text-slate-700 truncate">{log.UsuarioNombre}</span>
                                        <span className="text-[10px] text-slate-400 font-medium ml-2">{formatDateTime(log.FechaMovimiento)}</span>
                                    </div>
                                    <div className={`p-3 rounded-xl rounded-tl-none shadow-sm border text-sm leading-relaxed ${
                                        log.Accion === 'Resolver' ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 
                                        log.Accion === 'SolicitarAutorizacion' ? 'bg-amber-50 border-amber-100 text-amber-900' : 
                                        log.Accion === 'CancelarSolicitud' ? 'bg-red-50 border-red-100 text-red-900' :
                                        'bg-white border-slate-200 text-slate-700'
                                    }`}>
                                        <div className="text-[9px] font-bold uppercase mb-1 opacity-60 tracking-wide">{log.Accion}</div>
                                        <div className="whitespace-pre-wrap break-words">{log.Comentario}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Espaciador para formulario flotante */}
                        {action && !isPendingAuth && <div className="h-48"></div>}
                    </div>

                    {/* FORMULARIO FLOTANTE (Oculto si está esperando firmas) */}
                    {action && !isPendingAuth && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30 animate-slide-up-fast">
                            <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    {action === 'assign' && <><ArrowRightLeft size={16} className="text-blue-500"/> Reasignar Incidencia</>}
                                    {action === 'resolve' && <><CheckCircle size={16} className="text-emerald-500"/> Resolución Final</>}
                                    {action === 'auth' && <><Shield size={16} className="text-amber-500"/> Justificación</>}
                                </h5>
                                <button onClick={() => setAction(null)} className="text-xs font-medium text-slate-400 hover:text-slate-600 underline">Cancelar</button>
                            </div>

                            <div className="space-y-3">
                                {action === 'assign' && (
                                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" onChange={e => setSelectedUser(e.target.value)} autoFocus>
                                        <option value="">-- Seleccionar Gestor --</option>
                                        {managers.length > 0 ? managers.map(s => <option key={s.UsuarioId} value={s.UsuarioId}>{s.NombreCompleto}</option>) : <option disabled>Cargando...</option>}
                                    </select>
                                )}

                                {action === 'resolve' && (
                                    <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" onChange={e => setSelectedStatus(e.target.value)} autoFocus>
                                        <option value="">-- Seleccionar Estatus Correcto --</option>
                                        {resolutionOptions.length > 0 ? resolutionOptions.map(s => <option key={s.EstatusId} value={s.Abreviatura}>{s.Abreviatura} - {s.Descripcion}</option>) : <option disabled>Cargando...</option>}
                                    </select>
                                )}

                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} placeholder="Nota obligatoria..." value={comment} onChange={e => setComment(e.target.value)}></textarea>

                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleSubmitAction} disabled={!comment || isSubmitting}>
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={14}/> : 'Confirmar Acción'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Detalle de Incidencia" size="5xl">
            {content}
        </Modal>
    );
};