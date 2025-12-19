// src/features/admin/EstatusAsistenciaModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal';
import { AttendanceStatus } from '../../types/index';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';
// import { Info, AlertCircle } from 'lucide-react';

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
                // Al editar, simplemente usamos el objeto que llega.
                // La propiedad 'Esdefault' ya viene en el objeto 'status'.
                setFormData(status);
            } else {
                setFormData({
                    Abreviatura: '', Descripcion: '', ColorUI: 'slate', ValorNomina: 1.00,
                    VisibleSupervisor: true, Activo: true, Tipo: 'Incidencia',
                    EsFalta: false, EsRetardo: false, EsDescanso: false, EsEntradaSalidaIncompleta: false,
                    EsAsistencia: false, DiasRegistroFuturo: 0, PermiteComentario: false,
                    Esdefault: false // Corregido: El nombre de la propiedad debe ser consistente.
                });
            }
        }
    }, [status, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let val: string | number | null = value;
        if (type === 'number') {
            if (value === '') {
                val = null;
            } else if (name === 'ValorNomina') {
                val = parseFloat(value);
            } else {
                val = parseInt(value, 10);
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

                {/* --- SECCIÓN 1: DISEÑO VISUAL --- */}
                <div className="flex gap-6 items-start">
                    <div className="w-1/3">
                        <FichaPreview abreviatura={formData.Abreviatura || ''} colorUI={formData.ColorUI || 'slate'} />
                    </div>
                    <div className="w-2/3 space-y-4">
                        <div>
                            <Tooltip text="El código corto que aparecerá en la ficha (ej: 'A', 'VAC'). Max 10 caracteres.">
                                <label className="block text-sm font-medium text-slate-700">Abreviatura</label>
                            </Tooltip>
                            <input type="text" name="Abreviatura" value={formData.Abreviatura || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500]" required maxLength={10} autoFocus />
                        </div>
                        <div> 
                            <Tooltip text="El nombre completo del estatus (ej: 'Asistencia', 'Vacaciones').">
                                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                            </Tooltip>
                            <input type="text" name="Descripcion" value={formData.Descripcion || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500]" required />
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN 2: COLOR --- */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Color de Interfaz</label>
                    <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        {Object.keys(statusColorPalette).map((colorName) => (
                            <button
                                key={colorName}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, ColorUI: colorName }))}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none ring-offset-2 ${formData.ColorUI === colorName ? `ring-2 ring-[--theme-500] scale-110` : ''} ${statusColorPalette[colorName].main}`}
                                title={colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                            />
                        ))}
                    </div>
                </div>

                {/* --- SECCIÓN 3: DATOS DE NÓMINA --- */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Tooltip text="Agrupa los estatus por su naturaleza (ej: 'Asistencia', 'Justificacion').">
                            <label className="block text-sm font-medium text-slate-700">Tipo / Categoría</label>
                        </Tooltip>
                        <input type="text" name="Tipo" value={formData.Tipo || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500]" required />
                    </div>
                    <div>
                        <Tooltip text="Valor para el cálculo de nómina. 1.0 = día completo, 0.5 = medio día, 0.0 = sin goce.">
                            <label className="block text-sm font-medium text-slate-700">Valor Nómina</label>
                        </Tooltip>
                        <input type="number" name="ValorNomina" value={formData.ValorNomina ?? 0} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500]" step="1.00" />
                    </div>
                </div>

                {/* --- SECCIÓN 4: COMPORTAMIENTO --- */}
                <div className="border-t pt-6">
                    <h3 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-2">
                        Configuración de Comportamiento
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {/* Columna 1: Semántica Básica */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Tooltip text="El sistema lo contará como asistencia"><span className="font-medium text-slate-700">Es Asistencia</span></Tooltip>
                                <Toggle enabled={formData.EsAsistencia || false} onChange={(val) => handleToggleChange('EsAsistencia', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="El sistema lo contará como falta"><span className="font-medium text-slate-700">Es Falta</span></Tooltip>
                                <Toggle enabled={formData.EsFalta || false} onChange={(val) => handleToggleChange('EsFalta', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="El sistema lo contará como retardo"><span className="font-medium text-slate-700">Es Retardo</span></Tooltip>
                                <Toggle enabled={formData.EsRetardo || false} onChange={(val) => handleToggleChange('EsRetardo', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="El sistema lo contará como descanso"><span className="font-medium text-slate-700">Es Descanso</span></Tooltip>
                                <Toggle enabled={formData.EsDescanso || false} onChange={(val) => handleToggleChange('EsDescanso', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Checada incompleta (solo entrada o solo salida)."><span className="font-medium text-slate-700">E/S Incompleta</span></Tooltip>
                                <Toggle enabled={formData.EsEntradaSalidaIncompleta || false} onChange={(val) => handleToggleChange('EsEntradaSalidaIncompleta', val)} />
                            </div>
                           
                        </div>

                        {/* Columna 2: Reglas de Negocio */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Tooltip text="Permite a los supervisores seleccionarlo manualmente."><span className="font-medium text-slate-700">Asignable Manualmente</span></Tooltip>
                                <Toggle enabled={formData.VisibleSupervisor || false} onChange={(val) => handleToggleChange('VisibleSupervisor', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Requiere un comentario obligatorio al asignarse."><span className="font-medium text-slate-700">Permite Comentario</span></Tooltip>
                                <Toggle enabled={formData.PermiteComentario || false} onChange={(val) => handleToggleChange('PermiteComentario', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Usar cuando un empleado rotativo no tiene turno asignado."><span className="text-sm font-medium text-slate-700">Sin Horario</span></Tooltip>
                                <Toggle enabled={formData.SinHorario || false} onChange={(val) => handleToggleChange('SinHorario', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Ocultar este estatus sin borrarlo."><span className="font-medium text-slate-700">Estatus Activo</span></Tooltip>
                                <Toggle enabled={formData.Activo || false} onChange={(val) => handleToggleChange('Activo', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Días máximos a futuro permitidos (0 = solo hoy/pasado).">
                                    <span className="text-sm font-medium text-slate-700">Días Registro Futuro</span>
                                </Tooltip>
                                <input
                                    type="number"
                                    name="DiasRegistroFuturo"
                                    value={formData.DiasRegistroFuturo ?? 0}
                                    onChange={handleChange}
                                    className="w-16 p-1 border border-slate-300 rounded-md text-center text-sm focus:outline-none focus:border-[--theme-500]"
                                    min="0"
                                />
                            </div>
                        </div>
                    </div>

                    <div className={`mt-6 flex items-start gap-4 p-4 rounded-lg border transition-colors ${formData.Esdefault ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                   
                        <div className="flex flex-col">
                            <div className="flex items-center gap-4 justify-between w-full">
                                <span className={`font-bold text-sm ${formData.Esdefault ? 'text-indigo-900' : 'text-slate-700'}`}>
                                    Valor Predeterminado del Sistema                                     
                                </span>    
                                <Toggle enabled={formData.Esdefault || false} onChange={(val) => handleToggleChange('Esdefault', val)} />
                            </div>
                            <span className={`text-xs leading-relaxed mt-1 ${formData.Esdefault ? 'text-indigo-700' : 'text-slate-500'}`}>
                                Si activas esto, el sistema usará este estatus automáticamente cuando detecte el evento marcado arriba (ej. Falta). Solo puede haber uno por tipo.
                            </span>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};