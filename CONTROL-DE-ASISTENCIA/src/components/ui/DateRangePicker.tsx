// src/components/ui/DateRangePicker.tsx
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { 
    format, 
    addMonths, 
    subMonths, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    isSameMonth, 
    isSameDay, 
    addDays, 
    isWithinInterval,
    getYear
} from 'date-fns';
import { es } from 'date-fns/locale';

interface DateRangePickerProps {
    currentDate: Date;
    onDateChange: (date: Date) => void;
    viewMode: 'week' | 'fortnight' | 'month';
    rangeLabel: string;
}

export const DateRangePicker = ({ currentDate, onDateChange, viewMode, rangeLabel }: DateRangePickerProps) => {
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

    // --- Lógica de Rangos ---

    const getRange = (date: Date) => {
        let start, end;
        if (viewMode === 'week') {
            start = startOfWeek(date, { weekStartsOn: 1 });
            end = endOfWeek(date, { weekStartsOn: 1 });
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

    // Rangos calculados (Memorizados para rendimiento)
    const selectedRange = useMemo(() => getRange(currentDate), [currentDate, viewMode]);
    const hoveredRange = useMemo(() => hoveredDate ? getRange(hoveredDate) : null, [hoveredDate, viewMode]);

    // OPTIMIZACIÓN: Verificar si lo que estamos previsualizando (hover) es lo mismo que ya está seleccionado
    const isHoveringCurrentSelection = useMemo(() => {
        if (!hoveredRange) return false;
        return isSameDay(hoveredRange.start, selectedRange.start);
    }, [hoveredRange, selectedRange]);

    // OPTIMIZACIÓN: Manejador de selección inteligente
    const handleSelectDate = (date: Date) => {
        const targetRange = getRange(date);
        // Si el inicio del nuevo rango es igual al inicio del rango actual, no hacemos nada (ahorramos consulta)
        if (isSameDay(targetRange.start, selectedRange.start)) {
            setIsOpen(false);
            return;
        }
        onDateChange(date);
        setIsOpen(false);
    };

    const renderDayGrid = () => {
        const monthStart = startOfMonth(pickerDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }

        return (
            <div className="grid grid-cols-7 gap-y-1">
                {['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">
                        {d}
                    </div>
                ))}
                {days.map((day, i) => {
                    const isCurrentMonth = isSameMonth(day, pickerDate);
                    const isToday = isSameDay(day, new Date());
                    
                    // Estados
                    const isSelectedDay = isWithinInterval(day, selectedRange);
                    const isHoveredDay = hoveredRange ? isWithinInterval(day, hoveredRange) : false;

                    // Determinar estilos
                    let bgClass = 'bg-transparent';
                    let textClass = !isCurrentMonth ? 'text-slate-300' : 'text-slate-700';
                    let roundedClass = 'rounded-full'; // Por defecto redondo
                    
                    // Definimos qué rango está "activo" visualmente para los bordes redondeados
                    let activeRangeForBorders = null;

                    if (isSelectedDay) {
                        // SI ESTÁ SELECCIONADO: Usa el color del tema
                        bgClass = 'bg-[--theme-100]';
                        textClass = 'text-[--theme-700] font-semibold';
                        activeRangeForBorders = selectedRange;
                    } else if (isHoveredDay && !isHoveringCurrentSelection) {
                        // SI ESTÁ HOVERED Y NO ES EL SELECCIONADO: Usa gris
                        bgClass = 'bg-slate-100';
                        textClass = 'text-slate-900';
                        activeRangeForBorders = hoveredRange;
                    }

                    // Lógica de bordes (barra continua)
                    if (activeRangeForBorders) {
                        roundedClass = '';
                        if (isSameDay(day, activeRangeForBorders.start)) roundedClass += ' rounded-l-full';
                        if (isSameDay(day, activeRangeForBorders.end)) roundedClass += ' rounded-r-full';
                    }

                    // Marcadores fuertes (Círculos)
                    const isStart = activeRangeForBorders && isSameDay(day, activeRangeForBorders.start);
                    const isEnd = activeRangeForBorders && isSameDay(day, activeRangeForBorders.end);
                    const showStrongMarker = isStart || isEnd;

                    // Color del marcador fuerte
                    let markerColor = 'bg-[--theme-500]';
                    if (isHoveredDay && !isSelectedDay) markerColor = 'bg-slate-400'; // Marcador gris para hover

                    return (
                        <button
                            key={i}
                            onMouseEnter={() => setHoveredDate(day)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => handleSelectDate(day)}
                            className={`
                                relative h-8 w-full flex items-center justify-center text-sm transition-colors
                                ${bgClass} ${textClass} ${roundedClass}
                            `}
                        >
                           <span className={`relative z-10 ${showStrongMarker ? 'text-white' : ''}`}>
                                {format(day, 'd')}
                           </span>
                           
                           {/* Círculo fuerte para inicio/fin */}
                           {showStrongMarker && (
                                <div className={`absolute inset-0 m-auto w-8 h-8 rounded-full ${markerColor}`}></div>
                           )}

                           {/* Puntito para "Hoy" (si no está tapado por un marcador) */}
                           {isToday && !showStrongMarker && <div className="absolute bottom-1 w-1 h-1 bg-[--theme-500] rounded-full"></div>}
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
                        <button
                            key={monthIndex}
                            onMouseEnter={() => setHoveredDate(monthDate)}
                            onMouseLeave={() => setHoveredDate(null)}
                            onClick={() => handleSelectDate(monthDate)}
                            className={`
                                py-3 rounded-lg text-sm font-medium capitalize transition-colors
                                ${isSelected 
                                    ? 'bg-[--theme-500] text-white shadow-md' 
                                    : isHovered ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                                }
                            `}
                        >
                            {format(monthDate, 'MMM', { locale: es })}
                        </button>
                    );
                })}
            </div>
        );
    };

    const handlePrev = () => {
        if (viewMode === 'month') setPickerDate(prev => subMonths(prev, 12));
        else setPickerDate(prev => subMonths(prev, 1));
    };
    const handleNext = () => {
        if (viewMode === 'month') setPickerDate(prev => addMonths(prev, 12));
        else setPickerDate(prev => addMonths(prev, 1));
    };

    const headerLabel = viewMode === 'month' 
        ? format(pickerDate, 'yyyy') 
        : format(pickerDate, 'MMMM yyyy', { locale: es });

    const PopoverContent = (
        <div
            ref={panelRef}
            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 z-50 w-72 p-4 animate-scale-in"
            style={{ top: position.top, left: position.left }}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div className="flex justify-between items-center mb-2">
                <button onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ChevronLeft size={20} />
                </button>
                <span className="font-bold text-slate-700 capitalize">{headerLabel}</span>
                <button onClick={handleNext} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>

            {viewMode === 'month' ? renderMonthGrid() : renderDayGrid()}
            
            <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                 <button 
                    onClick={() => handleSelectDate(new Date())}
                    className="text-xs font-semibold text-[--theme-600] hover:underline"
                 >
                    Ir a Hoy
                 </button>
            </div>
        </div>
    );

    return (
        <>
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all duration-200 group
                    ${isOpen 
                        ? 'bg-white border-[--theme-500] ring-2 ring-[--theme-100]' 
                        : 'bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50'
                    }
                `}
            >
                <CalendarIcon size={18} className={`text-slate-400 ${isOpen ? 'text-[--theme-500]' : 'group-hover:text-slate-600'}`} />
                <span className="font-semibold text-slate-700 text-sm whitespace-nowrap capitalize min-w-[140px] text-center">
                    {rangeLabel}
                </span>
            </button>
            
            {isOpen && ReactDOM.createPortal(PopoverContent, document.body)}
        </>
    );
};