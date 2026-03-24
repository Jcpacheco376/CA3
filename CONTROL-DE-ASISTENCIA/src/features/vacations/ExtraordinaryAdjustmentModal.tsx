// src/features/vacations/ExtraordinaryAdjustmentModal.tsx
import React from 'react';
import { format } from 'date-fns';
import { Modal, Button } from '../../components/ui/Modal';
import { ModernDatePicker } from '../../components/ui/ModernDatePicker';
import { ExtraordinaryModalState } from '../../types/vacations';

interface ExtraordinaryAdjustmentModalProps {
    extraordinaryModal: ExtraordinaryModalState | null;
    onClose: () => void;
    extraValue: number;
    setExtraValue: (v: number) => void;
    extraFecha: string;
    setExtraFecha: (d: string) => void;
    onSave: () => Promise<void>;
}

export const ExtraordinaryAdjustmentModal: React.FC<ExtraordinaryAdjustmentModalProps> = ({
    extraordinaryModal,
    onClose,
    extraValue,
    setExtraValue,
    extraFecha,
    setExtraFecha,
    onSave,
}) => {
    if (!extraordinaryModal) return null;

    return (
        <Modal isOpen={!!extraordinaryModal} onClose={onClose} title="Ajuste Extraordinario">
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fecha</label>
                    <ModernDatePicker
                        value={extraFecha}
                        onChange={(d) => setExtraFecha(d ? format(d, 'yyyy-MM-dd') : '')}
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Días</label>
                    <input
                        type="number"
                        step="0.5"
                        className="w-full p-2 border rounded-lg"
                        value={extraValue}
                        onChange={(e) => setExtraValue(parseFloat(e.target.value) || 0)}
                    />
                </div>
                <Button
                    variant="primary"
                    onClick={onSave}
                    className="w-full"
                >
                    Guardar Ajuste
                </Button>
            </div>
        </Modal>
    );
};
