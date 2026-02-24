// src/features/admin/calendar/CalendarGrid.tsx
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Cake, Award } from 'lucide-react';
import { CalendarEvent, EventType, EmployeeBirthday, EmployeeAnniversary } from './types';
import { MONTHS_ES, DAYS_ES, toDateKey, getColor, DynamicIcon, getSmartEventIcon } from './utils';
import { themes } from '../../../config/theme';

interface CalendarGridProps {
    viewMonth: number;
    viewYear: number;
    todayKey: string;
    selectedDate: string | null;
    calendarDays: { date: Date; inMonth: boolean }[];
    eventsByDate: Record<string, CalendarEvent[]>;
    birthdays: EmployeeBirthday[];
    anniversaries: EmployeeAnniversary[];
    prevMonth: () => void;
    nextMonth: () => void;
    goToToday: () => void;
    handleDayClick: (dateStr: string, inMonth: boolean) => void;
    openCreateModal: (dateStr?: string) => void;
    openEditModal: (ev: CalendarEvent) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
    viewMonth, viewYear, todayKey, selectedDate, calendarDays, eventsByDate, birthdays, anniversaries,
    prevMonth, nextMonth, goToToday, handleDayClick, openCreateModal, openEditModal
}) => {
    // Generate an animation key and direction class based on navigation direction
    const [prevParams, setPrevParams] = useState({ m: viewMonth, y: viewYear, animClass: 'animate-fade-in-up' });
    let currentAnimClass = prevParams.animClass;

    if (viewYear !== prevParams.y || viewMonth !== prevParams.m) {
        if (viewYear > prevParams.y || (viewYear === prevParams.y && viewMonth > prevParams.m)) {
            currentAnimClass = 'animate-slide-next';
        } else {
            currentAnimClass = 'animate-slide-prev';
        }
        setPrevParams({ m: viewMonth, y: viewYear, animClass: currentAnimClass });
    }

    const animationKey = `${viewYear}-${viewMonth}`;

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

            <div className="grid grid-cols-7 border-b border-slate-200 shrink-0">
                {DAYS_ES.map(d => (
                    <div key={d} className="py-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{d}</div>
                ))}
            </div>

            <div
                key={animationKey}
                className={`grid grid-cols-7 flex-1 min-h-0 overflow-hidden ${currentAnimClass}`}
                style={{ gridTemplateRows: `repeat(${calendarDays.length / 7}, minmax(0, 1fr))` }}
            >
                {calendarDays.map(({ date, inMonth }, idx) => {
                    const key = toDateKey(date);
                    const dayEvents = eventsByDate[key] || [];
                    const dayBirthdays = birthdays.filter(b => b.MesNacimiento === date.getMonth() + 1 && b.DiaNacimiento === date.getDate());
                    const dayAnniversaries = anniversaries.filter(a => a.MesAniversario === date.getMonth() + 1 && a.DiaAniversario === date.getDate());
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
                                relative p-1 border-b border-r border-slate-200 text-left transition-colors group
                                hover:bg-slate-50 focus:outline-none flex flex-col gap-0.5 overflow-hidden
                                ${!inMonth ? 'bg-slate-50/70' : 'bg-white'}
                                ${isSelected ? 'shadow-[inset_0_0_0_2px_var(--theme-500)] bg-[--theme-50]/30 z-10' : ''}
                                ${isWeekend && inMonth && !isSelected ? 'bg-slate-50/40' : ''}
                            `}
                        >
                            {/* Cabecera del día */}
                            <div className="flex justify-between items-start w-full mb-[1px] relative z-20 px-0.5 pt-0.5 min-h-[20px] shrink-0">
                                <div className="flex gap-1 items-start">
                                    {/* Cumpleaños (Pastel) */}
                                    {dayBirthdays.length > 0 && inMonth && (
                                        <div className="group/bday relative flex items-center justify-center w-5 h-5 rounded-full hover:bg-pink-50 transition-colors ">
                                            <Cake size={12} className="text-pink-400 shrink-0 opacity-70" />
                                            <div className="absolute top-full mt-1 left-0 z-50 hidden group-hover/bday:flex flex-col bg-slate-800 text-white text-[10px] w-max max-w-[150px] p-2 rounded shadow-xl pointer-events-none">
                                                <div className="font-bold border-b border-slate-600/50 pb-1 mb-1 text-pink-300">Cumpleaños</div>
                                                {dayBirthdays.map(b => (
                                                    <span key={b.EmpleadoId} className="truncate">{b.Nombres} {b.ApellidoPaterno}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Aniversarios (Medalla) */}
                                    {dayAnniversaries.length > 0 && inMonth && (
                                        <div className="group/anniv relative flex items-center justify-center w-5 h-5 rounded-full hover:bg-blue-50 transition-colors">
                                            <Award size={12} className="text-blue-400 shrink-0 opacity-70" />
                                            <div className="absolute top-full mt-1 left-0 z-50 hidden group-hover/anniv:flex flex-col bg-slate-800 text-white text-[10px] w-max max-w-[180px] p-2 rounded shadow-xl pointer-events-none">
                                                <div className="font-bold border-b border-slate-600/50 pb-1 mb-1 text-blue-300">Aniversarios</div>
                                                {dayAnniversaries.map(a => (
                                                    <span key={a.EmpleadoId} className="truncate">{a.Nombres} {a.ApellidoPaterno} ({a.AniosServicio}º)</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <span className={`
                                    inline-flex items-center justify-center w-[22px] h-[22px] rounded-full text-[11px] font-medium transition-colors ml-auto
                                    ${isToday ? 'bg-[--theme-600] text-white font-bold shadow-sm' : ''}
                                    ${!isToday && inMonth ? 'text-slate-700 hover:bg-slate-200/80' : ''}
                                    ${!inMonth ? 'text-slate-400' : ''}
                                `}>
                                    {date.getDate()}
                                </span>
                            </div>

                            {/* Bloques de Eventos */}
                            <div className="flex-1 w-full space-y-[2px] overflow-hidden flex flex-col relative z-10 px-0.5">
                                {dayEvents.slice(0, 3).map((ev, i) => {
                                    const c = getColor(ev.TipoColorUI);
                                    return (
                                        <div key={ev.EventoId + '-' + i}
                                            className={`flex items-center gap-1 text-[10px] leading-tight px-1.5 py-[3px] rounded-[3px] font-medium border border-transparent hover:brightness-95 transition-all w-full truncate
                                                ${c.bgText} shadow-sm border-[rgba(0,0,0,0.05)]`}
                                            title={ev.Nombre}
                                        >
                                            <DynamicIcon name={getSmartEventIcon(ev.Nombre, ev.TipoIcono)} size={10} className="shrink-0 opacity-80" />
                                            <span className="truncate flex-1 font-semibold">{ev.Nombre}</span>
                                        </div>
                                    );
                                })}
                                {dayEvents.length > 3 && (
                                    <div className="text-[10px] text-slate-500 font-semibold px-1 w-full hover:text-slate-700 hover:underline cursor-pointer shrink-0">
                                        + {dayEvents.length - 3} más
                                    </div>
                                )}
                            </div>

                            {/* Botón flotante muy sutil para agregar */}
                            {dayEvents.length === 0 && inMonth && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <Plus size={16} className="text-slate-300" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
            <style>{`
                @keyframes slideInNext {
                    from { opacity: 0; transform: translateX(15px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideInPrev {
                    from { opacity: 0; transform: translateX(-15px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-next { animation: slideInNext 0.25s ease-out forwards; }
                .animate-slide-prev { animation: slideInPrev 0.25s ease-out forwards; }
                .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};
