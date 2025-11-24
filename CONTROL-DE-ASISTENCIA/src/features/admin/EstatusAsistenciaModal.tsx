// src/features/admin/EstatusAsistenciaModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { AttendanceStatus } from '../../types/index.ts';
import { Tooltip } from '../../components/ui/Tooltip.tsx';
import { statusColorPalette } from '../../config/theme.ts';

const FichaPreview = ({ abreviatura, colorUI }: { abreviatura: string, colorUI: string }) => {
    const { bgText, border } = statusColorPalette[colorUI] || statusColorPalette.slate;

    return (
        <div className="space-y-2 text-center">
            <label className="block text-sm font-medium text-slate-700">Vista Previa</label>
            <div className={`relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center transition-all duration-200 border-b-4 ${border}`}>
                <div className={`w-full h-full rounded-md ${bgText} bg-opacity-90 flex items-center justify-center shadow-inner-sm`}>
                    {abreviatura || '?'}
                </div>
            </div>
        </div>
    );
};

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (enabled: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${enabled ? 'bg-[--theme-500]' : 'bg-gray-200'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

export const EstatusAsistenciaModal = ({ isOpen, onClose, onSave, status }: { isOpen: boolean; onClose: () => void; onSave: (status: AttendanceStatus) => void; status: AttendanceStatus | null; }) => {
    const [formData, setFormData] = useState<Partial<AttendanceStatus>>({});
    const isNew = !status?.EstatusId;

    useEffect(() => {
        if (isOpen) {
            if (status) {
                setFormData(status);
            } else {
                setFormData({ 
                    Abreviatura: '', Descripcion: '', ColorUI: 'slate', ValorNomina: 1.00, 
                    VisibleSupervisor: true, Activo: true, Tipo: 'Incidencia',
                    EsFalta: false, EsRetardo: false, EsEntradaSalidaIncompleta: false,
                    EsAsistencia: false, DiasRegistroFuturo: 0, PermiteComentario: false
                });
            }
        }
    }, [status, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let val: string | number | null = value;
        if (type === 'number') {
            if (value === '') {
                val = null; // Permitir campo vacío
            } else if (name === 'ValorNomina') {
                val = parseFloat(value); // Permitir decimales para ValorNomina
            } else {
                val = parseInt(value, 10); // Mantener enteros para DiasRegistroFuturo
            }
        }

        setFormData(prev => ({ ...prev, [name]: val }));
    };
    
    const handleToggleChange = (name: keyof AttendanceStatus, value: boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as AttendanceStatus);
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="status-modal-form">Guardar</Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Crear Estatus de Asistencia' : 'Editar Estatus de Asistencia'} footer={footer} size="xl">
            <form id="status-modal-form" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="space-y-4">
                    <FichaPreview abreviatura={formData.Abreviatura || ''} colorUI={formData.ColorUI || 'slate'} />
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Color de Interfaz</label>
                         <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg border">
                            {Object.keys(statusColorPalette).map((colorName) => (
                                <button
                                    key={colorName}
                                    type="button"
                                    onClick={() => setFormData(prev => ({...prev, ColorUI: colorName}))}
                                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none ring-offset-2 ${formData.ColorUI === colorName ? `ring-2 ring-[--theme-500]` : ''} ${statusColorPalette[colorName].main}`}
                                    title={colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Tooltip text="El código corto que aparecerá en la ficha (ej: 'A', 'VAC')."><label className="block text-sm font-medium text-slate-700">Abreviatura</label></Tooltip>
                            <input type="text" name="Abreviatura" value={formData.Abreviatura || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" required maxLength={10} />
                        </div>
                        <div>
                            <Tooltip text="Define el valor para el cálculo de la nómina. Ej: 1.0 para día completo, 0.5 para medio día, 0.0 para sin goce."><label className="block text-sm font-medium text-slate-700">Valor Nómina</label></Tooltip>
                            <input type="number" name="ValorNomina" value={formData.ValorNomina ?? 0} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" step="0.01" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Tooltip text="El nombre completo del estatus (ej: 'Asistencia', 'Vacaciones')."><label className="block text-sm font-medium text-slate-700">Descripción</label></Tooltip>
                            <input type="text" name="Descripcion" value={formData.Descripcion || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" required />
                        </div>
                         <div>
                            <Tooltip text="Agrupa los estatus por su naturaleza (ej: 'Asistencia', 'Justificacion')."><label className="block text-sm font-medium text-slate-700">Tipo</label></Tooltip>                          
                            <input type="text" name="Tipo" value={formData.Tipo || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" required />
                        </div>
                    </div>
                </div>
                
                <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Configuración de Comportamiento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="flex items-center justify-between">
                            <Tooltip text="Activar si este es el estatus principal para una asistencia normal."><span className="font-medium text-slate-700">Es Asistencia</span></Tooltip>
                            <Toggle enabled={formData.EsAsistencia || false} onChange={(val) => handleToggleChange('EsAsistencia', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Tooltip text="Activar si este estatus representa una falta."><span className="font-medium text-slate-700">Es Falta</span></Tooltip>
                            <Toggle enabled={formData.EsFalta || false} onChange={(val) => handleToggleChange('EsFalta', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Tooltip text="Activar si este estatus representa un retardo."><span className="font-medium text-slate-700">Es Retardo</span></Tooltip>
                            <Toggle enabled={formData.EsRetardo || false} onChange={(val) => handleToggleChange('EsRetardo', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Tooltip text="Activar para el estatus de checada impar (ej. solo entrada o solo salida)."><span className="font-medium text-slate-700">E/S Incompleta</span></Tooltip>
                            <Toggle enabled={formData.EsEntradaSalidaIncompleta || false} onChange={(val) => handleToggleChange('EsEntradaSalidaIncompleta', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Tooltip text="Activar para que se pueda agregar un comentario a este estatus."><span className="font-medium text-slate-700">Permite Comentario</span></Tooltip>
                            <Toggle enabled={formData.PermiteComentario || false} onChange={(val) => handleToggleChange('PermiteComentario', val)} />
                        </div>
                        <div className="flex items-center justify-between">
                             <Tooltip text="Desmarca para ocultar este estatus en todo el sistema sin borrarlo."><span className="font-medium text-slate-700">Estatus Activo</span></Tooltip>
                            <Toggle enabled={formData.Activo || false} onChange={(val) => handleToggleChange('Activo', val)} />
                        </div>
                         <div className="flex items-center justify-between">
                            <Tooltip text="Marca esta opción si quieres que el estatus pueda ser asignable de forma manual a un empleado."><span className="font-medium text-slate-700">Asignable manualmente</span></Tooltip>
                            <Toggle enabled={formData.VisibleSupervisor || false} onChange={(val) => handleToggleChange('VisibleSupervisor', val)} />
                        </div>
                        <div>
                           <Tooltip text="Días máximos a futuro para registrar este estatus (0 = no se permite). Ej: 365 para vacaciones.">
                               <label className="block text-sm font-medium text-slate-700">Días de Registro Futuro</label>
                           </Tooltip>
                          
                           <input 
                                type="number" 
                                name="DiasRegistroFuturo" 
                                value={formData.DiasRegistroFuturo ?? 0} 
                                onChange={handleChange}
                                className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]"
                                min="0"
                            />
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};