// src/features/reports/components/PayrollGuardModal.tsx
import React from 'react';
import { Modal, Button } from '../../../components/ui/Modal';
import { AlertTriangle, XCircle, Lock, CheckCircle2, ArrowRight } from 'lucide-react';

interface ValidationResult {
    TotalPendientes: number;
    CriticasPendientes: number;
    EstadoSemaforo: 'ROJO' | 'AMARILLO' | 'VERDE';
    MensajeValidacion: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    validation: ValidationResult | null;
    canOverride: boolean; // Permiso especial para saltarse el bloqueo
}

export const PayrollGuardModal = ({ isOpen, onClose, onConfirm, validation, canOverride }: Props) => {
    if (!validation) return null;

    const isBlocked = validation.EstadoSemaforo === 'ROJO';
    const isWarning = validation.EstadoSemaforo === 'AMARILLO';
    
    const title = isBlocked ? "Proceso Detenido" : (isWarning ? "Advertencia" : "Validación Exitosa");

    const footer = (
        <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            
            {/* Caso Normal: Verde o Amarillo */}
            {!isBlocked && (
                <Button onClick={onConfirm}>
                    Continuar <ArrowRight size={16} className="ml-2"/>
                </Button>
            )}

            {/* Caso Emergencia: Rojo pero con Permiso */}
            {isBlocked && canOverride && (
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
                    <Lock size={16} className="mr-2"/> Forzar (Admin)
                </Button>
            )}
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer} size="md">
            <div className="flex flex-col items-center text-center space-y-4 py-2">
                
                {/* Icono de Estado */}
                {isBlocked && <div className="p-4 bg-red-100 rounded-full text-red-600"><XCircle size={48} /></div>}
                {isWarning && <div className="p-4 bg-amber-100 rounded-full text-amber-600"><AlertTriangle size={48} /></div>}
                {validation.EstadoSemaforo === 'VERDE' && <div className="p-4 bg-green-100 rounded-full text-green-600"><CheckCircle2 size={48} /></div>}

                <h3 className={`text-xl font-bold ${isBlocked ? 'text-red-800' : 'text-slate-800'}`}>
                    {validation.MensajeValidacion}
                </h3>

                <div className="bg-slate-50 p-4 rounded-lg w-full text-left border border-slate-200 text-sm">
                    <div className="flex justify-between mb-1">
                        <span className="text-slate-600">Incidencias Críticas:</span>
                        <span className={`font-bold ${validation.CriticasPendientes > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {validation.CriticasPendientes}
                        </span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                        <span className="text-slate-600">Total Pendientes:</span>
                        <span className="font-bold text-slate-800">{validation.TotalPendientes}</span>
                    </div>
                </div>

                {isBlocked && !canOverride && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded w-full">
                        No tienes permisos para forzar el proceso. Debes resolver las incidencias críticas en el tablero.
                    </p>
                )}
            </div>
        </Modal>
    );
};