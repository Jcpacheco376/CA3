import React, { useState } from 'react';
import {
    CreditCard, Umbrella, User, Calendar,
    Edit, Save, X, Loader2, Zap, Trash2, AlertCircle
} from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { Tooltip } from '../../components/ui/Tooltip';
import { ModernDatePicker } from '../../components/ui/ModernDatePicker';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { parseSQLDate, VacationDetailModalState } from '../../types/vacations';
import { addDays, format } from 'date-fns';

interface VacationDetailModalProps {
    detailModal: VacationDetailModalState | null;
    onClose: () => void;
    getStatusStyle: (status: string) => string;
    canManageVacations?: boolean;
    onSaveAdjustment?: (saldoId: number, dias: number, fecha: string, detalleId?: number | null) => Promise<void>;
    onDeleteAdjustment?: (detalleId: number) => Promise<void>;
}

const classifyRecord = (r: any, def: string): string => {
    const t = (r.Tipo || r.tipo || '').toString().toUpperCase();
    if (t.includes('PAGAD')) return 'PAGADOS';
    if (t.includes('AJUSTE')) return 'AJUSTES';
    if (t.includes('DISFRUTAD')) return 'DISFRUTADOS';
    if (t.includes('SALDOS INICIALES')) return 'SALDOS INICIALES';
    return def;
};

export const VacationDetailModal: React.FC<VacationDetailModalProps> = ({
    detailModal,
    onClose,
    getStatusStyle,
    canManageVacations = false,
    onSaveAdjustment,
    onDeleteAdjustment,
}) => {
    const [isEditingAdjustment, setIsEditingAdjustment] = React.useState(false);
    const [adjDays, setAdjDays] = React.useState<number>(0);
    const [adjDate, setAdjDate] = React.useState<string>('');
    const [isSaving, setIsSaving] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

    // Resetear estados al cerrar o cambiar de detalle
    React.useEffect(() => {
        if (!detailModal) {
            setIsEditingAdjustment(false);
            setAdjDays(0);
            setAdjDate('');
            setPendingDeleteId(null);
            setIsConfirmDeleteOpen(false);
        }
    }, [detailModal]);

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

    const existingAdjustment = detailModal.data.ajustes?.find((a: any) =>
        (a.tipo || a.Tipo || '').toString().toLowerCase() === 'ajuste'
    );

    const hasSolicitudes = (detailModal.data.solicitudes?.length || 0) > 0;

    const handleStartEdit = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setAdjDays(existingAdjustment?.Dias || existingAdjustment?.dias || 0);

        let initialDateStr = '';
        if (existingAdjustment?.Fecha) {
            initialDateStr = format(parseSQLDate(existingAdjustment.Fecha)!, 'yyyy-MM-dd');
        } else if (detailModal.endDate) {
            const d = parseSQLDate(detailModal.endDate);
            if (d) {
                initialDateStr = format(addDays(d, 1), 'yyyy-MM-dd');
            }
        }

        setAdjDate(initialDateStr || format(new Date(), 'yyyy-MM-dd'));
        setIsEditingAdjustment(true);
    };

    const handleSave = async () => {
        if (!onSaveAdjustment || !detailModal.saldoId) return;

        // Lógica de "0 = Eliminar"
        if (adjDays === 0) {
            const existingId = existingAdjustment?.detalleId || existingAdjustment?.DetalleId || existingAdjustment?.VacacionesDetalleId;
            if (existingId) {
                setPendingDeleteId(existingId);
                setIsConfirmDeleteOpen(true);
            } else {
                // Si es un ajuste nuevo y le pusieron 0, solo cancelar edición
                setIsEditingAdjustment(false);
            }
            return;
        }

        setIsSaving(true);
        try {
            await onSaveAdjustment(
                detailModal.saldoId,
                adjDays,
                adjDate,
                existingAdjustment?.detalleId || existingAdjustment?.DetalleId || existingAdjustment?.VacacionesDetalleId
            );
            setIsEditingAdjustment(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRequestDelete = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        const id = existingAdjustment?.detalleId || existingAdjustment?.DetalleId || existingAdjustment?.VacacionesDetalleId;
        if (!id) return;
        setPendingDeleteId(id);
        setIsConfirmDeleteOpen(true);
    };

    const performDelete = async () => {
        if (!onDeleteAdjustment || !pendingDeleteId) return;
        setIsDeleting(true);
        try {
            await onDeleteAdjustment(pendingDeleteId);
            setIsEditingAdjustment(false);
            setIsConfirmDeleteOpen(false);
            setPendingDeleteId(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
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
                    <div>
                        <h4 className="flex items-center justify-between gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                            <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-slate-400" /> Movimientos de Cuenta
                            </div>
                            {canManageVacations && detailModal.saldoId && !isEditingAdjustment && !existingAdjustment && (
                                <button
                                    onClick={handleStartEdit}
                                    className="flex items-center gap-1.5 px-2 py-1 text-indigo-600 hover:text-indigo-700 hover:bg-slate-50 border border-transparent hover:border-indigo-100 rounded-lg transition-all lowercase font-bold"
                                >
                                    <Zap size={12} className="text-indigo-500" />
                                    añadir ajuste
                                </button>
                            )}
                        </h4>

                        <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-[140px]">Fecha</th>
                                        <th className="px-4 py-3 text-left">Concepto / Detalle</th>
                                        <th className="px-4 py-3 text-right w-[100px]">Días</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                        let rows = [...combinedRecords];
                                        if (isEditingAdjustment && !existingAdjustment) {
                                            const newRow = {
                                                Fecha: adjDate,
                                                DisplayType: 'AJUSTES',
                                                Dias: adjDays,
                                                isNew: true
                                            };
                                            rows = [newRow, ...rows];
                                        }

                                        if (rows.length === 0 && !isEditingAdjustment) {
                                            return (
                                                <tr>
                                                    <td colSpan={3} className="py-8 text-center text-slate-400 italic bg-slate-50/50">
                                                        No hay movimientos de cuenta registrados
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return rows.map((r: any, i: number) => {
                                            const isAjusteRow = (r.DisplayType === 'AJUSTES' && !r.isNew && !r.Concepto) || r.isNew;
                                            const isEditingThis = isEditingAdjustment && isAjusteRow;
                                            const isPositive = r.Dias > 0;

                                            if (isEditingThis) {
                                                return (
                                                    <tr key={i} className="bg-indigo-50/15 animate-in fade-in duration-200 h-[42px]">
                                                        <td className="px-4 py-0 align-middle">
                                                            <Tooltip text="Fecha de aplicación del ajuste" placement="top">
                                                                <div>
                                                                    <ModernDatePicker
                                                                        value={adjDate}
                                                                        onChange={(date) => date && setAdjDate(format(date, 'yyyy-MM-dd'))}
                                                                        variant="ghost"
                                                                        className="!p-0"
                                                                    />
                                                                </div>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="px-4 py-0 align-middle">
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-sm inline-block">
                                                                AJUSTE
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-0 align-middle">
                                                            <div className="flex items-center gap-1.5 justify-end h-full">
                                                                <Tooltip text="Días a ajustar (positivo o negativo)" placement="top">
                                                                    <input
                                                                        type="number"
                                                                        value={adjDays}
                                                                        onChange={(e) => setAdjDays(Number(e.target.value))}
                                                                        className="w-12 bg-transparent text-right text-sm font-black text-indigo-700 outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 transition-all"
                                                                        placeholder="0"
                                                                        autoFocus
                                                                    />
                                                                </Tooltip>
                                                                <div className="flex items-center gap-0.5 ml-1 border-l border-slate-200 pl-1.5 h-6">
                                                                    {existingAdjustment && (
                                                                        <Tooltip text="Eliminar ajuste" placement="top">
                                                                            <button onClick={handleRequestDelete} disabled={isSaving || isDeleting} className="p-1 text-rose-500 hover:bg-rose-50 rounded transition-colors">
                                                                                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                                            </button>
                                                                        </Tooltip>
                                                                    )}
                                                                    <Tooltip text="Guardar cambios" placement="top">
                                                                        <button onClick={handleSave} disabled={isSaving || isDeleting} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors">
                                                                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                                                                        </button>
                                                                    </Tooltip>
                                                                    <Tooltip text="Descartar edición" placement="top">
                                                                        <button onClick={() => setIsEditingAdjustment(false)} disabled={isSaving || isDeleting} className="p-1 text-slate-400 hover:bg-slate-50 rounded transition-colors">
                                                                            <X size={12} />
                                                                        </button>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr
                                                    key={i}
                                                    onClick={isAjusteRow && canManageVacations ? handleStartEdit : undefined}
                                                    className={`hover:bg-slate-50 transition-colors group ${isAjusteRow && canManageVacations ? 'cursor-pointer' : ''}`}
                                                >
                                                    <td className="px-4 py-3 font-medium text-slate-600 font-mono">
                                                        {format(parseSQLDate(r.Fecha)!, 'dd MMM yy')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${r.DisplayType === 'PAGADOS' ? 'bg-amber-100 text-amber-700' :
                                                                r.DisplayType === 'AJUSTES' ? 'bg-indigo-100 text-indigo-700' :
                                                                    r.DisplayType === 'SALDOS INICIALES' ? 'bg-emerald-100 text-emerald-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {r.DisplayType}
                                                            </span>
                                                            <div className="flex-1 flex items-center justify-between min-w-0">
                                                                {(r.Descripcion || r.Comentarios || r.Motivo) && (
                                                                    <span className="text-[10px] text-slate-400 italic truncate max-w-[200px] group-hover:text-slate-500 transition-colors" title={r.Descripcion || r.Comentarios || r.Motivo}>
                                                                        {r.Descripcion || r.Comentarios || r.Motivo}
                                                                    </span>
                                                                )}
                                                                {isAjusteRow && canManageVacations && (
                                                                    <Tooltip text="Editar ajuste" placement="left">
                                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center p-1 text-indigo-400">
                                                                            <Edit size={12} />
                                                                        </div>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-4 py-3 text-right font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {isPositive ? '+' : ''}{r.Dias}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {hasSolicitudes && (
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                                <Umbrella size={14} className="text-slate-400" /> Historial de Solicitudes
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
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <div className="font-bold text-slate-700 min-w-0 truncate">
                                                            {format(parseSQLDate(s.FechaInicio)!, 'dd MMM')} – {format(parseSQLDate(s.FechaFin)!, 'dd MMM yy')}
                                                        </div>
                                                        {s.SolicitanteNombre && (
                                                            <div className="text-[8px] font-black text-slate-400 bg-slate-100/80 px-1 py-0.5 rounded border border-slate-200 uppercase tracking-tighter shrink-0" title={`Levantado por: ${s.SolicitanteNombre}`}>
                                                                {s.SolicitanteNombre.split(' ')[0]}
                                                            </div>
                                                        )}
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

                    <Button variant="secondary" onClick={onClose} className="w-full py-2.5 text-xs font-bold uppercase tracking-widest border-slate-200 text-slate-500 hover:bg-slate-50">
                        Cerrar Detalle
                    </Button>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setIsConfirmDeleteOpen(false)}
                onConfirm={performDelete}
                title="Eliminar Ajuste"
                confirmText="Sí, eliminar"
                cancelText="No, mantener"
                variant="danger"
            >
                ¿Estás seguro de que deseas eliminar este ajuste extraordinario? Esta acción afectará el saldo de vacaciones del empleado.
            </ConfirmationModal>
        </>
    );
};
