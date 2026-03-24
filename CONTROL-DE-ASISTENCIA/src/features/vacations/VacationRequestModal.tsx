// src/features/vacations/VacationRequestModal.tsx
import React from 'react';
import { Modal, Button } from '../../components/ui/Modal';

interface VacationRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    isManager: boolean;
    employees: any[];
    newRequest: any;
    setNewRequest: (req: any) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleCreateRequest: () => Promise<void>;
}

export const VacationRequestModal: React.FC<VacationRequestModalProps> = ({
    isOpen,
    onClose,
    isManager,
    employees,
    newRequest,
    setNewRequest,
    handleInputChange,
    handleCreateRequest,
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nueva Solicitud">
            <div className="space-y-4 pt-2">
                {isManager && (
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Empleado</label>
                        <select
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                            value={newRequest.empleadoId}
                            onChange={(e) => setNewRequest({ ...newRequest, empleadoId: e.target.value })}
                        >
                            <option value="">Selecciona...</option>
                            {employees.map(emp => (
                                <option key={emp.EmpleadoId} value={emp.EmpleadoId}>{emp.NombreCompleto}</option>
                            ))}
                        </select>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Inicio</label>
                        <input type="date" name="fechaInicio" className="w-full px-3 py-2 border rounded-lg" value={newRequest.fechaInicio} onChange={handleInputChange} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Fin</label>
                        <input type="date" name="fechaFin" className="w-full px-3 py-2 border rounded-lg" value={newRequest.fechaFin} onChange={handleInputChange} />
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" onClick={handleCreateRequest}>Enviar</Button>
                </div>
            </div>
        </Modal>
    );
};
