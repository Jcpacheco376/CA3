// src/features/admin/HorarioModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
import { Loader2, AlertTriangle, Clock, Coffee, Sun, Moon } from 'lucide-react';
import { themes, statusColorPalette } from '../../config/theme.ts';

const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const HorarioPreview = ({ abreviatura, colorUI }: { abreviatura: string, colorUI: string }) => {
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

const ColorPicker = ({ selectedColor, onSelect }: { selectedColor: string, onSelect: (color: string) => void }) => {
    const themeColors = Object.keys(statusColorPalette);
    return (
        <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg border">
            {themeColors.map(colorName => (
                <button
                    key={colorName}
                    type="button"
                    onClick={() => onSelect(colorName)}
                    className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none ring-offset-2 ${selectedColor === colorName ? `ring-2 ring-blue-500` : ''} ${statusColorPalette[colorName].main}`}
                />
            ))}
        </div>
    );
};

const ToggleSwitch = ({ checked, onChange, themeColor }: { checked: boolean, onChange: (checked: boolean) => void, themeColor: string }) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2`}
            style={{ 
                backgroundColor: checked ? themeColor : '#E5E7EB', // Tailwind's gray-200
                '--tw-ring-color': themeColor 
            }}
        >
            <span
                aria-hidden="true"
                className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    );
};

export const HorarioModal = ({ isOpen, onClose, onSave, horario }: { isOpen: boolean, onClose: () => void, onSave: () => void, horario: any | null }) => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();
    const [formData, setFormData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isNew = !horario;
    const theme = themes[user?.Theme as keyof typeof themes] || themes.indigo;

    useEffect(() => {
        const initialDetails = diasSemana.map((_, index) => ({
            DiaSemana: index + 1,
            EsDiaLaboral: false,
            TieneComida: false,
            HoraEntrada: '00:00',
            HoraSalida: '00:00',
            HoraInicioComida: '00:00',
            HoraFinComida: '00:00'
        }));

        if (horario && isOpen) {
            const detailsMap = new Map(horario.Detalles.map((d: any) => [d.DiaSemana, d]));
            const fullDetails = initialDetails.map(d => {
                const detail = detailsMap.get(d.DiaSemana);
                if (detail) {
                    const horaInicioComida = detail.HoraInicioComida ? detail.HoraInicioComida.substring(0, 5) : '00:00';
                    return {
                        ...detail,
                        TieneComida: horaInicioComida !== '00:00',
                        HoraEntrada: detail.HoraEntrada ? detail.HoraEntrada.substring(0, 5) : '00:00',
                        HoraSalida: detail.HoraSalida ? detail.HoraSalida.substring(0, 5) : '00:00',
                        HoraInicioComida: horaInicioComida,
                        HoraFinComida: detail.HoraFinComida ? detail.HoraFinComida.substring(0, 5) : '00:00',
                    };
                }
                return d;
            });
            setFormData({ ...horario, CodRef: horario.CodRef || '', Detalles: fullDetails });
        } else if (isNew && isOpen) {
            setFormData({
                HorarioId: 0,
                CodRef: '',
                Abreviatura: '',
                Nombre: '',
                MinutosTolerancia: 10,
                ColorUI: 'sky',
                Activo: true,
                Detalles: initialDetails
            });
        }
    }, [horario, isOpen]);

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
            const currentDetail = { ...newDetails[index], [field]: value };

            if (field === 'TieneComida' && !value) {
                currentDetail.HoraInicioComida = '00:00';
                currentDetail.HoraFinComida = '00:00';
            }

            newDetails[index] = currentDetail;
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
            const response = await fetch(`${API_BASE_URL}/catalogs/schedules`, {
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
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative" role="alert">
                        <AlertTriangle className="inline-block w-5 h-5 mr-2" />
                        <span className="block sm:inline">{error}</span>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="HorarioId" className="block text-sm font-medium text-slate-700">ID</label>
                        <input type="text" name="HorarioId" id="HorarioId" value={formData.HorarioId} readOnly disabled className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-100" />
                    </div>
                    <div>
                        <label htmlFor="CodRef" className="block text-sm font-medium text-slate-700">Referencia</label>
                        <input type="text" name="CodRef" id="CodRef" value={formData.CodRef} onChange={handleChange} maxLength={50} className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="Abreviatura" className="block text-sm font-medium text-slate-700">Abreviatura</label>
                        <input type="text" name="Abreviatura" id="Abreviatura" value={formData.Abreviatura} onChange={handleChange} maxLength={10} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <label htmlFor="Nombre" className="block text-sm font-medium text-slate-700">Nombre del Horario</label>
                        <input type="text" name="Nombre" id="Nombre" value={formData.Nombre} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                    <div>
                        <label htmlFor="MinutosTolerancia" className="block text-sm font-medium text-slate-700">Minutos de Tolerancia</label>
                        <input type="number" name="MinutosTolerancia" id="MinutosTolerancia" value={formData.MinutosTolerancia} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Color de Interfaz</label>
                        <ColorPicker selectedColor={formData.ColorUI} onSelect={(color) => setFormData({ ...formData, ColorUI: color })} />
                    </div>
                    <div className="flex items-center justify-center">
                        <HorarioPreview abreviatura={formData.Abreviatura} colorUI={formData.ColorUI} />
                    </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium text-slate-900">Definición de Días</h3>
                    {formData.Detalles.map((dia: any, index: number) => (
                        <div key={dia.DiaSemana} className="grid grid-cols-12 gap-x-4 items-center p-3 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="col-span-3 space-y-2">
                                <label className="flex items-center space-x-2 font-semibold text-slate-700">
                                    <input type="checkbox" checked={dia.EsDiaLaboral} onChange={(e) => handleDetailChange(index, 'EsDiaLaboral', e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                    <span>{diasSemana[index]}</span>
                                </label>
                                <label className="flex items-center space-x-2 pl-6 text-sm text-slate-500">
                                    <input type="checkbox" checked={dia.TieneComida} disabled={!dia.EsDiaLaboral} onChange={(e) => handleDetailChange(index, 'TieneComida', e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:cursor-not-allowed" />
                                    <span>Comida</span>
                                </label>
                            </div>
                            <div className="col-span-9 grid grid-cols-4 gap-x-4">
                                <TimeInput icon={<Sun size={16}/>} label="Entrada" value={dia.HoraEntrada} onChange={(e) => handleDetailChange(index, 'HoraEntrada', e.target.value)} disabled={!dia.EsDiaLaboral} />
                                <TimeInput icon={<Coffee size={16}/>} label="Ini. Comida" value={dia.HoraInicioComida} onChange={(e) => handleDetailChange(index, 'HoraInicioComida', e.target.value)} disabled={!dia.EsDiaLaboral || !dia.TieneComida} />
                                <TimeInput icon={<Coffee size={16}/>} label="Fin Comida" value={dia.HoraFinComida} onChange={(e) => handleDetailChange(index, 'HoraFinComida', e.target.value)} disabled={!dia.EsDiaLaboral || !dia.TieneComida} />
                                <TimeInput icon={<Moon size={16}/>} label="Salida" value={dia.HoraSalida} onChange={(e) => handleDetailChange(index, 'HoraSalida', e.target.value)} disabled={!dia.EsDiaLaboral} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t">
                    <ToggleSwitch
                        checked={formData.Activo}
                        onChange={(isChecked) => setFormData({ ...formData, Activo: isChecked })}
                        themeColor={theme[600]}
                    />
                    <label className="text-sm font-medium text-slate-700">Activo</label>
                </div>
            </form>
        </Modal>
    );
};

const TimeInput = ({ label, value, onChange, disabled, icon }: any) => (
    <div className="flex flex-col items-center">
        <label className="flex items-center justify-center gap-1 text-xs font-medium text-slate-500 mb-1">
            {icon} {label}
        </label>
        <input 
            type="time" 
            value={value || '00:00'} 
            onChange={onChange}
            disabled={disabled} 
            className="w-full text-sm rounded-md border-slate-300 p-2 focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-slate-200 disabled:cursor-not-allowed"
        />
    </div>
);