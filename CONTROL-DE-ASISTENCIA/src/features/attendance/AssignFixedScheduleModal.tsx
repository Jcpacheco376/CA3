// src/features/attendance/AssignFixedScheduleModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { X, RotateCcw, ChevronLeft, ChevronRight, CalendarRange, CalendarDays } from 'lucide-react';
import { statusColorPalette } from '../../config/theme';
import { useAppContext } from '../../context/AppContext';
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { Modal } from '../../components/ui/Modal'; // Importar el componente Modal
import { Tooltip } from '../../components/ui/Tooltip';

// --- TIPOS ---
export type AssignScope = 'week' | 'period';

// --- HELPERS ---
const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];
const FULL_DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const getDbDayIndex = (dayIndex: number) => (dayIndex === 0 ? 7 : dayIndex);

// --- COMPONENTE MINI VIEW (Sin cambios en lógica interna) ---
const MiniWeekView = ({ details, colorUI, weekStartDay }: { details: any[], colorUI: string, weekStartDay: number }) => {
    const colorKey = colorUI || 'slate';
    const themePalette = statusColorPalette || {};
    const theme = themePalette[colorKey as keyof typeof themePalette] || themePalette.slate || { main: 'bg-blue-500' };

    const orderedDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const currentDayIndex = (weekStartDay + i) % 7;
            return {
                label: DAY_LABELS[currentDayIndex],
                dbIndex: getDbDayIndex(currentDayIndex)
            };
        });
    }, [weekStartDay]);

    return (
        <div className="flex space-x-0.5" title="Patrón semanal">
            {orderedDays.map((dayObj, index) => {
                const detail = details?.find(d => d.DiaSemana === dayObj.dbIndex);
                const isLaboral = detail?.EsDiaLaboral || false;
                const bgColor = isLaboral ? (theme?.main || 'bg-blue-500') : 'bg-slate-200';
                return (
                    <span key={index} className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold ${isLaboral ? 'text-white' : 'text-slate-400'} ${bgColor}`}>
                        {dayObj.label}
                    </span>
                );
            })}
        </div>
    );
};

// --- COMPONENTE RESUMEN (Sin cambios) ---
const generateScheduleSummary = (details: any[], weekStartDay: number): string => {
    if (!details || details.length === 0) return 'No definido';
    let summary = '';
    let startDayIndex = -1;
    let currentPattern = '';

    for (let i = 0; i < 7; i++) {
        const realDayIndex = (weekStartDay + i) % 7;
        const dbIndex = getDbDayIndex(realDayIndex);
        const dayLabel = DAY_LABELS[realDayIndex];
        const detail = details.find(d => d.DiaSemana === dbIndex);
        
        let dayPattern = (!detail || !detail.EsDiaLaboral) 
            ? 'Descanso' 
            : `${detail.HoraEntrada?.substring(0, 5) || '--:--'}-${detail.HoraSalida?.substring(0, 5) || '--:--'}${detail.TieneComida ? ' ☕' : ''}`;

        if (startDayIndex === -1) {
            startDayIndex = i;
            currentPattern = dayPattern;
        } else if (dayPattern !== currentPattern) {
            const endDayIndex = i - 1;
            const startLabel = DAY_LABELS[(weekStartDay + startDayIndex) % 7];
            const endLabel = DAY_LABELS[(weekStartDay + endDayIndex) % 7];
            summary += (startDayIndex === endDayIndex) ? `${startLabel}: ${currentPattern}, ` : `${startLabel}-${endLabel}: ${currentPattern}, `;
            startDayIndex = i;
            currentPattern = dayPattern;
        }
        if (i === 6) {
            const startLabel = DAY_LABELS[(weekStartDay + startDayIndex) % 7];
            summary += (startDayIndex === i) ? `${dayLabel}: ${currentPattern}` : `${startLabel}-${dayLabel}: ${currentPattern}`;
        }
    }
    summary = summary.trim().replace(/, $/, '');
    const allRestCheck = details.every(d => !d.EsDiaLaboral);
    if(allRestCheck) return 'Descanso Total';
    return summary;
};

// --- PROPS ACTUALIZADAS ---
interface AssignFixedScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    fixedSchedules: any[];
    viewMode: 'week' | 'fortnight' | 'month';
    activeWeekStart: Date | null;
    periodStart: Date;
    periodEnd: Date;
    onAssign: (horarioId: number | null, scope: AssignScope, targetWeekStart: Date, weekStartDayOverride?: number) => void;
    
    // --- NUEVA PROP: Para sincronizar con el padre ---
    onWeekChange?: (newWeekStart: Date) => void;
}

export const AssignFixedScheduleModal = ({
    isOpen,
    onClose,
    employeeName,
    fixedSchedules,
    viewMode,
    activeWeekStart,
    periodStart,
    periodEnd,
    onAssign,
    onWeekChange // <--- Recibimos la función
}: AssignFixedScheduleModalProps) => {
    const { weekStartDay } = useAppContext();
    const [scope, setScope] = useState<AssignScope>('week');
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(new Date());
    
    const [useNaturalWeek, setUseNaturalWeek] = useState(false);
    const currentWeekStartDay = useNaturalWeek ? 1 : weekStartDay; // 1 = Lunes
    const isConfigMonday = weekStartDay === 1;

    const configStartDayName = FULL_DAY_NAMES[weekStartDay] || '';
    const configEndDayName = FULL_DAY_NAMES[(weekStartDay + 6) % 7] || '';

    // Sincronización inicial
    useEffect(() => {
        if (isOpen && activeWeekStart) {
            setSelectedWeekStart(activeWeekStart);
            setScope('week'); 
        }
    }, [isOpen, activeWeekStart]);


    // --- NAVEGACIÓN SINCRONIZADA ---
    const handlePrevWeek = () => {
        const newDate = subWeeks(selectedWeekStart, 1);
        if (newDate >= startOfWeek(periodStart, { weekStartsOn: currentWeekStartDay as any })) {
            setSelectedWeekStart(newDate);
            // Notificamos al padre para que mueva la tabla de fondo
            if (onWeekChange) onWeekChange(newDate);
        }
    };

    const handleNextWeek = () => {
        const newDate = addWeeks(selectedWeekStart, 1);
        if (newDate <= periodEnd) {
            setSelectedWeekStart(newDate);
            // Notificamos al padre
            if (onWeekChange) onWeekChange(newDate);
        }
    };

    const weekLabel = useMemo(() => {
        const start = startOfWeek(selectedWeekStart, { weekStartsOn: currentWeekStartDay as any });
        const end = endOfWeek(selectedWeekStart, { weekStartsOn: currentWeekStartDay as any });
        return `${format(start, 'd MMM')} - ${format(end, 'd MMM', { locale: es })}`;
    }, [selectedWeekStart, currentWeekStartDay]);

    const periodLabel = useMemo(() => {
        return `${format(periodStart, 'd MMM')} - ${format(periodEnd, 'd MMM', { locale: es })}`;
    }, [periodStart, periodEnd]);


    const modalTitle = (
        <div>
            <h3 className="text-lg font-bold text-slate-800">Asignar Horario</h3>
            <p className="text-sm text-slate-500">Empleado: <span className="font-semibold text-slate-700">{employeeName}</span></p>
        </div>
    );

    const animationStyles = `
        @keyframes slideHorizontal {
            from { opacity: 0.4; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-horizontal {
            animation: slideHorizontal 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
    `;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={modalTitle}
            footer={null}
            size="md"
        >
            <style>{animationStyles}</style>
            <div className="flex flex-col -m-6"> {/* Use negative margin to absorb padding from Modal */}
                <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-3">
                    <div className="flex bg-slate-200/60 p-1 rounded-lg">
                        <div className="flex-1">
                            <Tooltip text={`Usar inicio de semana configurado (${configStartDayName} - ${configEndDayName})`}>
                                <button 
                                    onClick={() => { setScope('week'); setUseNaturalWeek(false); }} 
                                    className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-1.5 rounded-md transition-all ${scope === 'week' && !useNaturalWeek ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <CalendarDays size={16} />
                                    <span>Base {isConfigMonday ? '' : `(${DAY_LABELS[weekStartDay]})`}</span>
                                </button>
                            </Tooltip>
                        </div>
                        
                        {!isConfigMonday && (
                            <div className="flex-1">
                                <Tooltip text="Usar semana natural (Lunes - Domingo)">
                                    <button 
                                        onClick={() => { setScope('week'); setUseNaturalWeek(true); }} 
                                        className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-1.5 rounded-md transition-all ${scope === 'week' && useNaturalWeek ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <CalendarDays size={16} />
                                        <span>Natural (L)</span>
                                    </button>
                                </Tooltip>
                            </div>
                        )}

                        {viewMode !== 'week' && (
                            <div className="flex-1">
                                <Tooltip text={`Aplicar a todo el periodo visible (${periodLabel})`}>
                                    <button onClick={() => setScope('period')} className={`w-full flex items-center justify-center gap-2 text-sm font-medium py-1.5 rounded-md transition-all ${scope === 'period' ? 'bg-white text-[--theme-600] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                        <CalendarRange size={16} /> Periodo
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    {scope === 'week' ? (
                        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2">
                            <Tooltip text="Semana anterior">
                                <button onClick={handlePrevWeek} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={18} /></button>
                            </Tooltip>
                            <span className="text-sm font-semibold text-slate-700 capitalize">{weekLabel}</span>
                            <Tooltip text="Semana siguiente">
                                <button onClick={handleNextWeek} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={18} /></button>
                            </Tooltip>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-center">
                            <p className="text-xs text-amber-800 font-medium">Se aplicará a todos los días visibles ({periodLabel}).</p>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar max-h-[400px] mt-4">
                    <div className="space-y-2">
                        {fixedSchedules.length > 0 ? (
                            fixedSchedules.map(horario => {
                                const summary = generateScheduleSummary(horario?.Turnos || [], currentWeekStartDay);
                                const colorKey = horario?.ColorUI || 'slate';
                                const themePalette = statusColorPalette || {};
                                const theme = themePalette[colorKey as keyof typeof themePalette] || themePalette.slate;
                                
                                // Lógica robusta para el color del borde en hover
                                const themeMain = theme?.main || '';
                                let hoverBorderClass = 'hover:border-[--theme-300]'; // Fallback seguro al tema global
                                let styleProps = {};

                                if (themeMain.startsWith('#')) {
                                    hoverBorderClass = 'hover:border-[var(--hover-color)]';
                                    styleProps = { '--hover-color': themeMain } as React.CSSProperties;
                                } else {
                                    // Mapeo explícito para evitar que Tailwind purgue las clases dinámicas
                                    const colorMap: Record<string, string> = {
                                        slate: 'hover:border-slate-500', gray: 'hover:border-gray-500', zinc: 'hover:border-zinc-500', neutral: 'hover:border-neutral-500', stone: 'hover:border-stone-500',
                                        red: 'hover:border-red-500', orange: 'hover:border-orange-500', amber: 'hover:border-amber-500', yellow: 'hover:border-yellow-500', lime: 'hover:border-lime-500',
                                        green: 'hover:border-green-500', emerald: 'hover:border-emerald-500', teal: 'hover:border-teal-500', cyan: 'hover:border-cyan-500', sky: 'hover:border-sky-500',
                                        blue: 'hover:border-blue-500', indigo: 'hover:border-indigo-500', violet: 'hover:border-violet-500', purple: 'hover:border-purple-500', fuchsia: 'hover:border-fuchsia-500',
                                        pink: 'hover:border-pink-500', rose: 'hover:border-rose-500'
                                    };
                                    if (colorMap[colorKey]) hoverBorderClass = colorMap[colorKey];
                                }

                                return (
                                    <Tooltip key={horario.HorarioId} text={summary}>
                                        <button
                                            onClick={() => onAssign(horario.HorarioId, scope, selectedWeekStart, currentWeekStartDay)}
                                            style={styleProps}
                                            className={`w-full text-left p-3 rounded-lg flex items-start gap-3 border border-slate-200 ${hoverBorderClass} hover:bg-slate-50 transition-all group`}
                                        >
                                            <span className="w-1.5 h-10 rounded-full shrink-0 transition-colors" style={{ backgroundColor: theme.main }}></span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-semibold text-slate-700 group-hover:text-[--theme-700] truncate">{horario.Nombre}</span>
                                                    <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 rounded">{horario.Abreviatura}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-0.5 truncate">{summary}</p>
                                            </div>
                                            <div className="mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <div key={currentWeekStartDay} className="animate-slide-horizontal">
                                                    <MiniWeekView details={horario?.Turnos || []} colorUI={colorKey} weekStartDay={currentWeekStartDay} />
                                                </div>
                                            </div>
                                        </button>
                                    </Tooltip>
                                );
                            })
                        ) : (
                            <div className="text-center py-8 text-slate-400 text-sm">No hay horarios fijos configurados.</div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg">
                    <Tooltip text="Eliminar asignaciones manuales y restaurar el horario por defecto">
                        <button
                            onClick={() => onAssign(null, scope, selectedWeekStart, currentWeekStartDay)}
                            className="w-full py-2.5 flex items-center justify-center gap-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-dashed border-slate-300 hover:border-red-200"
                        >
                            <RotateCcw size={16} />
                            <span className="text-sm font-medium">Revertir a Horario Base</span>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </Modal>
    );
};