// src/features/vacations/ApprovalsTable.tsx
import React from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { parseSQLDate } from '../../types/vacations';

interface ApprovalsTableProps {
    requests: any[];
    getStatusStyle: (status: string) => string;
    onApproveReject: (id: number, estatus: 'Aprobado' | 'Rechazado') => Promise<void>;
}

export const ApprovalsTable: React.FC<ApprovalsTableProps> = ({
    requests,
    getStatusStyle,
    onApproveReject,
}) => {
    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
                <Clock size={48} className="text-slate-200 mb-4" />
                <p className="text-slate-500">No hay solicitudes pendientes.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                        <th className="px-6 py-3 font-bold">Empleado</th>
                        <th className="px-6 py-3 font-bold">Fechas</th>
                        <th className="px-6 py-3 font-bold text-center">Días</th>
                        <th className="px-6 py-3 font-bold text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(req => (
                        <tr key={req.SolicitudId} className="hover:bg-slate-50 transition-colors border-b">
                            <td className="px-6 py-4">
                                <div className="font-bold">{req.NombreCompleto}</div>
                                <div className="text-xs text-slate-400">{req.CodRef}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm">{format(parseSQLDate(req.FechaInicio)!, 'dd MMM')} al {format(parseSQLDate(req.FechaFin)!, 'dd MMM yy')}</div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold">{req.DiasSolicitados}</td>
                            <td className="px-6 py-4 text-right space-x-2">
                                {req.Estatus === 'Pendiente' && (
                                    <>
                                        <button onClick={() => onApproveReject(req.SolicitudId, 'Aprobado')} className="px-3 py-1 bg-emerald-500 text-white rounded text-xs font-bold">Aprobar</button>
                                        <button onClick={() => onApproveReject(req.SolicitudId, 'Rechazado')} className="px-3 py-1 bg-rose-500 text-white rounded text-xs font-bold">Rechazar</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
