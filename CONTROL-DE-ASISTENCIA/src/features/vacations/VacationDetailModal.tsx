// src/features/vacations/VacationDetailModal.tsx
import React from 'react';
import { format } from 'date-fns';
import { CreditCard, Umbrella, User, Calendar } from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { parseSQLDate, VacationDetailModalState } from '../../types/vacations';

interface VacationDetailModalProps {
    detailModal: VacationDetailModalState | null;
    onClose: () => void;
    getStatusStyle: (status: string) => string;
}

const classifyRecord = (r: any, def: string): string => {
    const t = (r.Tipo || '').toString().toUpperCase();
    if (t.includes('PAGAD')) return 'PAGADOS';
    if (t.includes('AJUSTE')) return 'AJUSTES';
    if (t.includes('DISFRUTAD')) return 'DISFRUTADOS';
    return def;
};

export const VacationDetailModal: React.FC<VacationDetailModalProps> = ({
    detailModal,
    onClose,
    getStatusStyle,
}) => {
    if (!detailModal) return null;

    const combinedRecords = [
        ...(detailModal.data.prenomina?.map((r: any) => ({
            ...r,
            DisplayType: classifyRecord(r, 'DISFRUTADOS')
        })) || []),
        ...(detailModal.data.ajustes?.map((r: any) => ({
            ...r,
            DisplayType: classifyRecord(r, 'AJUSTES')
        })) || [])
    ].sort((a, b) => new Date(a.Fecha).getTime() - new Date(b.Fecha).getTime());

    const hasSolicitudes = detailModal.data.solicitudes?.length > 0;
    const isEmpty = combinedRecords.length === 0 && !hasSolicitudes;

    return (
        <Modal
            isOpen={!!detailModal}
            onClose={onClose}
            title={
                <div className="flex flex-col">
                    <span className="text-lg font-bold">Detalle Aniversario {detailModal.year}</span>
                    <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            <User size={12} className="text-slate-400" />
                            {detailModal.employeeName}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
                            <Calendar size={12} className="text-slate-400" />
                            {detailModal.period}
                        </div>
                    </div>
                </div>
            }
            size="lg"
        >
            <div className="space-y-6">
                {isEmpty ? (
                    <div className="py-8 text-center text-slate-400 italic">
                        No hay movimientos registrados para este periodo.
                    </div>
                ) : (
                    <>
                        {combinedRecords.length > 0 && (
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                                    <CreditCard size={14} className="text-[--theme-500]" /> Movimientos de Cuenta
                                </h4>
                                <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Fecha</th>
                                                <th className="px-4 py-3 text-left">Concepto / Detalle</th>
                                                <th className="px-4 py-3 text-right">Días</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {combinedRecords.map((r: any, i: number) => {
                                                const isPositive = r.Dias > 0;
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-2.5 font-medium text-slate-600 font-mono">
                                                            {format(parseSQLDate(r.Fecha)!, 'dd MMM yyyy')}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.DisplayType === 'PAGADOS' ? 'bg-amber-100 text-amber-700' :
                                                                    r.DisplayType === 'AJUSTES' ? 'bg-indigo-100 text-indigo-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                                    }`}>
                                                                    {r.DisplayType}
                                                                </span>
                                                                {(r.Descripcion || r.Comentarios || r.Motivo) && (
                                                                    <span className="text-[10px] text-slate-400 italic truncate max-w-[250px]" title={r.Descripcion || r.Comentarios || r.Motivo}>
                                                                        {r.Descripcion || r.Comentarios || r.Motivo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-2.5 text-right font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {isPositive ? '+' : ''}{r.Dias}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {hasSolicitudes && (
                            <div>
                                <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1 mt-2">
                                    <Umbrella size={14} className="text-[--theme-500]" /> Historial de Solicitudes en el Periodo
                                </h4>
                                <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left">Periodo registrado</th>
                                                <th className="px-4 py-3 text-left">Estatus</th>
                                                <th className="px-4 py-3 text-right">Días</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {detailModal.data.solicitudes.map((s: any, i: number) => (
                                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-2.5">
                                                        <div className="font-bold text-slate-700">
                                                            {format(parseSQLDate(s.FechaInicio)!, 'dd MMM')} al {format(parseSQLDate(s.FechaFin)!, 'dd MMM yyyy')}
                                                        </div>
                                                        {s.Comentarios && <div className="text-[10px] text-slate-400 italic line-clamp-1">{s.Comentarios}</div>}
                                                    </td>
                                                    <td className="px-4 py-2.5">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getStatusStyle(s.Estatus)}`}>
                                                            {s.Estatus}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2.5 text-right font-black text-slate-700">
                                                        {s.DiasSolicitados} d
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <Button variant="secondary" onClick={onClose} className="w-full">Cerrar Detalle</Button>
            </div>
        </Modal>
    );
};
