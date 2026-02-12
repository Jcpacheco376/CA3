//src/features/reports/components/IncidentDetailModal.tsx
import ReactDOM from 'react-dom';
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from '../../../components/ui/Modal';
import {
    MessageSquare, User, CheckCircle, Shield, Loader2,
    ArrowRightLeft, Hash, Clock, UserCog, Calendar, Briefcase,
    FileSignature, XCircle, Hourglass, Info, X,
    ThumbsUp, ThumbsDown, ArrowRight, UserCheck, ChevronDown, Search, Check, CheckCheck, BadgeAlert, AlertTriangle
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { API_BASE_URL } from '../../../config/api';
import { useAuth } from '../../auth/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AttendanceStatusCode } from '../../../types';
import { statusColorPalette, themes } from '../../../config/theme';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { useNotification } from '../../../context/NotificationContext';
import { UserAvatar } from '../../../components/ui/UserAvatar';

const getColorClasses = (colorName: string = 'slate') => {
    const palette = statusColorPalette[colorName] || statusColorPalette.slate;
    return {
        bgText: palette.bgText,
        border: palette.border,
        pastel: (palette as any).pastel || `bg-${colorName}-50 text-${colorName}-700`
    };
};

const SeverityBadge = ({ severity }: { severity: string }) => {
    const config = {
        'Critica': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: <BadgeAlert size={12}/> },
        'Advertencia': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle size={12}/> },
        'Info': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: <Info size={12}/> },
    };
    const style = config[severity as keyof typeof config] || config['Info'];
    
    return (
        <Tooltip text={`Nivel de severidad: ${severity}`}>
            <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                {style.icon} {severity}
            </span>
        </Tooltip>
    );
};

// Helper para descripciones de acciones en el historial
const getActionDescription = (action: string) => {
    switch (action) {
        case 'ActualizacionAutomatica': return 'El sistema actualizó la incidencia automáticamente.';
        case 'Asignar': return 'La responsabilidad de la incidencia fue transferida.';
        case 'AutoResolucion': return 'La incidencia se resolvió automáticamente por el sistema.';
        case 'AutorizacionTotal': return 'La solicitud ha recibido todas las autorizaciones necesarias.';
        case 'CancelarSolicitud': return 'La solicitud de autorización fue cancelada.';
        case 'CorreccionManual': return 'Se modificó el estatus de asistencia manualmente.';
        case 'CreacionAutomatica': return 'La incidencia fue creada automáticamente por el sistema.';
        case 'EvolucionAutomatica': return 'El estado de la incidencia evolucionó automáticamente.';
        case 'ReaperturaAutomatica': return 'La incidencia fue reabierta automáticamente.';
        case 'RechazarSolicitud': return 'La solicitud de autorización fue rechazada.';
        case 'Resolver': return 'La incidencia ha sido resuelta y cerrada.';
        case 'SolicitarAutorizacion': return 'Se ha solicitado la aprobación del estatus.';
        case 'VotoPositivo': return 'Se registró un voto a favor de la autorización.';
        default: return 'Registro de actividad en la bitácora.';
    }
};

const formatActionName = (action: string) => {
    return action ? action.replace(/([A-Z])/g, ' $1').trim() : action;
};

// Helper para estilos de acciones en el historial
const getActionStyle = (action: string) => {
    if (action && action.includes('Automatica')) {
        return 'bg-slate-50 border-slate-200 text-slate-600';
    }
    switch (action) {
        case 'Asignar': return 'bg-blue-50 border-blue-200 text-blue-900';
        case 'Resolver': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
        case 'AutoResolucion' : return 'bg-emerald-50 border-emerald-200 text-emerald-900';
        case 'ResolucionManual' : return 'bg-emerald-50 border-emerald-200 text-emerald-900';
        case 'SolicitarAutorizacion': return 'bg-amber-50 border-amber-200 text-amber-900';
        case 'AutorizacionTotal': return 'bg-green-50 border-green-200 text-green-900';
        case 'VotoPositivo': return 'bg-teal-50 border-teal-200 text-teal-900';
        case 'RechazarSolicitud': return 'bg-red-50 border-red-200 text-red-900';
        case 'CancelarSolicitud': return 'bg-rose-50 border-rose-200 text-rose-900';
        case 'CorreccionManual': return 'bg-purple-50 border-purple-200 text-purple-900';
        default: return 'bg-white border-slate-200 text-slate-700';
    }
};

const getStatusDescription = (status: string) => {
    switch (status) {
        case 'Nueva': return 'Incidencia recién creada, requiere atención.';
        case 'Asignada': return 'Incidencia asignada a un gestor para su resolución.';
        case 'PorAutorizar': return 'Esperando autorización de un supervisor.';
        case 'Resuelta': return 'Incidencia cerrada y aplicada en nómina.';
        case 'Cancelada': return 'Incidencia anulada.';
        default: return 'Estado actual de la incidencia.';
    }
};

interface IncidentDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    incidentId: number | null;
    onRefresh: () => void;
}

export const IncidentDetailModal = ({ isOpen, onClose, incidentId, onRefresh }: IncidentDetailModalProps) => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();
    const [confirmation, setConfirmation] = useState<any>({ isOpen: false });

    const [data, setData] = useState<any>(null);
    const [managers, setManagers] = useState<any[]>([]);
    const [resolutionOptions, setResolutionOptions] = useState<any[]>([]);
    const [statusCatalog, setStatusCatalog] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [action, setAction] = useState<'assign' | 'resolve' | 'auth' | null>(null);
    const [comment, setComment] = useState('');
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [dropdownCoords, setDropdownCoords] = useState({ bottom: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);

    const handleToggleDropdown = () => {
        if (!isUserDropdownOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownCoords({
                bottom: window.innerHeight - rect.top + 6,
                left: rect.left,
                width: rect.width
            });
        }
        setIsUserDropdownOpen(!isUserDropdownOpen);
    };

    // Carga Inicial
    useEffect(() => {
        if (isOpen && incidentId) {
            setData(null); setAction(null); setComment(''); setSelectedUser(''); setSelectedStatus('');
            fetchDetails();
            
            const token = getToken();
            fetch(`${API_BASE_URL}/catalogs/attendance-statuses`, { headers: { 'Authorization': `Bearer ${token}` } })
                .then(res => res.ok ? res.json() : [])
                .then(data => setStatusCatalog(data))
                .catch(() => {});
        }
    }, [isOpen, incidentId, getToken]);

    useEffect(() => {
        if (isUserDropdownOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownCoords({
                bottom: window.innerHeight - rect.top + 5,
                left: rect.left,
                width: rect.width
            });
        }
    }, [isUserDropdownOpen]);

    // Carga Lazy
    useEffect(() => {
        if (!action) return;
        const loadDependencies = async () => {
            const token = getToken();
            if (!token) return;
            try {
                if (action === 'assign' && managers.length === 0 && incidentId) {
                    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/managers`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
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
            if (res.ok) setData(await res.json());
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const handleVote = async (authId: number, verdict: 'Aprobado' | 'Rechazado') => {
        const promptMsg = verdict === 'Rechazado'
            ? "Al rechazar, la incidencia regresará al usuario para que la corrija. ¿Continuar?"
            : "¿Confirmas la autorización de esta excepción?";

        setConfirmation({
            isOpen: true,
            title: verdict === 'Aprobado' ? 'Confirmar Aprobación' : 'Confirmar Rechazo',
            message: promptMsg,
            confirmText: verdict === 'Aprobado' ? 'Sí, Aprobar' : 'Sí, Rechazar',
            onConfirm: async () => {
                setIsSubmitting(true);
                const token = getToken();
                try {
                    const res = await fetch(`${API_BASE_URL}/incidents/${incidentId}/vote`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ authId, verdict, comment: verdict === 'Aprobado' ? 'Autorizado' : 'Rechazado por usuario' })
                    });
                    if (res.ok) {
                        onRefresh();
                        fetchDetails();
                        addNotification('Éxito', 'Voto registrado correctamente.', 'success');
                    } else {
                        const err = await res.json();
                        addNotification('Error', err.message || 'Error al registrar voto.', 'error');
                    }
                } catch (e) { console.error(e); addNotification('Error', 'Error de conexión.', 'error'); }
                finally { setIsSubmitting(false); }
            }
        });
    };

    const canISign = (authRow: any) => {
        if (authRow.Estatus !== 'Pendiente') return false;
        return user?.Roles?.some((r: any) => Number(r.RoleId) === Number(authRow.RolRequeridoId));
    };

    const handleSubmitAction = async () => {
        if (action === 'resolve' && !selectedStatus) {
            addNotification('Atención', 'Debes seleccionar un estatus para corregir la incidencia.', 'warning');
            return;
        }

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
                addNotification('Éxito', 'Acción realizada correctamente.', 'success');
            } else {
                addNotification('Error', 'Error al procesar la acción.', 'error');
            }
        } catch (e) { console.error(e); }
        finally { setIsSubmitting(false); }
    };

    const handleCancelAuth = async () => {
        setConfirmation({
            isOpen: true,
            title: 'Cancelar Solicitud',
            message: "¿Estás seguro de cancelar la solicitud? La incidencia regresará a su estado anterior.",
            confirmText: 'Sí, Cancelar',
            onConfirm: async () => {
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
                        fetchDetails();
                        addNotification('Éxito', 'Solicitud cancelada.', 'success');
                    }
                } catch (e) { console.error(e); }
                finally { setIsSubmitting(false); }
            }
        });
    };

    const parseAsLocal = (dateInput: string | Date) => {
        if (!dateInput) return null;
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return null;

        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() + userTimezoneOffset);
    };

    const formatDateHeader = (dateString: string) => {
        const date = parseAsLocal(dateString);
        return date ? format(date, 'EEEE d MMMM, yyyy', { locale: es }) : '-';
    };

    const formatDateTime = (dateString: string) => {
        const date = parseAsLocal(dateString);
        return date ? format(date, 'dd MMM HH:mm', { locale: es }) : '-';
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
        const isPendingAuth = header.Estado === 'PorAutorizar';

        // Lógica actualizada para cancelar solicitud
        const canCancelAuth = isPendingAuth && (header.SolicitadoPorUsuarioId === user?.UsuarioId || user?.permissions['incidencias.resolve']);
        
        const canAssign = !isClosed && !isPendingAuth && (header.Estado === 'Nueva' || amIAssigned || user?.permissions['incidencias.assign']);
        const canAct = !isClosed && !isPendingAuth && amIAssigned;

        content = (
            <div className="flex h-[550px] gap-0 border border-slate-200 rounded-xl overflow-hidden">
                {/* IZQUIERDA */}
                <div className="w-2/5 flex flex-col border-r border-slate-200 bg-white pr-0">

                    {/* Header Ficha */}
                    <div className="p-5 pb-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded border border-slate-200 flex items-center gap-1">
                                <Hash size={10} className="text-slate-400" /> {incidentId}
                            </span>
                            <div className="flex gap-2">
                                {header.NivelCriticidad && <SeverityBadge severity={header.NivelCriticidad} />}
                                <Tooltip text={getStatusDescription(header.Estado)}>
                                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                                        header.Estado === 'Nueva' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                        header.Estado === 'Asignada' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                        header.Estado === 'PorAutorizar' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        header.Estado === 'Resuelta' ? 'bg-green-50 text-green-700 border-green-100' :
                                        'bg-slate-50 text-slate-500 border-slate-200'
                                    }`}>
                                        {header.Estado}
                                    </span>
                                </Tooltip>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight truncate" title={header.Empleado}>{header.Empleado}</h3>
                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500 items-center">
                            <div className="flex items-center gap-1.5"><Briefcase size={12} className="text-slate-400" /> {header.Departamento || 'Sin Depto'}</div>
                            <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-400" /> {formatDateHeader(header.Fecha)}</div>
                        </div>
                    </div>

                    {/* VS Component */}
                    <div className="px-5 mb-4">
                        {(() => {
                            const sysStatus = statusCatalog.find(s => s.Abreviatura === header.EstatusChecadorOriginal);
                            const manStatusOriginal = statusCatalog.find(s => s.Abreviatura === header.EstatusManualOriginal);
                            const manStatusActual = statusCatalog.find(s => s.Abreviatura === header.EstatusManualActual);
                            
                            // Usamos colores de texto en lugar de fondo completo para reducir la intensidad
                            const sysColor = sysStatus?.ColorUI ? `text-${sysStatus.ColorUI}-600` : 'text-slate-600';
                            const manColorOriginal = manStatusOriginal?.ColorUI ? `text-${manStatusOriginal.ColorUI}-600` : 'text-indigo-600';
                            const manColorActual = manStatusActual?.ColorUI ? `text-${manStatusActual.ColorUI}-600` : 'text-emerald-600';
                            
                            const hasStatusChanged = header.EstatusManualActual && header.EstatusManualActual !== header.EstatusManualOriginal;
                            
                            return (
                        <div className="relative flex shadow-sm rounded-xl overflow-hidden border border-slate-200 h-20 group bg-white">
                            <div className="flex-1 flex flex-col items-center justify-center relative border-r border-slate-100">
                                <Tooltip text="Estatus calculado automáticamente por el reloj checador">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5"><Clock size={12} /> Sistema</div>
                                </Tooltip>
                                <Tooltip text={sysStatus?.Descripcion || 'Sin descripción'}>
                                    <div className={`text-2xl font-black tracking-tight ${sysColor}`}>{header.EstatusChecadorOriginal || '-'}</div>
                                </Tooltip>
                                <div className="text-[9px] text-slate-400 truncate max-w-[120px]">{sysStatus?.Descripcion || 'No registrado'}</div>
                            </div>
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                <Tooltip text="Comparativa: Sistema vs Manual">
                                    <div className="bg-slate-50 border border-slate-200 rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                                        <span className="text-[8px] font-black text-slate-400 italic">VS</span>
                                    </div>
                                </Tooltip>
                            </div>
                            
                            <div className={`flex-1 flex flex-col items-center justify-center relative ${hasStatusChanged ? 'bg-emerald-50/30' : ''}`}>
                                <Tooltip text="Estatus asignado manualmente o propuesto para corrección">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1.5">Manual <UserCog size={12} /></div>
                                </Tooltip>
                                {hasStatusChanged ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="flex items-center gap-2">
                                            <Tooltip text={manStatusOriginal?.Descripcion || 'Original'}>
                                                <span className="text-xl font-bold text-slate-400 shrink-0">{header.EstatusManualOriginal || '-'}</span>
                                            </Tooltip>
                                            <ArrowRight size={16} className="text-slate-400 shrink-0" />
                                            <Tooltip text={manStatusActual?.Descripcion || 'Nuevo'}>
                                                <span className={`text-2xl font-black tracking-tight ${manColorActual}`}>{header.EstatusManualActual}</span>
                                            </Tooltip>
                                        </div>
                                        <div className="text-[9px] text-slate-500 truncate max-w-[140px] mt-1">{manStatusActual?.Descripcion || 'No asignado'}</div>
                                    </div>
                                ) : (
                                    <>
                                        <Tooltip text={manStatusOriginal?.Descripcion || 'Sin descripción'}>
                                            <div className={`text-2xl font-black tracking-tight ${manColorOriginal}`}>{header.EstatusManualOriginal || '-'}</div>
                                        </Tooltip>
                                        <div className="text-[9px] text-slate-400 truncate max-w-[120px]">{manStatusOriginal?.Descripcion || 'No asignado'}</div>
                                    </>
                                )}
                            </div>
                        </div>
                            );
                        })()}
                    </div>

                    {/* ZONA DE ACCIONES */}
                    <div className="flex-1 overflow-y-auto space-y-2 px-5 pb-5 custom-scrollbar">
                        {isPendingAuth ? (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                                        <Hourglass size={12} /> Proceso de Aprobación
                                    </p>
                                    {canCancelAuth && (
                                        <Tooltip text="Cancelar solicitud">
                                            <button onClick={handleCancelAuth} disabled={isSubmitting} className="text-[10px] text-red-500 hover:text-red-700 font-semibold underline flex items-center gap-1">
                                                <XCircle size={10} /> Cancelar Solicitud
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                                {authorizations?.map((auth: any) => {
                                    const showButtons = canISign(auth);
                                    
                                    return (
                                        <div key={auth.AutorizacionId} className="p-3 bg-white border border-slate-100 rounded-lg shadow-sm">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${auth.Estatus === 'Aprobado' ? 'bg-green-100 text-green-600' : auth.Estatus === 'Rechazado' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {auth.Estatus === 'Aprobado' ? <CheckCircle size={16} /> : auth.Estatus === 'Rechazado' ? <XCircle size={16} /> : <FileSignature size={16} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-bold text-slate-700 truncate block">{auth.RolRequerido}</span>
                                                        <div className="text-[10px] text-slate-400 truncate" title={auth.UsuarioNombre}>
                                                            {auth.UsuarioNombre ? `Por: ${auth.UsuarioNombre}` : 'Esperando firma...'}
                                                        </div>
                                                    </div>
                                                </div>
                                                {!showButtons && auth.Estatus === 'Pendiente' && (
                                                    <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Pendiente</span>
                                                )}
                                            </div>
                                            
                                            {showButtons && (
                                                <div className="flex gap-2 mt-1 border-t pt-2 border-slate-100">
                                                    <Tooltip text="Autorizar solicitud" triggerClassName="flex-1 flex">
                                                        <button onClick={() => handleVote(auth.AutorizacionId, 'Aprobado')} disabled={isSubmitting} className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded py-1 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                                                            <ThumbsUp size={12} /> Aprobar
                                                        </button>
                                                    </Tooltip>
                                                    <Tooltip text="Rechazar solicitud" triggerClassName="flex-1 flex">
                                                        <button onClick={() => handleVote(auth.AutorizacionId, 'Rechazado')} disabled={isSubmitting} className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded py-1 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                                                            <ThumbsDown size={12} /> Rechazar
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100 mt-4 flex gap-2">
                                    <Info size={16} className="shrink-0" />
                                    <p>La incidencia está bloqueada hasta recibir todas las firmas.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {!isClosed ? (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Opciones de Gestión</p>
                                        {canAssign && (
                                            <button onClick={() => setAction('assign')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all shadow-sm group text-left mb-2 ${action === 'assign' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md hover:bg-blue-50/30'}`}>
                                                <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${action === 'assign' ? 'bg-blue-200 text-blue-700' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}><ArrowRightLeft size={20} /></div>
                                                <div><div className="text-sm font-bold text-slate-700">Asignar</div><div className="text-[10px] text-slate-500 leading-tight mt-0.5">Delegar incidencia.</div></div>
                                            </button>
                                        )}
                                        {canAct && (
                                            <>
                                                <button onClick={() => setAction('resolve')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all shadow-sm group text-left mb-2 ${action === 'resolve' ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-md hover:bg-emerald-50/30'}`}>
                                                    <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${action === 'resolve' ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'}`}><CheckCircle size={20} /></div>
                                                    <div><div className="text-sm font-bold text-slate-700">Corregir</div><div className="text-[10px] text-slate-500 leading-tight mt-0.5">Aplicar corrección.</div></div>
                                                </button>
                                                <button onClick={() => setAction('auth')} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all shadow-sm group text-left ${action === 'auth' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-200' : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md hover:bg-amber-50/30'}`}>
                                                    <div className={`p-2.5 rounded-lg shrink-0 transition-colors ${action === 'auth' ? 'bg-amber-200 text-amber-700' : 'bg-slate-100 text-slate-500 group-hover:bg-amber-100 group-hover:text-amber-600'}`}><Shield size={20} /></div>
                                                    <div><div className="text-sm font-bold text-slate-700">Apelar</div><div className="text-[10px] text-slate-500 leading-tight mt-0.5">Solicitar excepción.</div></div>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-sm bg-slate-50/30 m-5 rounded-lg border border-dashed border-slate-200">
                                        <CheckCircle size={32} className="mb-2 text-slate-300" /> Incidencia cerrada
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* DERECHA: CHAT + FORMULARIO */}
                <div className="w-3/5 flex flex-col bg-slate-50 h-full relative">
                    <div className="h-12 border-b border-slate-200 flex items-center px-5 bg-white/50 backdrop-blur-sm z-20 shrink-0">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={14} /> Historial de Actividad</h4>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5 relative">
                        {timeline.map((log: any, index: number) => {
                            const correctedDate = parseAsLocal(log.FechaMovimiento);
                            return (
                                <div key={log.BitacoraId} className="relative flex gap-3 group">
                                    {index !== timeline.length - 1 && <div className="absolute left-[15px] top-8 bottom-[-20px] w-0.5 bg-slate-200 group-last:hidden"></div>}
                                    <div className="relative z-10 flex-shrink-0">
                                        <UserAvatar name={log.UsuarioNombre} theme={log.UsuarioTheme || log.Theme} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between mb-1 pl-1">
                                            <span className="text-xs font-bold text-slate-700 truncate">{log.UsuarioNombre}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {correctedDate ? format(correctedDate, 'dd MMM HH:mm', { locale: es }) : '-'}{' '}
                                                {correctedDate && <span className="text-[9px] text-slate-400">({formatDistanceToNow(correctedDate, { addSuffix: true, locale: es })})</span>}
                                            </span>
                                        </div>

                                        <div className={`p-3 rounded-xl rounded-tl-none shadow-sm border text-sm leading-relaxed ${getActionStyle(log.Accion)}`}>
                                            <div className="text-[9px] font-bold uppercase mb-1 opacity-70 tracking-wide flex items-center gap-1 flex-wrap">
                                                <Tooltip text={getActionDescription(log.Accion)} placement="top">
                                                    <span >{formatActionName(log.Accion)}</span>
                                                </Tooltip>
                                                {log.Accion === 'Asignar' && log.AsignadoANombre && (
                                                    <Tooltip text={`Responsabilidad transferida a ${log.AsignadoANombre}`}>
                                                        <span className="flex items-center gap-1 text-indigo-600 bg-white px-1.5 rounded border border-indigo-100 shadow-sm normal-case ml-1  hover:bg-indigo-50 transition-colors">
                                                            <ArrowRight size={10} />
                                                            {log.AsignadoANombre}
                                                        </span>
                                                    </Tooltip>
                                                )}
                                                {/* Visualización de cambio de estatus en el historial */}
                                                {log.EstatusManualId_Anterior !== log.EstatusManualId_Nuevo && (
                                                    (() => {
                                                        const prevStatus = statusCatalog.find(s => s.EstatusId === log.EstatusManualId_Anterior);
                                                        const newStatus = statusCatalog.find(s => s.EstatusId === log.EstatusManualId_Nuevo);
                                                        const prevTheme = themes[prevStatus?.ColorUI || 'slate'];
                                                        const newTheme = themes[newStatus?.ColorUI || 'slate'];

                                                        return (
                                                            <Tooltip text={`Cambio: ${prevStatus?.Descripcion || 'Original'} ➔ ${newStatus?.Descripcion || 'Nuevo'}`}>
                                                                <span className="flex items-center gap-1.5 ml-1.5 normal-case ">
                                                                    <span className="font-bold text-[11px]" style={{ color: prevTheme[600] }}>{prevStatus?.Abreviatura || '-'}</span>
                                                                    <ArrowRight size={12} className="text-slate-400" />
                                                                    <span className="font-black text-[11px]" style={{ color: newTheme[700] }}>{newStatus?.Abreviatura || '?'}</span>
                                                                </span>
                                                            </Tooltip>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                            <div className="whitespace-pre-wrap break-words">{log.Comentario}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {action && !isPendingAuth && <div className="h-48"></div>}
                    </div>

                    {/* Formulario Inferior */}
                    {action && !isPendingAuth && (
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] z-30 animate-slide-up-fast">
                            <div className="flex justify-between items-center mb-3">
                                <h5 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    {action === 'assign' && <><ArrowRightLeft size={16} className="text-blue-500" /> Reasignar Incidencia</>}
                                    {action === 'resolve' && <><CheckCircle size={16} className="text-emerald-500" /> Resolución Final</>}
                                    {action === 'auth' && <><Shield size={16} className="text-amber-500" /> Justificación</>}
                                </h5>
                                <button onClick={() => setAction(null)} className="text-xs font-medium text-slate-400 hover:text-slate-600 underline">Cancelar</button>
                            </div>

                            <div className="space-y-3">
                                {action === 'assign' && (
                                    <div className="relative">
                                        <button
                                            ref={triggerRef}
                                            onClick={handleToggleDropdown}
                                            className={`w-full p-3 bg-white border rounded-xl text-left flex items-center justify-between transition-all shadow-sm group ${isUserDropdownOpen ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {selectedUser ? (
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    {(() => {
                                                        const sel = managers.find(m => m.UsuarioId.toString() === selectedUser.toString());
                                                        return (
                                                            <>
                                                                <UserAvatar name={sel?.NombreCompleto} theme={sel?.Theme} />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm font-bold text-slate-700 truncate leading-tight">{sel?.NombreCompleto || 'Desconocido'}</span>
                                                                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                                                                        <Shield size={10} /> {sel?.RolPrincipal || 'Usuario'}
                                                                    </span>
                                                                </div>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-slate-400">Seleccionar Gestor...</span>
                                            )}
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''} shrink-0 ml-2`} />
                                        </button>

                                        {isUserDropdownOpen && ReactDOM.createPortal(
                                            <>
                                                <div className="fixed inset-0 z-[9998]" onClick={() => setIsUserDropdownOpen(false)}></div>
                                                <div
                                                    className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl z-[9999] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150 origin-bottom"
                                                    style={{
                                                        bottom: dropdownCoords.bottom,
                                                        left: dropdownCoords.left,
                                                        width: dropdownCoords.width,
                                                        maxHeight: '300px'
                                                    }}
                                                >
                                                    <div className="p-2 border-b border-slate-100 bg-slate-50 sticky top-0 z-10">
                                                        <div className="relative">
                                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                            <input
                                                                type="text"
                                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                                                                placeholder="Buscar..."
                                                                autoFocus
                                                                value={userSearchTerm}
                                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="overflow-y-auto custom-scrollbar p-1">
                                                        {managers
                                                            .filter(m =>
                                                                m.NombreCompleto.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                                                                (m.RolPrincipal && m.RolPrincipal.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                                            )
                                                            .map(m => (
                                                                <button
                                                                    key={m.UsuarioId}
                                                                    onClick={() => {
                                                                        setSelectedUser(m.UsuarioId);
                                                                        setIsUserDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left group mb-0.5 ${selectedUser.toString() === m.UsuarioId.toString()
                                                                            ? 'bg-blue-50 ring-1 ring-blue-100'
                                                                            : 'hover:bg-slate-50'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        <UserAvatar name={m.NombreCompleto} theme={m.Theme} />
                                                                        <div className="flex flex-col min-w-0">
                                                                            <span className={`text-sm font-medium truncate ${selectedUser.toString() === m.UsuarioId.toString() ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                                                                                {m.NombreCompleto}
                                                                            </span>
                                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                                                                                <Shield size={10} /> {m.RolPrincipal}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {selectedUser.toString() === m.UsuarioId.toString() && (
                                                                        <Check size={16} className="text-blue-600 shrink-0 ml-2" />
                                                                    )}
                                                                </button>
                                                            ))
                                                        }
                                                        {managers.length === 0 && (
                                                            <div className="p-6 text-center text-xs text-slate-400 flex flex-col items-center">
                                                                <User size={24} className="mb-2 opacity-20"/>
                                                                No se encontraron gestores.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </>,
                                            document.body
                                        )}
                                    </div>
                                )}
                                {action === 'resolve' && (
                                    <div className="mb-4">
                                        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Selecciona el Estatus Correcto:</p>
                                        <div className="grid grid-cols-4 gap-2">
                                            {resolutionOptions.map((status: any) => {
                                                const themeBtn = getColorClasses(status.ColorUI);
                                                const isSelected = selectedStatus === status.Abreviatura;
                                                
                                                return (
                                                    <Tooltip key={status.EstatusId} text={status.Descripcion} placement="top">
                                                        <button
                                                            onClick={() => setSelectedStatus(isSelected ? '' : status.Abreviatura)}
                                                            className={`
                                                                relative w-full p-2 rounded-lg text-center transition-all duration-200 border border-transparent
                                                                ${themeBtn.bgText}
                                                                ${isSelected 
                                                                    ? `ring-2 ring-offset-1 ring-[--theme-500] shadow-md transform scale-[1.02]` 
                                                                    : `hover:scale-[1.08] hover:shadow-sm`
                                                                }
                                                            `}
                                                        >
                                                            {isSelected && (
                                                                <div className="absolute top-1 right-1">
                                                                    <Check size={14} className="text-current" />
                                                                </div>
                                                            )}
                                                            <span className="block text-2xl font-bold mb-0.5">{status.Abreviatura}</span>
                                                            <span className="block text-xs font-medium leading-tight opacity-90 truncate px-1">{status.Descripcion}</span>
                                                        </button>
                                                    </Tooltip>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none" rows={2} placeholder="Nota obligatoria..." value={comment} onChange={e => setComment(e.target.value)}></textarea>

                                <div className="flex justify-end">
                                    <Button size="sm" onClick={handleSubmitAction} disabled={comment.trim().length < 5 || isSubmitting || (action === 'resolve' && !selectedStatus)}>
                                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={14} /> : 'Confirmar'}
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
            <ConfirmationModal 
                isOpen={confirmation.isOpen} 
                onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
                onConfirm={() => {
                    if (confirmation.onConfirm) confirmation.onConfirm();
                    setConfirmation({ ...confirmation, isOpen: false });
                }}
                title={confirmation.title || 'Confirmación'}
                confirmText={confirmation.confirmText}
            >
                {confirmation.message}
            </ConfirmationModal>
        </Modal>
    );
};