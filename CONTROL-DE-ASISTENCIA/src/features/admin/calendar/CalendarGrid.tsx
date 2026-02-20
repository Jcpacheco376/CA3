// src/features/admin/calendar/CalendarGrid.tsx
import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { CalendarEvent, EventType } from './types';
import { MONTHS_ES, DAYS_ES, toDateKey, getColor, DynamicIcon } from './utils';

interface CalendarGridProps {
    viewMonth: number;
    viewYear: number;
    todayKey: string;
    selectedDate: string | null;
    calendarDays: { date: Date; inMonth: boolean }[];
    eventsByDate: Record<string, CalendarEvent[]>;
    prevMonth: () => void;
    nextMonth: () => void;
    goToToday: () => void;
    handleDayClick: (dateStr: string, inMonth: boolean) => void;
    openCreateModal: (dateStr?: string) => void;
    openEditModal: (ev: CalendarEvent) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
    viewMonth, viewYear, todayKey, selectedDate, calendarDays, eventsByDate,
    prevMonth, nextMonth, goToToday, handleDayClick, openCreateModal, openEditModal
}) => {
    return (
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                <button onClick={prevMonth} className="p-1.5 hover:bg-slate-200 rounded-md transition text-slate-500">
                    <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-700">{MONTHS_ES[viewMonth]} {viewYear}</h3>
                    <button onClick={goToToday} className="text-[10px] px-2 py-0.5 border border-slate-300 text-slate-500 rounded font-semibold hover:bg-slate-100 transition">
                        Hoy
                    </button>
                </div>
                <button onClick={nextMonth} className="p-1.5 hover:bg-slate-200 rounded-md transition text-slate-500">
                    <ChevronRight size={18} />
                </button>
            </div>

            <div className="grid grid-cols-7 border-b border-slate-200">
                {DAYS_ES.map(d => (
                    <div key={d} className="py-1.5 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map(({ date, inMonth }, idx) => {
                    const key = toDateKey(date);
                    const dayEvents = eventsByDate[key] || [];
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDate;
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    return (
                        <button
                            key={idx}
                            onClick={() => handleDayClick(key, inMonth)}
                            onDoubleClick={() => {
                                if (dayEvents.length === 0) openCreateModal(key);
                                else if (dayEvents.length === 1) openEditModal(dayEvents[0]);
                            }}
                            className={`
                                relative p-1.5 border-b border-r border-slate-100 text-left transition-colors group
                                hover:bg-slate-50 focus:outline-none
                                ${!inMonth ? 'bg-slate-50/60' : ''}
                                ${isSelected ? 'bg-[--theme-50] shadow-[inset_0_0_0_2px_var(--theme-400)]' : ''}
                                ${isWeekend && inMonth && !isSelected ? 'bg-slate-50/40' : ''}
                            `}
                        >
                            <span className={`
                                inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium
                                ${isToday ? 'bg-[--theme-500] text-white font-bold' : ''}
                                ${!isToday && inMonth ? 'text-slate-700' : ''}
                                ${!inMonth ? 'text-slate-300' : ''}
                            `}>
                                {date.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                                <div className="mt-0.5 space-y-0.5 overflow-hidden">
                                    {dayEvents.slice(0, 2).map(ev => {
                                        const c = getColor(ev.TipoColorUI);
                                        return (
                                            <div key={ev.EventoId} className={`flex items-center gap-1 text-[9px] leading-tight px-1.5 py-0.5 rounded font-medium ${c.bgText}`} title={ev.Nombre}>
                                                <DynamicIcon name={ev.TipoIcono} size={10} className="shrink-0" />
                                                <span className="truncate">{ev.Nombre}</span>
                                            </div>
                                        );
                                    })}
                                    {dayEvents.length > 2 && <div className="text-[9px] text-slate-400 px-1 font-medium">+{dayEvents.length - 2}</div>}
                                </div>
                            )}
                            {dayEvents.length === 0 && inMonth && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <Plus size={12} className="text-slate-300" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
