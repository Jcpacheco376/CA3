// src/features/admin/calendar/AnnualOverview.tsx
import React from 'react';
import { LayoutList, ChevronLeft, ChevronRight, Calendar as CalIcon } from 'lucide-react';
import { CalendarEvent } from './types';
import { MONTHS_SHORT, parseDateKey, getColor, DynamicIcon } from './utils';
import { Tooltip } from '../../../components/ui/Tooltip';

interface AnnualOverviewProps {
    yearTimelineYear: number;
    setYearTimelineYear: React.Dispatch<React.SetStateAction<number>>;
    yearEvents: CalendarEvent[];
    yearMonthGroups: Record<number, CalendarEvent[]>;
    setViewMonth: (m: number) => void;
    setViewYear: (y: number) => void;
    today: Date;
}

export const AnnualOverview: React.FC<AnnualOverviewProps> = ({
    yearTimelineYear, setYearTimelineYear, yearEvents, yearMonthGroups, setViewMonth, setViewYear, today
}) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 overflow-hidden flex flex-col mb-2">
            {/* Header / Top Bar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-[--theme-100] to-[--theme-50] text-[--theme-600] rounded-md shadow-sm border border-[--theme-200]/50">
                        <LayoutList size={16} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 text-xs tracking-tight">Panorama Anual</h3>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1 shadow-sm h-7">
                    <button onClick={() => setYearTimelineYear(y => y - 1)} className="p-1 hover:bg-slate-50 rounded transition text-slate-400 hover:text-slate-700">
                        <ChevronLeft size={14} strokeWidth={2.5} />
                    </button>
                    <span className="text-xs font-black text-slate-700 w-12 text-center select-none tracking-wider">{yearTimelineYear}</span>
                    <button onClick={() => setYearTimelineYear(y => y + 1)} className="p-1 hover:bg-slate-50 rounded transition text-slate-400 hover:text-slate-700">
                        <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                </div>
            </div>

            {/* Grid Area */}
            <div className="p-3 bg-slate-50/30">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12 gap-2">
                    {Array.from({ length: 12 }, (_, monthIdx) => {
                        const monthEvents = yearMonthGroups[monthIdx] || [];
                        const isCurrent = monthIdx === today.getMonth() && yearTimelineYear === today.getFullYear();
                        const hasEvents = monthEvents.length > 0;

                        // Calculate visual season/gradient for a subtle premium feel
                        let seasonProps = {
                            bg: 'bg-white',
                            border: 'border-slate-200',
                            glow: 'hover:border-slate-300 hover:shadow-sm'
                        };

                        if (hasEvents) {
                            if (monthIdx < 3) seasonProps = { bg: 'bg-blue-50/20', border: 'border-blue-100', glow: 'hover:border-blue-300 hover:shadow-sm' };
                            else if (monthIdx < 6) seasonProps = { bg: 'bg-emerald-50/20', border: 'border-emerald-100', glow: 'hover:border-emerald-300 hover:shadow-sm' };
                            else if (monthIdx < 9) seasonProps = { bg: 'bg-amber-50/20', border: 'border-amber-100', glow: 'hover:border-amber-300 hover:shadow-sm' };
                            else seasonProps = { bg: 'bg-indigo-50/20', border: 'border-indigo-100', glow: 'hover:border-indigo-300 hover:shadow-sm' };
                        }

                        if (isCurrent) {
                            seasonProps = {
                                bg: 'bg-[--theme-50]',
                                border: 'border-[--theme-300] ring-1 ring-[--theme-200]',
                                glow: 'hover:border-[--theme-400] shadow-[0_2px_10px_-4px_var(--theme-200)] hover:shadow-md'
                            };
                        }

                        // Style for completely empty months to look intentional, not broken
                        if (!hasEvents && !isCurrent) {
                            seasonProps = {
                                bg: 'bg-white/60',
                                border: 'border-slate-100 border-dashed',
                                glow: 'hover:border-slate-300 hover:bg-white'
                            };
                        }

                        return (
                            <div
                                key={monthIdx}
                                className={`rounded-lg border p-2 cursor-pointer transition-all duration-200 flex flex-col min-h-[70px]
                                     backdrop-blur-sm
                                    ${seasonProps.bg} ${seasonProps.border} ${seasonProps.glow}
                                    ${!hasEvents && !isCurrent ? 'opacity-60 hover:opacity-100' : ''}`}
                                onClick={() => { setViewMonth(monthIdx); setViewYear(yearTimelineYear); }}
                            >
                                {/* Month Header */}
                                <div className="flex items-center justify-between mb-1.5 w-full">
                                    <h4 className={`text-[10px] font-black tracking-widest uppercase
                                        ${isCurrent ? 'text-[--theme-600]' : hasEvents ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {MONTHS_SHORT[monthIdx]}
                                    </h4>
                                </div>

                                {/* Events List (Preview) - COMPACT */}
                                <div className="flex-1 flex flex-wrap gap-1 content-start mt-1">
                                    {!hasEvents ? (
                                        <div className="w-full h-full flex items-center justify-center opacity-40">
                                            <span className="text-[9px] text-slate-400 font-medium select-none tracking-wider">-</span>
                                        </div>
                                    ) : (
                                        monthEvents.slice(0, 8).map((ev, i) => {
                                            const c = getColor(ev.TipoColorUI);
                                            const dayNum = parseDateKey(ev.Fecha).getDate();
                                            return (
                                                <Tooltip key={`${ev.EventoId}-${i}`} text={ev.Nombre}>
                                                    <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${c.bgText} ${c.lightBorder} border shadow-sm cursor-help hover:opacity-80 transition-opacity`}>
                                                        {dayNum}
                                                    </div>
                                                </Tooltip>
                                            );
                                        })
                                    )}
                                    {monthEvents.length > 8 && (
                                        <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                                            +{monthEvents.length - 8}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
