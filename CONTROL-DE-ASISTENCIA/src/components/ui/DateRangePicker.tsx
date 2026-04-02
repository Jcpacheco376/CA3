// src-FRONT/components/ui/DateRangePicker.tsx
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowRight } from 'lucide-react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays,
    isWithinInterval, getYear, isBefore, isAfter, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext'; // <--- IMPORTANTE
import { Tooltip } from './Tooltip';

interface DateRangePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: 'week' | 'fortnight' | 'month' | 'custom';
    rangeLabel: string;
    weekStartDay?: number;
    customRange?: { start: Date; end: Date };
    onRangeChange?: (start: Date, end: Date) => void;
    events?: any[];
    baseSchedule?: any[];
    className?: string;
    onMonthChange?: (date: Date) => void;
    minDate?: Date;
}

// --- COMPONENTE 1: SELECTOR ESTÁNDAR (Semana, Quincena, Mes) ---
const StandardDatePicker = ({ currentDate, onDateChange, viewMode, rangeLabel, weekStartDay, className, events }: any) => {
    const { weekStartDay: contextWeekStartDay } = useAppContext(); // <--- CONSUMIMOS LA CONFIG
    const effectiveWeekStartDay = weekStartDay !== undefined ? weekStartDay : contextWeekStartDay;

    const [isOpen, setIsOpen] = useState(false);
    const [pickerDate, setPickerDate] = useState(currentDate);
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen) {
            setPickerDate(currentDate);
            setHoveredDate(null);
        }
    }, [isOpen, currentDate]);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let leftPos = rect.left + (rect.width / 2) - 140;
            if (leftPos < 10) leftPos = 10;
            if (leftPos + 280 > window.innerWidth) leftPos = window.innerWidth - 290;
            setPosition({ top: rect.bottom + 8, left: leftPos });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- Lógica de Rangos DINÁMICA ---
    const getRange = (date: Date) => {
        let start, end;
        if (viewMode === 'week') {
            // AQUI ESTÁ LA MAGIA: Pasamos weekStartsOn dinámico
            start = startOfWeek(date, { weekStartsOn: effectiveWeekStartDay });
            end = endOfWeek(date, { weekStartsOn: effectiveWeekStartDay });
        } else if (viewMode === 'fortnight') {
            const d = date.getDate();
            if (d <= 15) {
                start = startOfMonth(date);
                end = new Date(date.getFullYear(), date.getMonth(), 15);
            } else {
                start = new Date(date.getFullYear(), date.getMonth(), 16);
                end = endOfMonth(date);
            }
        } else { // month
            start = startOfMonth(date);
            end = endOfMonth(date);
        }
        return { start, end };
    };

    const selectedRange = useMemo(() => getRange(currentDate), [currentDate, viewMode, effectiveWeekStartDay]);
    const hoveredRange = useMemo(() => hoveredDate ? getRange(hoveredDate) : null, [hoveredDate, viewMode, effectiveWeekStartDay]);

    const isHoveringCurrentSelection = useMemo(() => {
        if (!hoveredRange) return false;
        return isSameDay(hoveredRange.start, selectedRange.start);
    }, [hoveredRange, selectedRange]);

    const handleSelectDate = (date: Date) => {
        const targetRange = getRange(date);
        if (isSameDay(targetRange.start, selectedRange.start)) {
            setIsOpen(false);
            return;
        }
        onDateChange(date);
        setIsOpen(false);
    };

    // --- RENDERIZADO DEL GRID DINÁMICO ---
    const renderDayGrid = () => {
        const monthStart = startOfMonth(pickerDate);
        const monthEnd = endOfMonth(monthStart);
        // Usamos weekStartDay para dibujar el calendario alineado correctamente
        const startDate = startOfWeek(monthStart, { weekStartsOn: effectiveWeekStartDay });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: effectiveWeekStartDay });

        const days = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }

        // GENERAR ETIQUETAS DE DÍAS ORDENADAS (Ej: Mié, Jue, Vie...)
        const weekDaysLabels = [];
        // Creamos una fecha dummy que sabemos que es Domingo (ej. 2023-01-01)
        const baseDate = new Date(2023, 0, 1);
        for (let i = 0; i < 7; i++) {
            // Sumamos el offset del usuario
            const dayLabelDate = addDays(baseDate, effectiveWeekStartDay + i);
            weekDaysLabels.push(format(dayLabelDate, 'eeeeee', { locale: es })); // 'Lu', 'Ma'...
        }

        return (
            <div className="grid grid-cols-7 gap-y-1">
                {weekDaysLabels.map((d, idx) => (
                    <div key={idx} className="text-center text-xs font-semibold text-slate-400 py-1 capitalize">
                        {d}
                    </div>
                ))}

                {days.map((day, i) => {
                    const isCurrentMonth = isSameMonth(day, pickerDate);
                    const isToday = isSameDay(day, new Date());
                    const isSelectedDay = isWithinInterval(day, selectedRange);
                    const isHoveredDay = hoveredRange ? isWithinInterval(day, hoveredRange) : false;

                    let bgClass = 'bg-transparent';
                    let textClass = !isCurrentMonth ? 'text-slate-300' : 'text-slate-700';
                    let roundedClass = 'rounded-full';

                    let activeRangeForBorders = null;

                    if (isSelectedDay) {
                        bgClass = 'bg-[--theme-100]'; textClass = 'text-[--theme-700] font-semibold'; activeRangeForBorders = selectedRange;
                    } else if (isHoveredDay && !isHoveringCurrentSelection) {
                        bgClass = 'bg-slate-100';
                        textClass = 'text-slate-900';
                        activeRangeForBorders = hoveredRange;
                    }

                    if (activeRangeForBorders) {
                        roundedClass = '';
                        if (isSameDay(day, activeRangeForBorders.start)) roundedClass += ' rounded-l-full';
                        if (isSameDay(day, activeRangeForBorders.end)) roundedClass += ' rounded-r-full';
                    }

                    const isStart = activeRangeForBorders && isSameDay(day, activeRangeForBorders.start);
                    const isEnd = activeRangeForBorders && isSameDay(day, activeRangeForBorders.end);
                    const showStrongMarker = isStart || isEnd;

                    let markerColor = 'bg-[--theme-500]';
                    if (isHoveredDay && !isSelectedDay) markerColor = 'bg-slate-400';

                    const dayEvent = events?.find((e: any) => e.Fecha && isSameDay(parseISO(e.Fecha.substring(0, 10)), day));

                    return (
                        <button
                            key={i}
                            onMouseEnter={() => setHoveredDate(day)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => handleSelectDate(day)}
                            className={`relative h-8 w-full flex items-center justify-center text-sm transition-colors ${bgClass} ${textClass} ${roundedClass}`}
                        >
                            <span className={`relative z-10 ${showStrongMarker ? 'text-white' : ''}`}>
                                {format(day, 'd')}
                            </span>
                            {showStrongMarker && (
                                <div className={`absolute inset-0 m-auto w-8 h-8 rounded-full ${markerColor}`}></div>
                            )}
                            {isToday && !showStrongMarker && <div className="absolute bottom-1 w-1 h-1 bg-[--theme-500] rounded-full"></div>}
                            {dayEvent && !showStrongMarker && (
                                <Tooltip text={dayEvent.Nombre} placement="top">
                                    <div className={`absolute top-0 right-1 w-1.5 h-1.5 rounded-full ${dayEvent.TipoEventoId === 'FERIADO' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                </Tooltip>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderMonthGrid = () => {
        const months = Array.from({ length: 12 }, (_, i) => i);
        const currentYear = getYear(pickerDate);
        return (
            <div className="grid grid-cols-3 gap-2 mt-2">
                {months.map(monthIndex => {
                    const monthDate = new Date(currentYear, monthIndex, 1);
                    const isSelected = isSameMonth(monthDate, currentDate);
                    const isHovered = hoveredDate && isSameMonth(monthDate, hoveredDate);
                    return (
                        <button key={monthIndex} onMouseEnter={() => setHoveredDate(monthDate)} onMouseLeave={() => setHoveredDate(null)} onClick={() => handleSelectDate(monthDate)} className={`py-3 rounded-lg text-sm font-medium capitalize transition-colors ${isSelected ? 'bg-[--theme-500] text-white shadow-md' : isHovered ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {format(monthDate, 'MMM', { locale: es })}
                        </button>
                    );
                })}
            </div>
        );
    };

    const handlePrev = () => { viewMode === 'month' ? setPickerDate((prev: Date) => subMonths(prev, 12)) : setPickerDate((prev: Date) => subMonths(prev, 1)); };
    const handleNext = () => { viewMode === 'month' ? setPickerDate((prev: Date) => addMonths(prev, 12)) : setPickerDate((prev: Date) => addMonths(prev, 1)); };
    const headerLabel = viewMode === 'month' ? format(pickerDate, 'yyyy') : format(pickerDate, 'MMMM yyyy', { locale: es });

    const PopoverContent = (
        <div ref={panelRef} className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] w-72 p-4 animate-scale-in" style={{ top: position.top, left: position.left }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
                <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
                <span className="font-bold text-slate-700 capitalize">{headerLabel}</span>
                <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronRight size={20} /></button>
            </div>
            {viewMode === 'month' ? renderMonthGrid() : renderDayGrid()}
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                <button onClick={() => {
                    const today = new Date(); setPickerDate(today);
                    handleSelectDate(today);
                }} className="text-xs font-semibold text-[--theme-600] hover:underline">Ir a Hoy</button>
            </div>
        </div>
    );

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 group ${isOpen ? 'bg-white border-[--theme-500] ring-2 ring-[--theme-100]' : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'} ${className || ''}`}>
                <CalendarIcon size={18} className={`text-slate-400 shrink-0 ${isOpen ? 'text-[--theme-500]' : 'group-hover:text-slate-600'}`} />
                <span className="font-semibold text-slate-700 text-sm whitespace-nowrap capitalize flex-1 text-left min-w-0 truncate">{rangeLabel}</span>
            </button>
            {isOpen && ReactDOM.createPortal(PopoverContent, document.body)}
        </>
    );
};

// --- COMPONENTE 2: SELECTOR PERSONALIZADO (Libre) ---
const CustomDatePicker = ({ customRange, onRangeChange, rangeLabel, weekStartDay, className, events, baseSchedule, onMonthChange, minDate }: any) => {
    const { weekStartDay: contextWeekStartDay } = useAppContext();
    const effectiveWeekStartDay = weekStartDay !== undefined ? weekStartDay : contextWeekStartDay;

    const [isOpen, setIsOpen] = useState(false);
    const [pickerDate, setPickerDate] = useState(customRange?.start || new Date());
    const [selectingStart, setSelectingStart] = useState<Date | null>(null);
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    useEffect(() => {
        if (isOpen) {
            const initialDate = customRange?.start || new Date();
            setPickerDate(initialDate);
            setSelectingStart(null);
            setHoveredDate(null);
            // Notify parent of the initial month displayed
            if (onMonthChange) onMonthChange(initialDate);
        }
    }, [isOpen]); // Only on open/close, NOT on customRange changes

    const navigateMonth = useCallback((newDate: Date) => {
        setPickerDate(newDate);
        if (onMonthChange) onMonthChange(newDate);
    }, [onMonthChange]);

    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let leftPos = rect.left + (rect.width / 2) - 140;
            if (leftPos < 10) leftPos = 10;
            if (leftPos + 280 > window.innerWidth) leftPos = window.innerWidth - 290;
            setPosition({ top: rect.bottom + 8, left: leftPos });
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleSelectDate = (date: Date) => {
        if (!selectingStart) {
            setSelectingStart(date);
        } else {
            let start = selectingStart;
            let end = date;
            if (isBefore(end, start)) { [start, end] = [end, start]; }
            onRangeChange(start, end);
            setSelectingStart(null);
            setIsOpen(false);
        }
    };

    const renderDayGrid = () => {
        const monthStart = startOfMonth(pickerDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: effectiveWeekStartDay });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: effectiveWeekStartDay });

        const days = [];
        let day = startDate;
        while (day <= endDate) { days.push(day); day = addDays(day, 1); }

        const weekDaysLabels = [];
        const baseDate = new Date(2023, 0, 1);
        for (let i = 0; i < 7; i++) {
            const dayLabelDate = addDays(baseDate, effectiveWeekStartDay + i);
            weekDaysLabels.push(format(dayLabelDate, 'eeeeee', { locale: es }));
        }

        // Rango visual activo (mientras seleccionas o el ya seleccionado)
        let activeStart = customRange?.start;
        let activeEnd = customRange?.end;

        if (selectingStart && hoveredDate) {
            activeStart = isBefore(selectingStart, hoveredDate) ? selectingStart : hoveredDate;
            activeEnd = isAfter(selectingStart, hoveredDate) ? selectingStart : hoveredDate;
        } else if (selectingStart) {
            activeStart = selectingStart;
            activeEnd = selectingStart;
        }

        return (
            <div className="grid grid-cols-7 gap-y-1">
                {weekDaysLabels.map((d, idx) => (
                    <div key={idx} className="text-center text-xs font-semibold text-slate-400 py-1 capitalize">{d}</div>
                ))}
                {days.map((day, i) => {
                    const isCurrentMonth = isSameMonth(day, pickerDate);
                    const isToday = isSameDay(day, new Date());

                    let isSelected = false;
                    let isRange = false;
                    let isStart = false;
                    let isEnd = false;

                    if (activeStart && activeEnd) {
                        isSelected = isWithinInterval(day, { start: activeStart, end: activeEnd });
                        isStart = isSameDay(day, activeStart);
                        isEnd = isSameDay(day, activeEnd);
                        isRange = isSelected && !isStart && !isEnd;
                    }

                    let bgClass = 'bg-transparent';
                    let textClass = !isCurrentMonth ? 'text-slate-300' : 'text-slate-700';
                    let roundedClass = 'rounded-full';

                    // Determinamos si es descanso
                    let isDescanso = false;
                    if (baseSchedule && baseSchedule.length > 0) {
                        // 1. Verificar si hay un patrón semanal coincidente (Si existe en el array)
                        const dbDay = (day.getDay() + 6) % 7 + 1;
                        const pattern = baseSchedule.find((s: any) => typeof s === 'object' && 'DiaSemana' in s && s.DiaSemana === dbDay);
                        if (pattern && !pattern.EsDiaLaboral) {
                            isDescanso = true;
                        }

                        const dayStr = format(day, 'yyyy-MM-dd');
                        const isException = baseSchedule.some((d: any) => {
                            const dStr = (typeof d === 'string') ? d.substring(0, 10) : (d instanceof Date ? format(d, 'yyyy-MM-dd') : null);
                            return dStr === dayStr;
                        });

                        if (isException) {
                            isDescanso = true;
                        }
                    }

                    if (isStart || isEnd) {
                        bgClass = 'bg-[--theme-500]';
                        textClass = 'text-white font-bold';
                        roundedClass = isStart && isEnd ? 'rounded-full' : isStart ? 'rounded-l-full' : 'rounded-r-full';
                    } else if (isRange) {
                        bgClass = 'bg-[--theme-100]';
                        textClass = 'text-[--theme-700]';
                        roundedClass = '';
                    } else if (hoveredDate && isSameDay(day, hoveredDate) && !selectingStart) {
                        bgClass = 'bg-slate-100';
                    }

                    const dayEvent = events?.find((e: any) => e.Fecha && isSameDay(parseISO(e.Fecha.substring(0, 10)), day));

                    if (dayEvent && (dayEvent.TipoEventoId === 'DIA_FERIADO' || dayEvent.TipoEventoId === 'FERIADO')) {
                        // Feriado tiene prioridad sobre descanso para pintarse en el calendario completo
                        bgClass = 'bg-rose-100 ring-1 ring-rose-200';
                        textClass = 'text-rose-700 font-bold';
                    } else if (isDescanso) {
                        // Descanso según horario base u horario temporal (gris más obscuro que antes)
                        bgClass = 'bg-slate-100 ring-1 ring-slate-200';
                        textClass = 'text-slate-500 font-medium';
                    }

                    const tooltipText = dayEvent ? dayEvent.Nombre : (isDescanso ? 'Día de descanso' : '');

                    const isPast = minDate && isBefore(day, startOfMonth(minDate)) && !isSameMonth(day, minDate) ? true : (minDate && isBefore(day, minDate) && !isSameDay(day, minDate));

                    const dayButton = (
                        <button
                            key={i}
                            disabled={isPast}
                            onMouseEnter={() => setHoveredDate(day)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => handleSelectDate(day)}
                            className={`relative h-8 w-full flex items-center justify-center text-sm transition-colors ${isPast ? 'opacity-30 cursor-not-allowed grayscale-[0.5]' : bgClass} ${textClass} ${roundedClass}`}
                        >
                            {format(day, 'd')}
                            {isToday && !isSelected && <div className="absolute bottom-1 w-1 h-1 bg-[--theme-500] rounded-full"></div>}
                            {/* Mostrar puntito solo si NO es feriado completo, por ej. otros eventos */}
                            {dayEvent && !isSelected && dayEvent.TipoEventoId !== 'DIA_FERIADO' && dayEvent.TipoEventoId !== 'FERIADO' && (
                                <div className={`absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500`}></div>
                            )}
                        </button>
                    );

                    return tooltipText ? (
                        <Tooltip key={i} text={tooltipText} placement="top">
                            {dayButton}
                        </Tooltip>
                    ) : dayButton;
                })}
            </div>
        );
    };

    const headerLabel = format(pickerDate, 'MMMM yyyy', { locale: es });

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 group ${isOpen ? 'bg-white border-[--theme-500] ring-2 ring-[--theme-100]' : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'} ${className || ''}`}>
                <CalendarIcon size={18} className={`text-slate-400 shrink-0 ${isOpen ? 'text-[--theme-500]' : 'group-hover:text-slate-600'}`} />
                <span className="font-semibold text-slate-700 text-sm whitespace-nowrap capitalize flex-1 text-left min-w-0 truncate">{rangeLabel}</span>
            </button>
            {isOpen && ReactDOM.createPortal(
                <div ref={panelRef} className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 z-[9999] w-72 p-4 animate-scale-in" style={{ top: position.top, left: position.left }} onMouseDown={(e) => e.stopPropagation()}>

                    {/* HEADER INFORMATIVO */}
                    <div className="mb-3 pb-2 border-b border-slate-100 flex justify-between items-center text-xs">
                        <div className="text-slate-500">
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-slate-400">Desde</span>
                            {selectingStart ? format(selectingStart, 'dd MMM', { locale: es }) : (customRange ? format(customRange.start, 'dd MMM', { locale: es }) : '-')}
                        </div>
                        <ArrowRight size={12} className="text-slate-300" />
                        <div className="text-right text-slate-500">
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-slate-400">Hasta</span>
                            {selectingStart && hoveredDate ? format(hoveredDate, 'dd MMM', { locale: es }) : (customRange ? format(customRange.end, 'dd MMM', { locale: es }) : '-')}
                        </div>
                    </div>

                    <div className="flex justify-between items-center mb-2">
                        <button onClick={() => navigateMonth(subMonths(pickerDate, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={20} /></button>
                        <span className="font-bold text-slate-700 capitalize">{headerLabel}</span>
                        <button onClick={() => navigateMonth(addMonths(pickerDate, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={20} /></button>
                    </div>
                    {renderDayGrid()}
                    {/* Legend */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1 text-[10px] text-rose-600 font-semibold">
                                <span className="inline-block w-3 h-3 rounded bg-rose-100 ring-1 ring-rose-200 shrink-0"></span>
                                Feriado
                            </span>
                            {baseSchedule && baseSchedule.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-semibold">
                                    <span className="inline-block w-3 h-3 rounded bg-slate-50 ring-1 ring-slate-200 shrink-0"></span>
                                    Descanso
                                </span>
                            )}
                        </div>
                        <button onClick={() => navigateMonth(new Date())} className="text-xs font-semibold text-[--theme-600] hover:underline">Hoy</button>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

// --- EXPORTACIÓN PRINCIPAL ---
export const DateRangePicker = (props: DateRangePickerProps) => {
    if (props.viewMode === 'custom') {
        return <CustomDatePicker {...props} />;
    }
    return <StandardDatePicker {...props} />;
};