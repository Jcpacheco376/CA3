// src/features/vacations/ApprovalsTable.tsx
import React, { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Clock, Check, X, Slash, ChevronRight, Inbox, ScrollText, User } from 'lucide-react';
import { parseSQLDate } from '../../types/vacations';
import { Tooltip } from '../../components/ui/Tooltip';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface ApprovalsTableProps {
    requests: any[];
    getStatusStyle: (status: string) => string;
    onApproveReject: (id: number, estatus: 'Aprobado' | 'Rechazado' | 'Cancelado') => Promise<void>;
    user: any;
    activasTitle?: string;
    historicoTitle?: string;
}

export const ApprovalsTable: React.FC<ApprovalsTableProps> = ({
    requests,
    getStatusStyle,
    onApproveReject,
    user,
    activasTitle = 'Bandeja de Acción Rápida',
    historicoTitle = 'Histórico de Resoluciones'
}) => {
    const [cancelId, setCancelId] = useState<number | null>(null);

    const handleConfirmCancel = async () => {
        if (cancelId) {
            await onApproveReject(cancelId, 'Cancelado');
            setCancelId(null);
        }
    };

    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-xl border border-slate-200">
                <Clock size={32} className="text-slate-200 mb-3" />
                <p className="text-sm font-medium text-slate-500">No hay solicitudes para mostrar en este momento.</p>
            </div>
        );
    }

    const activas = requests.filter(r => r.Estatus === 'Pendiente');
    const historico = requests.filter(r => r.Estatus !== 'Pendiente');

    // Muestra la secuencia de firmas en una línea compacta con diseño limpio
    const renderCompactSignatures = (firmas: any[]) => {
        if (!firmas || firmas.length === 0) return null;
        return (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-600">
                {firmas.map((f, i) => {
                    const isApp = f.EstatusFirma === 'Aprobado';
                    const isRej = f.EstatusFirma === 'Rechazado';
                    const isCanc = f.EstatusFirma === 'Cancelado';

                    let textColor = 'text-slate-400';
                    let Icon = Clock;

                    if (isApp) { textColor = 'text-emerald-600'; Icon = Check; }
                    else if (isRej) { textColor = 'text-rose-600'; Icon = X; }
                    else if (isCanc) { textColor = 'text-slate-400'; Icon = Slash; }
                    else { textColor = 'text-indigo-500'; Icon = Clock; }

                    const tooltipText = isApp && f.FirmanteNombre
                        ? `Aprobado por: ${f.FirmanteNombre}`
                        : `${f.RolAprobador}: ${f.EstatusFirma || 'Pendiente'}`;

                    return (
                        <div key={i} className="flex items-center">
                            <Tooltip text={tooltipText} placement="top">
                                <div className={`flex items-center gap-1 ${textColor} transition-opacity hover:opacity-80`}>
                                    <Icon size={12} />
                                    <span className="truncate max-w-[90px]">{f.RolAprobador}</span>
                                </div>
                            </Tooltip>
                            {i < firmas.length - 1 && <ChevronRight size={12} className="text-slate-300 mx-0.5" />}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderTable = (data: any[], isActiveView: boolean) => (
        <div className="bg-white border-y sm:border sm:rounded-xl border-slate-200 overflow-x-auto shadow-sm">
            <table className="w-full text-left whitespace-nowrap">
                <thead>
                    <tr className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
                        <th className="px-5 py-3 w-24">ID / Fecha</th>
                        <th className="px-5 py-3 min-w-[250px]">Empleado</th>
                        <th className="px-5 py-3 whitespace-nowrap">Fechas Solicitadas</th>
                        <th className="px-5 py-3">Estado de Firmas</th>
                        <th className="px-5 py-3 text-right">Estatus ó Acción</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm bg-slate-50/50">
                                No hay registros que mostrar en esta sección.
                            </td>
                        </tr>
                    ) : data.map(req => {
                        const userRoles = (user?.Roles || []).map((r: any) => r.NombreRol || '');
                        const canApprove = isActiveView && req.Firmas?.some((f: any) => f.EstatusFirma === 'Pendiente' && userRoles.includes(f.RolAprobador));
                        const canCancel = isActiveView && req.Estatus === 'Pendiente' && (req.UsuarioSolicitanteId === user?.usuarioId || req.UsuarioSolicitanteId === user?.UsuarioId);

                        const dSolicitud = new Date(req.FechaSolicitud);
                        const strFechaSol = isNaN(dSolicitud.getTime()) ? '' : format(addMinutesCorrection(dSolicitud), "dd MMM yy", { locale: es });

                        return (
                            <tr key={req.SolicitudId} className="hover:bg-slate-50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <div className="font-bold text-slate-700">#{req.SolicitudId}</div>
                                        {req.SolicitanteNombre && (
                                            <Tooltip text={`Levantado por: ${req.SolicitanteNombre}`} placement="top">
                                                <div className="text-[8px] font-black text-slate-400 border border-slate-200 bg-slate-50 px-1 py-0.5 rounded uppercase tracking-tighter opacity-80 flex items-center gap-0.5">
                                                    <User size={8} /> {req.SolicitanteNombre.split(' ')[0]}
                                                </div>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium capitalize">{strFechaSol}</div>
                                </td>
                                <td className="px-5 py-3 whitespace-normal align-middle">
                                    <Tooltip text={req.NombreCompleto} placement="top">
                                        <div className="font-medium text-slate-800 text-sm leading-tight mb-0.5 max-w-[300px] transition-colors hover:text-indigo-600 line-clamp-2">{req.NombreCompleto}</div>
                                    </Tooltip>
                                    <div className="text-xs font-medium text-slate-400">{req.CodRef}</div>
                                </td>
                                <td className="px-5 py-3">
                                    <div className="text-sm font-medium text-slate-700">
                                        {format(parseSQLDate(req.FechaInicio)!, 'dd MMM', { locale: es })} – {format(parseSQLDate(req.FechaFin)!, 'dd MMM yy', { locale: es })}
                                    </div>
                                    <div className="text-xs font-bold text-slate-400 mt-0.5">{req.DiasSolicitados} Días</div>
                                </td>
                                <td className="px-5 py-3">
                                    {renderCompactSignatures(req.Firmas)}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    {isActiveView ? (
                                        canApprove ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => onApproveReject(req.SolicitudId, 'Aprobado')} className="px-3 py-1.5 bg-emerald-500 text-white shadow-sm rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors">Aprobar</button>
                                                <button onClick={() => onApproveReject(req.SolicitudId, 'Rechazado')} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 shadow-sm rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors">Rechazar</button>
                                            </div>
                                        ) : canCancel ? (
                                            <button onClick={() => setCancelId(req.SolicitudId)} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 shadow-sm rounded-lg text-xs font-bold hover:bg-rose-50 transition-colors">Cancelar</button>
                                        ) : (
                                            <span className="inline-block px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">En espera</span>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-end">
                                            <span className={`px-2.5 py-1 rounded text-xs font-bold ${getStatusStyle(req.Estatus)}`}>{req.Estatus}</span>
                                            {req.AutorizadorGeneral && (
                                                <Tooltip text={`Resolución dictada por: ${req.AutorizadorGeneral}`} placement="left">
                                                    <span className="text-[10px] font-medium text-slate-500 mt-1 hover:text-indigo-500 transition-colors">
                                                        por: <span className="font-bold truncate max-w-[100px] inline-block align-bottom">{req.AutorizadorGeneral}</span>
                                                    </span>
                                                </Tooltip>
                                            )}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Activas Section */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-800 px-1">
                    <Inbox size={20} className="text-indigo-500" />
                    <h3 className="font-bold text-base">{activasTitle}</h3>
                    {activas.length > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{activas.length}</span>
                    )}
                </div>
                {renderTable(activas, true)}
            </div>

            {/* Historico Section */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-800 pt-2 px-1">
                    <ScrollText size={20} className="text-slate-400" />
                    <h3 className="font-bold text-base">{historicoTitle}</h3>
                </div>
                {renderTable(historico, false)}
            </div>

            <ConfirmationModal
                isOpen={cancelId !== null}
                onClose={() => setCancelId(null)}
                onConfirm={handleConfirmCancel}
                title="Cancelar Solicitud de Vacaciones"
                confirmText="Sí, cancelar"
                cancelText="Mantener solicitud"
                variant="danger"
            >
                ¿Estás seguro de que deseas cancelar de manera definitiva esta solicitud de vacaciones? Esta acción detendrá el trámite y tendrás que volver a solicitarla si cambias de opinión.
            </ConfirmationModal>
        </div>
    );
};

// Corrige desfases de fecha local
function addMinutesCorrection(d: Date) {
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000);
}
