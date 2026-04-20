import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    getYear,
    parseISO,
    isValid,
    setMonth,
    setYear,
    addYears,
    subYears,
    startOfYear,
    endOfYear,
    eachMonthOfInterval
} from 'date-fns';
import { es } from 'date-fns/locale';

interface ModernDatePickerProps {
    value?: string | Date | null;
    onChange: (date: Date | null) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
    name?: string;
    className?: string;
    error?: string;
    variant?: 'default' | 'ghost';
}

type ViewMode = 'days' | 'months' | 'years';

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
    value,
    onChange,
    placeholder = "Seleccionar fecha...",
    label,
    required = false,
    disabled = false,
    name,
    className = "",
    error,
    variant = 'default'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date()); // Date currently visible/focused in navigation
    const [viewMode, setViewMode] = useState<ViewMode>('days'); // Current zoom level

    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Parse current value to Date object safely
    const selectedDate = useMemo(() => {
        if (!value) return null;
        if (value instanceof Date) return value;
        try {
            const parsed = parseISO(value as string);
            return isValid(parsed) ? parsed : null;
        } catch {
            return null;
        }
    }, [value]);

    useEffect(() => {
        if (isOpen) {
            // Reset view to selection or today on open
            setViewDate(selectedDate || new Date());
            setViewMode('days');
        }
    }, [isOpen]); // Only when opening

    // Calculate Popover Position
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            let leftPos = rect.left;
            if (leftPos + 280 > window.innerWidth) leftPos = window.innerWidth - 290;

            let topPos = rect.bottom + 8;
            if (topPos + 320 > window.innerHeight) topPos = rect.top - 330;

            setPosition({ top: topPos, left: leftPos });
        }
    }, [isOpen]);

    // Handle Click Outside
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


    // --- NAVIGATION HANDLERS ---

    const handlePrev = () => {
        if (viewMode === 'days') setViewDate(subMonths(viewDate, 1));
        else if (viewMode === 'months') setViewDate(subYears(viewDate, 1));
        else if (viewMode === 'years') setViewDate(subYears(viewDate, 12));
    };

    const handleNext = () => {
        if (viewMode === 'days') setViewDate(addMonths(viewDate, 1));
        else if (viewMode === 'months') setViewDate(addYears(viewDate, 1));
        else if (viewMode === 'years') setViewDate(addYears(viewDate, 12));
    };

    const handleHeaderClick = () => {
        if (viewMode === 'days') setViewMode('months');
        else if (viewMode === 'months') setViewMode('years');
    };

    // --- SELECTION HANDLERS ---

    const handleDayClick = (date: Date) => {
        onChange(date);
        setIsOpen(false);
    };

    const handleMonthClick = (monthIndex: number) => {
        const newDate = setMonth(viewDate, monthIndex);
        setViewDate(newDate);
        setViewMode('days');
    };

    const handleYearClick = (year: number) => {
        const newDate = setYear(viewDate, year);
        setViewDate(newDate);
        setViewMode('months');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(null);
    };

    // --- RENDERERS ---

    const renderHeader = () => {
        let label = '';
        if (viewMode === 'days') label = format(viewDate, 'MMMM yyyy', { locale: es });
        else if (viewMode === 'months') label = format(viewDate, 'yyyy');
        else if (viewMode === 'years') {
            const currentYear = getYear(viewDate);
            const startYear = currentYear - 6;
            const endYear = currentYear + 5;
            label = `${startYear} - ${endYear}`;
        }

        return (
            <div className="flex justify-between items-center mb-4 px-1">
                <button type="button" onClick={handlePrev} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ChevronLeft size={20} />
                </button>
                <button
                    type="button"
                    onClick={handleHeaderClick}
                    className="font-bold text-slate-700 capitalize text-sm hover:bg-slate-100 px-2 py-1 rounded transition-colors"
                >
                    {label}
                </button>
                <button type="button" onClick={handleNext} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                    <ChevronRight size={20} />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        const monthStart = startOfMonth(viewDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = startDate;
        while (day <= endDate) {
            days.push(day);
            day = addDays(day, 1);
        }

        const weekDays = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

        return (
            <div className="animate-fade-in">
                <div className="grid grid-cols-7 gap-y-2 mb-2">
                    {weekDays.map((d) => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, i) => {
                        const isCurrentMonth = isSameMonth(day, viewDate);
                        const isToday = isSameDay(day, new Date());
                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`
                                    relative h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-full transition-all
                                    ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
                                    ${isSelected
                                        ? 'bg-[--theme-500] text-white font-bold shadow-md transform scale-105'
                                        : 'hover:bg-slate-100 hover:text-slate-900'
                                    }
                                    ${isToday && !isSelected ? 'ring-1 ring-[--theme-500] text-[--theme-600] font-semibold' : ''}
                                `}
                            >
                                {format(day, 'd')}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMonths = () => {
        const months = Array.from({ length: 12 }, (_, i) => i);
        return (
            <div className="grid grid-cols-4 gap-4 py-2 animate-fade-in">
                {months.map((monthIndex) => {
                    const monthDate = setMonth(new Date(viewDate), monthIndex);
                    const isSelected = selectedDate && isSameMonth(monthDate, selectedDate);
                    const isCurrentMonth = isSameMonth(monthDate, new Date());

                    return (
                        <button
                            key={monthIndex}
                            type="button"
                            onClick={() => handleMonthClick(monthIndex)}
                            className={`
                                py-3 rounded-lg text-sm font-medium capitalize transition-colors
                                ${isSelected ? 'bg-[--theme-500] text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}
                                ${isCurrentMonth && !isSelected ? 'ring-1 ring-[--theme-300] text-[--theme-700]' : ''}
                            `}
                        >
                            {format(monthDate, 'MMM', { locale: es })}
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderYears = () => {
        const currentYear = getYear(viewDate);
        const startYear = currentYear - 6;
        const years = Array.from({ length: 12 }, (_, i) => startYear + i);

        return (
            <div className="grid grid-cols-4 gap-4 py-2 animate-fade-in">
                {years.map((year) => {
                    const isSelected = selectedDate && getYear(selectedDate) === year;
                    const isCurrentYear = getYear(new Date()) === year;

                    return (
                        <button
                            key={year}
                            type="button"
                            onClick={() => handleYearClick(year)}
                            className={`
                                py-3 rounded-lg text-sm font-medium transition-colors
                                ${isSelected ? 'bg-[--theme-500] text-white shadow-md' : 'text-slate-700 hover:bg-slate-100'}
                                ${isCurrentYear && !isSelected ? 'ring-1 ring-[--theme-300] text-[--theme-700]' : ''}
                            `}
                        >
                            {year}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Compact Display Format: dd/MM/yyyy
    const displayValue = selectedDate ? format(selectedDate, "dd/MM/yyyy") : "";

    const isGhost = variant === 'ghost';

    return (
        <div className={`w-full ${className}`}>
            <div
                ref={triggerRef}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    relative flex items-center w-full transition-all duration-200
                    ${isGhost ? 'px-1 py-1 bg-transparent border-none cursor-pointer' : 'px-3 py-2.5 bg-white border rounded-lg cursor-pointer'}
                    ${!isGhost && error ? 'border-red-300 focus:bg-red-50' : !isGhost ? 'border-slate-200 hover:border-slate-300' : ''}
                    ${!isGhost && isOpen ? 'border-[--theme-500]' : ''}
                    ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-70' : ''}
                `}
            >
                {!isGhost && <CalendarIcon size={16} className={`mr-3 ${selectedDate ? 'text-[--theme-500]' : 'text-slate-400'}`} />}

                <div className="flex-1 overflow-hidden">
                    {displayValue ? (
                        <span className={`text-sm font-medium block whitespace-nowrap overflow-hidden text-ellipsis ${isGhost ? 'text-slate-600 font-mono' : 'text-slate-700'}`}>
                            {displayValue}
                        </span>
                    ) : (
                        <span className="text-sm text-slate-400 block">
                            {placeholder}
                        </span>
                    )}
                </div>

                {selectedDate && !disabled && !isGhost && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="ml-2 p-0.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {error && <p className="mt-1 text-xs text-red-500 font-medium ml-1">{error}</p>}

            {isOpen && ReactDOM.createPortal(
                <div
                    ref={panelRef}
                    style={{ top: position.top, left: position.left }}
                    className="fixed z-[9999] w-72 bg-white rounded-xl shadow-2xl border border-slate-100 p-4 animate-scale-in origin-top-left"
                >
                    {renderHeader()}

                    {viewMode === 'days' && renderDays()}
                    {viewMode === 'months' && renderMonths()}
                    {viewMode === 'years' && renderYears()}

                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 -mx-4 -mb-4 px-4 py-3 rounded-b-xl">
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                onChange(today);
                                setIsOpen(false);
                            }}
                            className="text-xs font-semibold text-[--theme-600] hover:text-[--theme-700] transition-colors"
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
