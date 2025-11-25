// src/features/attendance/HorariosModal.tsx
import React, { useState, useEffect, useMemo } from 'react'; // Added useMemo
import { Modal, Button } from '../../components/ui/Modal.tsx';
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
import { Loader2, AlertTriangle, Clock, Coffee, Sun, Moon, Sunset, RotateCw, XCircle } from 'lucide-react';
import { themes, statusColorPalette } from '../../config/theme.ts';
import { Tooltip } from '../../components/ui/Tooltip.tsx';


const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const getTurnoIcon = (turno: 'M' | 'V' | 'N' | string | null | undefined, size = 16) => {
    switch (turno) {
        case 'M':
            return <Sun size={size} className="text-amber-500 shrink-0" title="Matutino" />;
        case 'V':
            return <Sunset size={size} className="text-orange-500 shrink-0" title="Vespertino" />;
        case 'N':
            return <Moon size={size} className="text-indigo-500 shrink-0" title="Nocturno" />;
        default:
            return null;
    }
};

const determineTurnoFromTime = (horaEntrada: string): 'M' | 'V' | 'N' | null => {
    if (!horaEntrada || horaEntrada === '00:00') return null;
    try {
        const hour = parseInt(horaEntrada.split(':')[0], 10);
        if (hour >= 5 && hour < 12) return 'M';
        if (hour >= 12 && hour < 20) return 'V';
        if ((hour >= 20 && hour <= 23) || (hour >= 0 && hour < 5)) return 'N'; // Include early morning as Nocturno
    } catch { return null; }
    return null;
};

const calculateDailyHours = (dia: any): number => {
    if (!dia || !dia.EsDiaLaboral || !dia.HoraEntrada || !dia.HoraSalida || dia.HoraEntrada === '00:00' || dia.HoraSalida === '00:00') {
        return 0;
    }

    try {
        const [entradaH, entradaM] = dia.HoraEntrada.split(':').map(Number);
        const [salidaH, salidaM] = dia.HoraSalida.split(':').map(Number);

        let entradaMinutes = entradaH * 60 + entradaM;
        let salidaMinutes = salidaH * 60 + salidaM;

        if (salidaMinutes < entradaMinutes) {
            salidaMinutes += 24 * 60;
        }

        let totalMinutes = salidaMinutes - entradaMinutes;

        if (dia.TieneComida && dia.HoraInicioComida && dia.HoraFinComida && dia.HoraInicioComida !== '00:00' && dia.HoraFinComida !== '00:00') {
            const [breakStartH, breakStartM] = dia.HoraInicioComida.split(':').map(Number);
            const [breakEndH, breakEndM] = dia.HoraFinComida.split(':').map(Number);

            let breakStartMinutes = breakStartH * 60 + breakStartM;
            let breakEndMinutes = breakEndH * 60 + breakEndM;

            if (breakEndMinutes < breakStartMinutes) {
                breakEndMinutes += 24 * 60;
            }
             if(breakStartMinutes >= entradaMinutes && breakEndMinutes <= salidaMinutes) {
                const breakDuration = breakEndMinutes - breakStartMinutes;
                if (breakDuration > 0) {
                    totalMinutes -= breakDuration;
                }
             }
        }

        return Math.max(0, totalMinutes / 60); // Return hours, ensure non-negative

    } catch (error) {
        console.error("Error calculating hours for day:", dia, error);
        return 0; 
    }
};

const HorarioPreview = ({ selectedDayData, colorUI, esRotativo, scheduleName }: { selectedDayData: any, colorUI: string, esRotativo: boolean, scheduleName: string }) => {

    const { bgText, border } = statusColorPalette[colorUI] || statusColorPalette.slate;

    const getJornadaDelDia = (horaEntrada: string) => {
        if (!horaEntrada || horaEntrada === '00:00') return null;
        const hour = parseInt(horaEntrada.split(':')[0], 10);
        if (hour >= 5 && hour < 12) {
            return <Sun size={14} className="text-amber-500 shrink-0" title="Matutino" />;
        }
        if (hour >= 12 && hour < 20) {
            return <Sunset size={14} className="text-orange-500 shrink-0" title="Vespertino" />;
        }
        return <Moon size={14} className="text-indigo-500 shrink-0" title="Nocturno" />;
    };

    let content;
    if (!selectedDayData || !selectedDayData.EsDiaLaboral) {
        content = (
            <div className="flex flex-col items-center justify-center text-center h-full p-2">
                <span className="text-sm font-semibold text-slate-600 leading-tight">Descanso</span>
            </div>
        );
    } else {
        content = (
            <div className="flex items-center justify-center gap-2 h-full px-2 py-1 w-full">
                <div className="flex flex-col items-center justify-center text-center">
                    <span className="text-[16px] font-semibold leading-tight block w-full text-center">
                        {selectedDayData.HoraEntrada}
                    </span>
                    <span className="text-[10px] leading-tight text-slate-500 block w-full text-center">-</span>
                    <span className="text-[16px] font-semibold leading-tight block w-full text-center">
                        {selectedDayData.HoraSalida}
                    </span>
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 pl-2">
                    {getJornadaDelDia(selectedDayData.HoraEntrada)}
                    {selectedDayData.TieneComida && <Coffee size={14} className="text-amber-700 shrink-0" title="Incluye comida" />}
                </div>
            </div>
        );
    }

    const tooltipContent = (
         <div className="p-1 text-left">
            <h4 className="font-bold">{scheduleName || 'Horario'} {esRotativo && <span className="font-normal text-slate-300">(Rotativo)</span>}</h4>
        </div>
    );

    return (
        <div className="space-y-2 text-center">
            <label className="block text-sm font-medium text-slate-700">Vista Previa</label>
             <Tooltip text={tooltipContent}>
                <div className={`relative w-24 h-16 mx-auto rounded-md font-bold flex items-center justify-center transition-all duration-200 border-b-4 ${border}`}>
                    {esRotativo && (
                        <div className="absolute top-1 right-1 text-slate-500 opacity-70">
                             <RotateCw size={10} title="Horario Rotativo"/>
                        </div>
                    )}
                    <div className={`w-full h-full rounded-md ${bgText} bg-opacity-90 flex items-center justify-center shadow-inner-sm overflow-hidden`}>
                        {content}
                    </div>
                </div>
            </Tooltip>
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
    const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);

    const isNew = !horario;
    const theme = themes[user?.Theme as keyof typeof themes] || themes.indigo;

    const totalWeeklyHours = useMemo(() => {
        if (!formData || !formData.Detalles || formData.esRotativo) return 0; // Return 0 if rotativo
        return formData.Detalles.reduce((total: number, dia: any) => total + calculateDailyHours(dia), 0);
    }, [formData]);

    const previewTurno = useMemo(() => {

        if (!formData || !formData.Detalles || formData.esRotativo) {
            return null; 
        }
        const activeDays = formData.Detalles.filter((dia: any) => dia.EsDiaLaboral);
        if (activeDays.length === 0) {
            return null; 
        }
        const firstTurno = determineTurnoFromTime(activeDays[0].HoraEntrada);
        if (!firstTurno) {
            return null; 
        }
        const allSameTurno = activeDays.every((dia: any) => determineTurnoFromTime(dia.HoraEntrada) === firstTurno);

        return allSameTurno ? firstTurno : null; 

    }, [formData]);


    useEffect(() => {

        const initialDetails = Array.from({ length: 7 }).map((_, index) => ({ // Always initialize 7 slots
            DiaSemana: index + 1, // Keep DiaSemana for potential DB mapping, even if label changes
            EsDiaLaboral: false, TieneComida: false,
            HoraEntrada: '00:00', HoraSalida: '00:00', HoraInicioComida: '00:00', HoraFinComida: '00:00'
        }));

        if (isOpen) {
             setSelectedDayIndex(0);

             if (horario) {
                const detailsMap = new Map(horario.Detalles?.map((d: any) => [d.DiaSemana, d]) || []);
                const fullDetails = initialDetails.map(initialD => {
                    const detail = detailsMap.get(initialD.DiaSemana);
                    if (detail) {
                        const horaInicioComida = detail.HoraInicioComida ? detail.HoraInicioComida.substring(0, 5) : '00:00';
                        return {
                            ...initialD, // Start with initial structure
                            ...detail, // Overwrite with DB data
                            TieneComida: horaInicioComida !== '00:00',
                            HoraEntrada: detail.HoraEntrada ? detail.HoraEntrada.substring(0, 5) : '00:00',
                            HoraSalida: detail.HoraSalida ? detail.HoraSalida.substring(0, 5) : '00:00',
                            HoraInicioComida: horaInicioComida,
                            HoraFinComida: detail.HoraFinComida ? detail.HoraFinComida.substring(0, 5) : '00:00',
                        };
                    } return initialD; // Use initial if no corresponding detail found
                });

                 let isRotativoValue = false;
                 let rawValue = undefined; 

                if (horario.hasOwnProperty('esRotativo')) {
                    rawValue = horario.esRotativo;
                    isRotativoValue = horario.esRotativo === true || horario.esRotativo === 1;
                 }
                 else if (horario.hasOwnProperty('EsRotativo')) {
                     rawValue = horario.EsRotativo;
                    isRotativoValue = horario.EsRotativo === true || horario.EsRotativo === 1;
                 } else {
                 }

                setFormData({
                    ...horario,
                    CodRef: horario.CodRef || '',
                    Detalles: fullDetails, // Use the merged/filled details
                    esRotativo: isRotativoValue // Use the explicitly checked boolean value
                 });
            } else {
                setFormData({
                    HorarioId: 0, CodRef: '', Abreviatura: '', Nombre: '', MinutosTolerancia: 10, ColorUI: 'sky',
                    Activo: true, esRotativo: false, Detalles: initialDetails // Start with 7 empty slots
                });
            }
        } else {
        }
    }, [horario, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {

        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData((prev: any) => {
             const newState = { ...prev, [name]: type === 'checkbox' ? checked : value };
             if (name === 'esRotativo') {
                 setSelectedDayIndex(0); // Optionally reset focus to the first item
             }
             return newState;
        });
    };

    const handleRotativoChange = (isChecked: boolean) => handleChange({ target: { name: 'esRotativo', type: 'checkbox', checked: isChecked } } as any);

    const handleDetailChange = (index: number, field: string, value: any) => {

        setFormData((prev: any) => {
            const newDetails = [...prev.Detalles];
            let currentDetail = { ...newDetails[index], [field]: value };
            if (field === 'TieneComida' && !value) currentDetail = { ...currentDetail, HoraInicioComida: '00:00', HoraFinComida: '00:00' };
            if (field === 'EsDiaLaboral' && !value) currentDetail = { ...currentDetail, TieneComida: false, HoraInicioComida: '00:00', HoraFinComida: '00:00', HoraEntrada: '00:00', HoraSalida: '00:00' };
            newDetails[index] = currentDetail;
            setSelectedDayIndex(index); // Actualizar día seleccionado al editar
            return { ...prev, Detalles: newDetails };
        });
    };


    const handleSubmit = async (e: React.FormEvent) => {

        e.preventDefault();
        if (!formData.Nombre) { setError("El Nombre es obligatorio."); return; }

        setIsSaving(true); setError(null); const token = getToken();
        const dataToSend = { ...formData };

        const detallesJson = JSON.stringify(dataToSend.Detalles);
        const finalBody: any = {
             HorarioId: dataToSend.HorarioId, CodRef: dataToSend.CodRef, Abreviatura: dataToSend.Abreviatura, Nombre: dataToSend.Nombre, MinutosTolerancia: dataToSend.MinutosTolerancia,
             ColorUI: dataToSend.ColorUI, Activo: dataToSend.Activo, EsRotativo: dataToSend.esRotativo, DetallesJSON: detallesJson
        };

        try {
            const response = await fetch(`${API_BASE_URL}/catalogs/schedules`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(finalBody)
            });
            if (!response.ok) { throw new Error((await response.json()).message || 'Error al guardar.'); }
            addNotification('Guardado', 'El horario se ha guardado correctamente.', 'success'); onSave();
        } catch (err: any) { setError(err.message); addNotification('Error', err.message, 'error'); }
        finally { setIsSaving(false); }
    };

    if (!formData) return null;
    const selectedDayDetailsForPreview = formData.Detalles ? formData.Detalles[selectedDayIndex] : null;


    const modalFooter = (

        <>
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar Horario
            </Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={horario ? 'Editar Horario' : 'Nuevo Horario'} footer={modalFooter} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && ( <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg relative" role="alert"><AlertTriangle className="inline-block w-5 h-5 mr-2" /> <span className="block sm:inline">{error}</span></div> )}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div><label htmlFor="HorarioId" className="block text-sm font-medium text-slate-700">ID</label>
                        
                        <input type="text" name="HorarioId" id="HorarioId" value={formData.HorarioId} readOnly disabled className="mt-1 block w-full p-2 border border-slate-300 rounded-md bg-slate-100 focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" />
                     </div>
                     <div><label htmlFor="CodRef" className="block text-sm font-medium text-slate-700">Referencia</label>
                        
                        <input type="text" name="CodRef" id="CodRef" value={formData.CodRef} onChange={handleChange} maxLength={50} className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" />
                     </div>
                     <div><label htmlFor="MinutosTolerancia" className="block text-sm font-medium text-slate-700">Minutos de Tolerancia</label>
                        
                        <input type="number" name="MinutosTolerancia" id="MinutosTolerancia" value={formData.MinutosTolerancia} onChange={handleChange} required className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" />
                     </div>
                 </div>
                 {/* Nombre del Horario with Preview Icon */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="md:col-span-2">
                        <label htmlFor="Nombre" className="block text-sm font-medium text-slate-700">Nombre del Horario</label>
                        <div className="flex items-center gap-2 mt-1">
                             {/* Preview Turno Icon */}
                             {getTurnoIcon(previewTurno)}
                             
                             <input
                                type="text"
                                name="Nombre"
                                id="Nombre"
                                value={formData.Nombre}
                                onChange={handleChange} required
                                className="block w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]"
                             />
                        </div>
                    </div>
                     <div><label htmlFor="Abreviatura" className="block text-sm font-medium text-slate-700">Abreviatura (Opcional)</label>
                        
                        <input type="text" name="Abreviatura" id="Abreviatura" value={formData.Abreviatura} onChange={handleChange} maxLength={10} className="mt-1 block w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500]" />
                     </div>
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                    
                     <ToggleSwitch checked={!!formData.esRotativo} onChange={handleRotativoChange} themeColor={theme[600]} />
                     <label className="text-sm font-medium text-slate-700">Horario Rotativo </label>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                     <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-2">Color de Interfaz</label><ColorPicker selectedColor={formData.ColorUI} onSelect={(color) => setFormData({ ...formData, ColorUI: color })} /></div>
                     
                     <div className="flex items-center justify-center pt-5 md:pt-0"><HorarioPreview selectedDayData={selectedDayDetailsForPreview} colorUI={formData.ColorUI} esRotativo={!!formData.esRotativo} scheduleName={formData.Nombre} /></div>
                </div>
                <div className="space-y-4 pt-4 border-t">                   
                     <div className="flex justify-between items-center mb-2">               
                         <h3 className="text-lg font-medium text-slate-900">Definición de {formData.esRotativo ? 'Turnos Rotativos' : 'Días de la Semana'}</h3>
                         {!formData.esRotativo && (
                            <div className="text-right">
                                <span className="text-sm font-medium text-slate-500">Total Semanal: </span>
                                <span className="text-sm font-bold text-slate-800">{totalWeeklyHours.toFixed(2)} hrs</span>
                            </div>
                         )}
                     </div>
                
                    {formData.Detalles.map((dia: any, index: number) => {
                         const isSelected = index === selectedDayIndex;
                         const dailyHours = calculateDailyHours(dia);
                         const hoursWarning = dia.EsDiaLaboral && (dailyHours >= 10 || (dailyHours > 0 && dailyHours <= 4));
                         const warningTooltip = dailyHours > 10 ? "Jornada de 10 horas o má." : "Jornada de 4 horas o menos.";
                         const dayLabel = formData.esRotativo ? `Turno ${index + 1}` : diasSemana[index];

                         return (
                            <div key={index} onClick={() => setSelectedDayIndex(index)} // Use index as key when labels can repeat
                                 className={`grid grid-cols-12 gap-x-4 items-center p-3 rounded-lg border cursor-pointer transition-all duration-150 ${ isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100' }`}>
                                <div className="col-span-2 space-y-2"> 
                                    <label className="flex items-center space-x-2 font-semibold text-slate-700 cursor-pointer">
                                        <input type="checkbox" checked={dia.EsDiaLaboral} onChange={(e) => handleDetailChange(index, 'EsDiaLaboral', e.target.checked)}
                                               className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                                        <span className="truncate">{dayLabel}</span>
                                    </label>
                                    <label className="flex items-center space-x-2 pl-6 text-sm text-slate-500 cursor-pointer">
                                        <input type="checkbox" checked={dia.TieneComida} disabled={!dia.EsDiaLaboral}
                                               onChange={(e) => handleDetailChange(index, 'TieneComida', e.target.checked)} className="h-4 w-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 disabled:cursor-not-allowed" />
                                        <span>Comida</span>
                                    </label>
                                </div>
                                <div className="col-span-8 grid grid-cols-4 gap-x-3" onClick={(e) => e.stopPropagation()}>
                                    <TimeInput icon={<Sun size={16}/>} label="Entrada" value={dia.HoraEntrada} onChange={(e) => handleDetailChange(index, 'HoraEntrada', e.target.value)} disabled={!dia.EsDiaLaboral} onFocus={() => setSelectedDayIndex(index)}/>
                                    <TimeInput icon={<Coffee size={16}/>} label="Ini. Comida" value={dia.HoraInicioComida} onChange={(e) => handleDetailChange(index, 'HoraInicioComida', e.target.value)} disabled={!dia.EsDiaLaboral || !dia.TieneComida} onFocus={() => setSelectedDayIndex(index)} />
                                    <TimeInput icon={<Coffee size={16}/>} label="Fin Comida" value={dia.HoraFinComida} onChange={(e) => handleDetailChange(index, 'HoraFinComida', e.target.value)} disabled={!dia.EsDiaLaboral || !dia.TieneComida} onFocus={() => setSelectedDayIndex(index)} />
                                    <TimeInput icon={<Moon size={16}/>} label="Salida" value={dia.HoraSalida} onChange={(e) => handleDetailChange(index, 'HoraSalida', e.target.value)} disabled={!dia.EsDiaLaboral} onFocus={() => setSelectedDayIndex(index)} />
                                </div>
                                 <div className="col-span-2 flex items-center justify-end text-right pr-1">
                                    {dia.EsDiaLaboral && dailyHours > 0 && (
                                        <span className={`text-sm font-medium flex items-center gap-1 ${hoursWarning ? 'text-orange-600' : 'text-slate-600'}`}>
                                            {dailyHours.toFixed(2)} hrs
                                            {hoursWarning && (
                                                <Tooltip text={warningTooltip}>
                                                    <AlertTriangle size={14} className="text-orange-500" />
                                                </Tooltip>
                                            )}
                                        </span>
                                    )}
                                     {!dia.EsDiaLaboral && <span className="text-xs text-slate-400">Descanso</span>}
                                </div>
                            </div>
                         );
                    })}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t">
                    <ToggleSwitch checked={formData.Activo} onChange={(isChecked) => setFormData({ ...formData, Activo: isChecked })} themeColor={theme[600]} />
                    <label className="text-sm font-medium text-slate-700">Activo</label>
                </div>
            </form>
        </Modal>
    );
};

const TimeInput = ({ label, value, onChange, disabled, icon, onFocus }: any) => (
    <div className="flex flex-col items-center">
        <label className="flex items-center justify-center gap-1 text-xs font-medium text-slate-500 mb-1">
            {icon} {label}
        </label>     
        <input type="time" value={value || '00:00'} onChange={onChange} disabled={disabled} onFocus={onFocus}
            className="w-full text-sm rounded-md border-slate-300 p-2 focus:outline-none focus:border-[--theme-500] focus:ring-1 focus:ring-[--theme-500] disabled:bg-slate-200 disabled:cursor-not-allowed" />
    </div>
);