import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LayoutList, ChevronLeft, ChevronRight, CloudDownload, Cake } from 'lucide-react';
import { CalendarEvent } from './types';
import { MONTHS_SHORT, parseDateKey, getColor } from './utils';
import { Tooltip } from '../../../components/ui/Tooltip';

interface AnnualOverviewProps {
    yearTimelineYear: number;
    setYearTimelineYear: React.Dispatch<React.SetStateAction<number>>;
    yearEvents: CalendarEvent[];
    yearMonthGroups: Record<number, CalendarEvent[]>;
    setViewMonth: (m: number) => void;
    setViewYear: (y: number) => void;
    today: Date;
    onImport?: () => void;
    birthdaysByMonth: Record<number, number>; // month 0-11 => count
}

// Fixed chip/gap dimensions only (card height is now measured dynamically)
const CARD_PADDING = 6;        // p-1.5 = 6px each side
const HEADER_HEIGHT = 24;      // month label (~10px text + mb-1 + text height buffers)
const CHIP_SIZE = 20;          // w-5 h-5
const CHIP_GAP = 4;            // gap-1

export const AnnualOverview: React.FC<AnnualOverviewProps> = ({
    yearTimelineYear, setYearTimelineYear, yearEvents, yearMonthGroups, setViewMonth, setViewYear, today, onImport, birthdaysByMonth
}) => {
    const [prevParams, setPrevParams] = useState({ y: yearTimelineYear, animClass: 'animate-fade-in-up' });
    const [maxChips, setMaxChips] = useState(8);
    const gridRef = useRef<HTMLDivElement>(null);

    let currentAnimClass = prevParams.animClass;
    if (yearTimelineYear !== prevParams.y) {
        currentAnimClass = yearTimelineYear > prevParams.y ? 'animate-slide-next' : 'animate-slide-prev';
        setPrevParams({ y: yearTimelineYear, animClass: currentAnimClass });
    }

    const computeMaxChips = useCallback(() => {
        if (!gridRef.current) return;
        const firstCard = gridRef.current.firstElementChild as HTMLElement | null;
        if (!firstCard) return;

        const cardW = firstCard.clientWidth;
        const cardH = firstCard.clientHeight;  // measured — no fixed constant
        const innerW = cardW - CARD_PADDING * 2;
        const chipsPerRow = Math.max(1, Math.floor((innerW + CHIP_GAP) / (CHIP_SIZE + CHIP_GAP)));

        const innerH = cardH - CARD_PADDING * 2 - HEADER_HEIGHT;
        const rows = Math.max(1, Math.floor((innerH + CHIP_GAP) / (CHIP_SIZE + CHIP_GAP)));

        setMaxChips(chipsPerRow * rows);
    }, []);

    useEffect(() => {
        computeMaxChips();
        const ro = new ResizeObserver(computeMaxChips);
        if (gridRef.current) ro.observe(gridRef.current);
        return () => ro.disconnect();
    }, [computeMaxChips]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 shrink-0 overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-[--theme-100] to-[--theme-50] text-[--theme-600] rounded-md shadow-sm border border-[--theme-200]/50">
                        <LayoutList size={16} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-xs tracking-tight">Panorama Anual</h3>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded p-1 shadow-sm h-7">
                        <button onClick={() => setYearTimelineYear(y => y - 1)} className="p-1 hover:bg-slate-50 rounded transition text-slate-400 hover:text-slate-700">
                            <ChevronLeft size={14} strokeWidth={2.5} />
                        </button>
                        <span className="text-xs font-black text-slate-700 w-12 text-center select-none tracking-wider">{yearTimelineYear}</span>
                        <button onClick={() => setYearTimelineYear(y => y + 1)} className="p-1 hover:bg-slate-50 rounded transition text-slate-400 hover:text-slate-700">
                            <ChevronRight size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                    <button
                        onClick={onImport}
                        className="flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                        <CloudDownload size={13} /> Importar
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="px-3 pb-2 pt-2 bg-slate-50/30 overflow-hidden flex-1">
                <div
                    key={yearTimelineYear}
                    ref={gridRef}
                    className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12 gap-1.5 h-full ${currentAnimClass}`}
                    style={{ gridAutoRows: '1fr' }}
                >
                    {Array.from({ length: 12 }, (_, monthIdx) => {
                        const monthEvents = yearMonthGroups[monthIdx] || [];
                        const isCurrent = monthIdx === today.getMonth() && yearTimelineYear === today.getFullYear();
                        const hasEvents = monthEvents.length > 0;

                        let seasonProps = { bg: 'bg-white', border: 'border-slate-200', glow: 'hover:border-slate-300 hover:shadow-sm' };
                        if (hasEvents) {
                            if (monthIdx < 3) seasonProps = { bg: 'bg-blue-50/20', border: 'border-blue-100', glow: 'hover:border-blue-300 hover:shadow-sm' };
                            else if (monthIdx < 6) seasonProps = { bg: 'bg-emerald-50/20', border: 'border-emerald-100', glow: 'hover:border-emerald-300 hover:shadow-sm' };
                            else if (monthIdx < 9) seasonProps = { bg: 'bg-amber-50/20', border: 'border-amber-100', glow: 'hover:border-amber-300 hover:shadow-sm' };
                            else seasonProps = { bg: 'bg-indigo-50/20', border: 'border-indigo-100', glow: 'hover:border-indigo-300 hover:shadow-sm' };
                        }
                        if (isCurrent) {
                            seasonProps = { bg: 'bg-[--theme-50]', border: 'border-2 border-[--theme-400]', glow: 'hover:border-[--theme-500] shadow-sm' };
                        }
                        if (!hasEvents && !isCurrent) {
                            seasonProps = { bg: 'bg-white/60', border: 'border-slate-100 border-dashed', glow: 'hover:border-slate-300 hover:bg-white' };
                        }

                        let visibleCount = maxChips;
                        if (monthEvents.length > maxChips) {
                            visibleCount = Math.max(0, maxChips - 1);
                        }
                        const visible = monthEvents.slice(0, visibleCount);
                        const overflow = monthEvents.length - visibleCount;

                        return (
                            <div
                                key={monthIdx}
                                className={`rounded-lg border p-1.5 cursor-pointer transition-all duration-200 flex flex-col min-h-0 overflow-hidden
                                    ${seasonProps.bg} ${seasonProps.border} ${seasonProps.glow}
                                    ${!hasEvents && !isCurrent ? 'opacity-60 hover:opacity-100' : ''}`}
                                onClick={() => { setViewMonth(monthIdx); setViewYear(yearTimelineYear); }}
                            >
                                {/* Month label + birthday badge */}
                                <div className="flex items-start justify-between mb-1">
                                    <h4 className={`text-[10px] font-black tracking-widest uppercase
                                        ${isCurrent ? 'text-[--theme-600]' : hasEvents ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {MONTHS_SHORT[monthIdx]}
                                    </h4>
                                    <div className="flex items-center gap-1.5">
                                        {(birthdaysByMonth[monthIdx] ?? 0) > 0 && (
                                            <div className="flex items-center gap-0.5 text-pink-400">
                                                <Cake size={9} />
                                                <span className="text-[9px] font-bold">{birthdaysByMonth[monthIdx]}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Chips area — packed tightly from top to bottom */}
                                <div className="flex flex-wrap content-start gap-1 overflow-hidden h-full">
                                    {!hasEvents ? (
                                        <span className="text-[9px] text-slate-300 select-none">—</span>
                                    ) : (
                                        <>
                                            {visible.map((ev, i) => {
                                                const c = getColor(ev.TipoColorUI);
                                                const dayNum = parseDateKey(ev.Fecha).getDate();
                                                return (
                                                    <Tooltip key={`${ev.EventoId}-${i}`} text={`${dayNum}: ${ev.Nombre}`}>
                                                        <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${c.bgText} border border-white/60`}>
                                                            {dayNum}
                                                        </div>
                                                    </Tooltip>
                                                );
                                            })}
                                            {overflow > 0 && (
                                                <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0 bg-slate-100 text-slate-500 border border-slate-200">
                                                    +{overflow}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{`
                @keyframes slideInNext { from { opacity: 0; transform: translateX(15px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes slideInPrev { from { opacity: 0; transform: translateX(-15px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes fadeInUp { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-next { animation: slideInNext 0.25s ease-out forwards; }
                .animate-slide-prev { animation: slideInPrev 0.25s ease-out forwards; }
                .animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};
