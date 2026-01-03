// src/features/attendance/AssignFixedScheduleModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { X, Sun, Moon, Sunset, Coffee, RotateCcw } from 'lucide-react';
import { statusColorPalette } from '../../config/theme';
import { Tooltip } from '../../components/ui/Tooltip';

// --- Mini Visualizador Semanal (Para el Modal) ---
const MiniWeekView = ({ details, colorUI }: { details: any[], colorUI: string }) => {
    const colorKey = colorUI || 'slate';
    const themePalette = statusColorPalette || {};
    const theme = themePalette[colorKey as keyof typeof themePalette] || themePalette.slate || { main: 'bg-blue-500', textDark: 'text-blue-900' };
    const days = ["L", "M", "X", "J", "V", "S", "D"];

    return (
        <div className="flex space-x-0.5" title="Visualización semanal (L-D)">
            {days.map((dayLabel, index) => {
                const diaSemana = index + 1;
                const detail = details?.find(d => d.DiaSemana === diaSemana);
                const isLaboral = detail?.EsDiaLaboral || false;
                const bgColor = isLaboral ? (theme?.main || 'bg-blue-500') : 'bg-slate-200';
                return (
                    <span
                        key={index}
                        className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold ${isLaboral ? 'text-white' : 'text-slate-400'} ${bgColor}`}
                    >
                        {dayLabel}
                    </span>
                );
            })}
        </div>
    );
};

// --- Helper: Generador de Resumen Semanal ---
const generateScheduleSummary = (details: any[]): string => {
    if (!details || details.length === 0) return 'No definido';

    const daysOfWeek = ["L", "M", "X", "J", "V", "S", "D"];
    let summary = '';
    let startDay = -1;
    let currentPattern = '';

    for (let i = 0; i < 7; i++) {
        const diaSemana = i + 1;
        const detail = details.find(d => d.DiaSemana === diaSemana);
        let dayPattern: string;

        if (!detail || !detail.EsDiaLaboral) {
            dayPattern = 'Descanso';
        } else {
            const entrada = detail.HoraEntrada?.substring(0, 5) || '--:--';
            const salida = detail.HoraSalida?.substring(0, 5) || '--:--';
            const tieneComida = detail.TieneComida;
            dayPattern = `${entrada}-${salida}${tieneComida ? ' ☕' : ''}`;
        }

        if (startDay === -1) {
            startDay = i;
            currentPattern = dayPattern;
        } else if (dayPattern !== currentPattern) {
            const endDay = i - 1;
            if (startDay === endDay) {
                summary += `${daysOfWeek[startDay]}: ${currentPattern}, `;
            } else {
                summary += `${daysOfWeek[startDay]}-${daysOfWeek[endDay]}: ${currentPattern}, `;
            }
            startDay = i;
            currentPattern = dayPattern;
        }
        if (i === 6) {
             if (startDay === i) {
                summary += `${daysOfWeek[i]}: ${currentPattern}`;
            } else {
                summary += `${daysOfWeek[startDay]}-${daysOfWeek[i]}: ${currentPattern}`;
            }
        }
    }
     summary = summary.trim().replace(/, $/, '');
     if (summary === 'L-D: Descanso') return 'Descanso Total';

    return summary;
};


// --- COMPONENTE MEJORADO: Modal para Asignar Horario Fijo ---
export const AssignFixedScheduleModal = ({
    isOpen,
    onClose,
    employeeName,
    fixedSchedules,
    onAssign,
    targetWeekLabel
}: {
    isOpen: boolean,
    onClose: () => void,
    employeeName: string,
    fixedSchedules: any[],
    onAssign: (horarioId: number | null) => void,
    targetWeekLabel: string
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen) {
            setPosition({
                top: window.innerHeight / 2 - 200,
                left: window.innerWidth / 2 - 200,
            });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            ref={modalRef}
            className="fixed bg-white rounded-lg shadow-xl border p-4 w-[400px] animate-scale-in z-[100]"
            style={position}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Asignar Horario Fijo</h3>
            <p className="text-sm text-slate-600 mb-1">Para: <span className="font-medium">{employeeName}</span></p>
            <p className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block mb-2">{targetWeekLabel}</p>
            <p className="text-sm text-slate-600 mb-2">Selecciona un horario fijo:</p>
            
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {fixedSchedules.length > 0 ? (
                    fixedSchedules.map(horario => {
                        const colorKey = horario?.ColorUI || 'slate';
                        const themePalette = statusColorPalette || {};
                        const theme = themePalette[colorKey as keyof typeof themePalette] || themePalette.slate || { main: 'bg-blue-500' };
                        const scheduleSummary = generateScheduleSummary(horario?.Turnos || []);

                        return (
                            <button
                                key={horario.HorarioId}
                                onClick={() => onAssign(horario.HorarioId)}
                                className="w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 ring-offset-1 ring-[--theme-500]"
                            >
                                <span
                                    className="w-2 h-4 mt-1 rounded-full shrink-0"
                                    style={{ backgroundColor: theme?.main || '#64748b' }}
                                ></span>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight" title={horario.Nombre}>
                                        {horario.Nombre}
                                        <span className="ml-2 text-xs font-normal text-slate-500">({horario.Abreviatura || 'N/A'})</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                                        {scheduleSummary}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 mt-0.5">
                                    <MiniWeekView details={horario?.Turnos || []} colorUI={colorKey} />
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <p className="text-sm text-slate-500 text-center p-4 bg-slate-50 rounded-md">No hay horarios fijos definidos.</p>
                )}

                
                <div className="pt-2"> 
                    <button
                        key="revert-button"
                        onClick={() => onAssign(null)}
                        className="w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors border-dashed border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-800 focus:outline-none focus:ring-2 ring-offset-1 ring-[--theme-500]"
                    >
                        <RotateCcw size={18} className="shrink-0 mt-0.5 text-slate-500" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">Revertir a Horario Base</p>
                            <p className="text-xs text-slate-500 mt-1 leading-snug">
                                Quita la asignación fija de esta semana.
                            </p>
                        </div>
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};

