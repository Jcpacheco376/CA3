// src/features/reports/components/PayrollGuardModal.tsx
import React from 'react';
import { Modal, Button } from '../../../components/ui/Modal';
import { AlertTriangle, XCircle, Lock, CheckCircle2, ArrowRight, ClipboardList, CalendarOff, Layers } from 'lucide-react'; // <-- Icono Layers

interface ValidationResult {
    TotalFichas: number; // <--- Nuevo
    TotalPendientes: number;
    CriticasPendientes: number;
    FichasSinValidar: number;
    FichasSinHorario?: number;
    EstadoSemaforo: 'ROJO' | 'AMARILLO' | 'VERDE';
    MensajeValidacion: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    validation: ValidationResult | null;
    canOverride: boolean;
    reportType?: 'kardex' | 'attendance_list'; 
}

export const PayrollGuardModal = ({ isOpen, onClose, onConfirm, validation, canOverride, reportType = 'kardex' }: Props) => {
    if (!validation) return null;

    const isAttendanceList = reportType === 'attendance_list';
    const sinHorario = validation.FichasSinHorario || 0;
    const totalFichas = validation.TotalFichas || 0; // <--- Dato

    let totalRelevante = validation.CriticasPendientes + sinHorario;
    if (!isAttendanceList) totalRelevante += validation.FichasSinValidar;

    const isBlocked = validation.EstadoSemaforo === 'ROJO';
    const isWarning = validation.EstadoSemaforo === 'AMARILLO' && totalRelevante > 0;
    
    let title = "Validación Exitosa";
    if (isBlocked) title = "Proceso Detenido";
    else if (isWarning) title = "Revisión Sugerida";
    else if (isAttendanceList) title = "Confirmar Generación";

    const footer = (
        <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            {!isBlocked && <Button onClick={onConfirm}>Generar Reporte <ArrowRight size={16} className="ml-2"/></Button>}
            {isBlocked && canOverride && <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}><Lock size={16} className="mr-2"/> Forzar (Admin)</Button>}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} size="md">
            <div className="flex flex-col items-center text-center space-y-4 py-2">
                
                {isBlocked && <div className="p-4 bg-red-100 rounded-full text-red-600 animate-bounce-short"><XCircle size={48} /></div>}
                {!isBlocked && isWarning && <div className="p-4 bg-amber-100 rounded-full text-amber-600 animate-pulse"><AlertTriangle size={48} /></div>}
                {!isBlocked && !isWarning && <div className="p-4 bg-green-100 rounded-full text-green-600"><CheckCircle2 size={48} /></div>}

                <h3 className={`text-lg font-bold ${isBlocked ? 'text-red-800' : (isWarning ? 'text-amber-700' : 'text-slate-800')}`}>
                    {!isBlocked && !isWarning && isAttendanceList ? "El reporte está listo para generarse." : validation.MensajeValidacion}
                </h3>

                <div className="bg-slate-50 p-4 rounded-lg w-full text-left border border-slate-200 text-sm space-y-2">
                    
                    {/* --- NUEVO: Total Procesado --- */}
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 mb-2">
                        <span className="text-slate-700 flex items-center gap-2 font-semibold">
                            <Layers size={14} className="text-blue-500"/> Total Procesado:
                        </span>
                        <span className="font-bold text-blue-600 text-base">{totalFichas}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-slate-600 flex items-center gap-2"><AlertTriangle size={14} className="text-red-500"/> Incidencias Críticas:</span>
                        <span className={`font-bold ${validation.CriticasPendientes > 0 ? 'text-red-600' : 'text-slate-400'}`}>{validation.CriticasPendientes}</span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-slate-600 flex items-center gap-2"><CalendarOff size={14} className="text-slate-500"/> Sin Horario Asignado:</span>
                        <span className={`font-bold ${sinHorario > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{sinHorario}</span>
                    </div>

                    {!isAttendanceList && (
                        <div className="flex justify-between items-center">
                            <span className="text-slate-600 flex items-center gap-2"><ClipboardList size={14} className="text-amber-500"/> Fichas sin Validar:</span>
                            <span className={`font-bold ${validation.FichasSinValidar > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{validation.FichasSinValidar}</span>
                        </div>
                    )}

                    <div className="flex justify-between border-t pt-2 mt-1">
                        <span className="text-slate-800 font-semibold">Total Relevante:</span>
                        <span className="font-bold text-slate-800">{totalRelevante}</span>
                    </div>
                </div>

                {isBlocked && !canOverride && <p className="text-sm text-red-600 bg-red-50 p-2 rounded w-full">No tienes permisos para forzar el proceso.</p>}

            </div>
        </Modal>
    );
};