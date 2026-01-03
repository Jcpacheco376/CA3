// src-FRONT/components/ui/DateRangePicker.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
    format, addMonths, subMonths, startOfMonth, endOfMonth, 
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
    isWithinInterval, getYear
} from 'date-fns';
import { es } from 'date-fns/locale';
import { useAppContext } from '../../context/AppContext'; // <--- IMPORTANTE

interface DateRangePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: 'week' | 'fortnight' | 'month';
    rangeLabel: string;
}

export const DateRangePicker = ({ currentDate, onDateChange, viewMode, rangeLabel }: DateRangePickerProps) => {
    const { weekStartDay } = useAppContext(); // <--- CONSUMIMOS LA CONFIG
    const [isOpen, setIsOpen] = useState(false);
    const [pickerDate, setPickerDate] = useState(currentDate);
    // ... resto de estados (hoveredDate, triggerRef, etc) igual ...
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // ... useEffects de posicionamiento y click outside igual ...
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
            start = startOfWeek(date, { weekStartsOn: weekStartDay });
            end = endOfWeek(date, { weekStartsOn: weekStartDay });
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

    // ... Mismos useMemo de ranges ...
    const selectedRange = useMemo(() => getRange(currentDate), [currentDate, viewMode, weekStartDay]);
    const hoveredRange = useMemo(() => hoveredDate ? getRange(hoveredDate) : null, [hoveredDate, viewMode, weekStartDay]);
    
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
        const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartDay });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartDay });

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
        for(let i = 0; i < 7; i++) {
            // Sumamos el offset del usuario
            const dayLabelDate = addDays(baseDate, weekStartDay + i); 
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
                        bgClass = 'bg-[--theme-100]';
                        textClass = 'text-[--theme-700] font-semibold';
                        activeRangeForBorders = selectedRange;
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
                        </button>
                    );
                })}
            </div>
        );
    };

    // ... renderMonthGrid y PopoverContent igual ...
    const renderMonthGrid = () => { /* ... código existente ... */ 
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

    const handlePrev = () => { viewMode === 'month' ? setPickerDate(prev => subMonths(prev, 12)) : setPickerDate(prev => subMonths(prev, 1)); };
    const handleNext = () => { viewMode === 'month' ? setPickerDate(prev => addMonths(prev, 12)) : setPickerDate(prev => addMonths(prev, 1)); };
    const headerLabel = viewMode === 'month' ? format(pickerDate, 'yyyy') : format(pickerDate, 'MMMM yyyy', { locale: es });

    const PopoverContent = (
        <div ref={panelRef} className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 z-50 w-72 p-4 animate-scale-in" style={{ top: position.top, left: position.left }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
                <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronLeft size={20} /></button>
                <span className="font-bold text-slate-700 capitalize">{headerLabel}</span>
                <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><ChevronRight size={20} /></button>
            </div>
            {viewMode === 'month' ? renderMonthGrid() : renderDayGrid()}
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                 <button onClick={() => handleSelectDate(new Date())} className="text-xs font-semibold text-[--theme-600] hover:underline">Ir a Hoy</button>
            </div>
        </div>
    );

    return (
        <>
            <button ref={triggerRef} onClick={() => setIsOpen(!isOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 group ${isOpen ? 'bg-white border-[--theme-500] ring-2 ring-[--theme-100]' : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}>
                <CalendarIcon size={18} className={`text-slate-400 ${isOpen ? 'text-[--theme-500]' : 'group-hover:text-slate-600'}`} />
                <span className="font-semibold text-slate-700 text-sm whitespace-nowrap capitalize min-w-[140px] text-center">{rangeLabel}</span>
            </button>
            {isOpen && ReactDOM.createPortal(PopoverContent, document.body)}
        </>
    );
};