// src/features/admin/HorarioModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
import { Loader2, AlertTriangle, Clock, Coffee, Sun, Moon } from 'lucide-react';
import { themes } from '../../config/theme.ts';

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const ColorPicker = ({ selectedColor, onSelect }: { selectedColor: string, onSelect: (color: string) => void }) => {
    const themeColors = Object.keys(themes).filter(c => !['slate', 'gray', 'zinc', 'neutral', 'stone'].includes(c));
    return (
        <div className="flex flex-wrap gap-2">
            {themeColors.map(colorName => (
                <button
                    key={colorName}
                    type="button"
                    onClick={() => onSelect(colorName)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${selectedColor === colorName ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                    style={{ backgroundColor: themes[colorName as keyof typeof themes][500] }}
                />
            ))}
        </div>
    );
};


export const HorarioModal = ({ isOpen, onClose, onSave, horario }: { isOpen: boolean, onClose: () => void, onSave: () => void, horario: any | null }) => {
    const { getToken } = useAuth();
    const { addNotification } = useNotification();
    const [formData, setFormData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const initialDetails = diasSemana.map((_, index) => ({
            DiaSemana: index + 1,
            EsDiaLaboral: false,
            HoraEntrada: '00:00',
            HoraSalida: '00:00',
            HoraInicioComida: '00:00',
            HoraFinComida: '00:00'
        }));

        if (horario) {
            const detailsMap = new Map(horario.Detalles.map((d: any) => [d.DiaSemana, d]));
            const fullDetails = initialDetails.map(d => {
                const detail = detailsMap.get(d.DiaSemana);
                if (detail) {
                    return {
                        ...detail,
                        HoraEntrada: detail.HoraEntrada ? detail.HoraEntrada.substring(0, 5) : '00:00',
                        HoraSalida: detail.HoraSalida ? detail.HoraSalida.substring(0, 5) : '00:00',
                        HoraInicioComida: detail.HoraInicioComida ? detail.HoraInicioComida.substring(0, 5) : '00:00',
                        HoraFinComida: detail.HoraFinComida ? detail.HoraFinComida.substring(0, 5) : '00:00',
                    };
                }
                return d;
            });
            setFormData({ ...horario, Detalles: fullDetails });
        } else {
            setFormData({
                HorarioId: 0,
                Abreviatura: '',
                Nombre: '',
                MinutosTolerancia: 10,
                ColorUI: 'sky',
                Activo: true,
                Detalles: initialDetails
            });
        }
    }, [horario]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDetailChange = (index: number, field: string, value: any) => {
        setFormData((prev: any) => {
            const newDetails = [...prev.Detalles];
            newDetails[index] = { ...newDetails[index], [field]: value };
            return { ...prev, Detalles: newDetails };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.Abreviatura || !formData.Nombre) {
            setError("La Abreviatura y el Nombre son obligatorios.");
            return;
        }
        setIsSaving(true);
        setError(null);
        const token = getToken();

        try {
            const response = await fetch(`${API_BASE_URL}/api/catalogs/schedules`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error al guardar el horario.');
            }
            
            addNotification('Guardado', 'El horario se ha guardado correctamente.', 'success');
            onSave();
        } catch (err: any) {
            setError(err.message);
            addNotification('Error', err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (!formData) return null;

    const modalFooter = (
        <>
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Horario
            </Button>
        </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={horario ? 'Editar Horario' : 'Nuevo Horario'} 
            footer={modalFooter}
            size="3xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                        <AlertTriangle className="inline-block w-5 h-5 mr-2" />
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="Abreviatura" className="block text-sm font-medium text-slate-700">Abreviatura</label>
                        <input type="text" name="Abreviatura" id="Abreviatura" value={formData.Abreviatura} onChange={handleChange} maxLength={10} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="Nombre" className="block text-sm font-medium text-slate-700">Nombre del Horario</label>
                        <input type="text" name="Nombre" id="Nombre" value={formData.Nombre} onChange={handleChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="MinutosTolerancia" className="block text-sm font-medium text-slate-700">Minutos de Tolerancia</label>
                        <input type="number" name="MinutosTolerancia" id="MinutosTolerancia" value={formData.MinutosTolerancia} onChange={handleChange} required className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm" />
                    </div>
                     <div className="flex items-center space-x-4 mt-6">
                        <label htmlFor="Activo" className="text-sm font-medium text-slate-700">Activo</label>
                        <input type="checkbox" name="Activo" id="Activo" checked={formData.Activo} onChange={handleChange} className="h-5 w-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Color de Interfaz</label>
                    <ColorPicker selectedColor={formData.ColorUI} onSelect={(color) => setFormData({ ...formData, ColorUI: color })} />
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-slate-900 border-b pb-2">Definición de Días</h3>
                    {formData.Detalles.map((dia: any, index: number) => (
                        <div key={dia.DiaSemana} className="grid grid-cols-12 gap-x-4 items-center p-2 rounded-lg bg-slate-50">
                            <div className="col-span-2">
                                <label className="flex items-center space-x-2">
                                    <input type="checkbox" checked={dia.EsDiaLaboral} onChange={(e) => handleDetailChange(index, 'EsDiaLaboral', e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <span className="font-semibold text-slate-700">{diasSemana[index]}</span>
                                </label>
                            </div>
                            <div className="col-span-10 grid grid-cols-4 gap-x-3">
                                <TimeInput icon={<Sun size={16}/>} label="Entrada" value={dia.HoraEntrada} onChange={(e) => handleDetailChange(index, 'HoraEntrada', e.target.value)} disabled={!dia.EsDiaLaboral} />
                                <TimeInput icon={<Coffee size={16}/>} label="Ini. Comida" value={dia.HoraInicioComida} onChange={(e) => handleDetailChange(index, 'HoraInicioComida', e.target.value)} disabled={!dia.EsDiaLaboral} />
                                <TimeInput icon={<Coffee size={16}/>} label="Fin Comida" value={dia.HoraFinComida} onChange={(e) => handleDetailChange(index, 'HoraFinComida', e.target.value)} disabled={!dia.EsDiaLaboral} />
                                <TimeInput icon={<Moon size={16}/>} label="Salida" value={dia.HoraSalida} onChange={(e) => handleDetailChange(index, 'HoraSalida', e.target.value)} disabled={!dia.EsDiaLaboral} />
                            </div>
                        </div>
                    ))}
                </div>
            </form>
        </Modal>
    );
};

const TimeInput = ({ label, value, onChange, disabled, icon }: any) => (
    <div>
        <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
            {icon} {label}
        </label>
        <input 
            type="time" 
            value={value || '00:00'} 
            onChange={onChange} 
            disabled={disabled} 
            className="w-full text-sm rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-200 disabled:cursor-not-allowed"
        />
    </div>
);

