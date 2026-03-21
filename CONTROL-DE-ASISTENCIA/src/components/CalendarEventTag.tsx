import React from 'react';
import * as LucideIcons from 'lucide-react';
import { CalendarDays, CalendarOff, ArrowUpCircle, ArrowDownCircle, Info, Star, PartyPopper, Gift, Bell } from 'lucide-react';
import { Tooltip } from './ui/Tooltip';
import { themes } from '../config/theme';

interface CalendarEventTagProps {
    event: any;
    className?: string;
    size?: number;
}

const getEventIcon = (iconName: string, size = 15) => {
    // Primero intentamos match exacto con Lucide
    const Icon = iconName && (LucideIcons as any)[iconName] ? (LucideIcons as any)[iconName] : null;
    if (Icon) return <Icon size={size} />;

    // Fallbacks
    const icon = String(iconName || '').toLowerCase();
    switch (icon) {
        case 'calendar-off': return <CalendarOff size={size} />;
        case 'clock-arrow-up': return <ArrowUpCircle size={size} />;
        case 'clock-arrow-down': return <ArrowDownCircle size={size} />;
        case 'info': return <Info size={size} />;
        case 'star': return <Star size={size} />;
        case 'party-popper': return <PartyPopper size={size} />;
        case 'gift': return <Gift size={size} />;
        case 'bell': return <Bell size={size} />;
        default: return <CalendarDays size={size} />;
    }
};

const getEventColorClasses = (colorName: string) => {
    const c = String(colorName || '').toLowerCase();
    switch (c) {
        case 'red': return 'bg-red-50 text-red-600 border border-red-200';
        case 'rose': return 'bg-rose-50 text-rose-600 border border-rose-200';
        case 'orange': return 'bg-orange-50 text-orange-600 border border-orange-200';
        case 'amber': return 'bg-amber-50 text-amber-600 border border-amber-200';
        case 'yellow': return 'bg-yellow-50 text-yellow-600 border border-yellow-200';
        case 'lime': return 'bg-lime-50 text-lime-600 border border-lime-200';
        case 'green': return 'bg-green-50 text-green-600 border border-green-200';
        case 'emerald': return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
        case 'teal': return 'bg-teal-50 text-teal-600 border border-teal-200';
        case 'cyan': return 'bg-cyan-50 text-cyan-600 border border-cyan-200';
        case 'sky': return 'bg-sky-50 text-sky-600 border border-sky-200';
        case 'blue': return 'bg-blue-50 text-blue-600 border border-blue-200';
        case 'indigo': return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
        case 'violet': return 'bg-violet-50 text-violet-600 border border-violet-200';
        case 'purple': return 'bg-purple-50 text-purple-600 border border-purple-200';
        case 'fuchsia': return 'bg-fuchsia-50 text-fuchsia-600 border border-fuchsia-200';
        case 'pink': return 'bg-pink-50 text-pink-600 border border-pink-200';
        case 'slate': return 'bg-slate-50 text-slate-600 border border-slate-200';
        case 'gray': return 'bg-gray-50 text-gray-600 border border-gray-200';
        default: return 'bg-indigo-50 text-indigo-600 border border-indigo-200';
    }
};

export const CalendarEventTag: React.FC<CalendarEventTagProps> = ({ event, className = '', size = 15 }) => {
    const name = event.Nombre || event.nombre || '';
    const colorUi = event.TipoColorUI || event.tipoColorUI || event.ColorUI || event.colorUI || event.ColorUi;
    const isSpecial = name.toLowerCase().includes('feriado') ||
        name.toLowerCase().includes('natalicio') ||
        (event.TipoEventoId || event.tipoEventoId) === 'DIA_FERIADO';

    const finalColorName = colorUi || (isSpecial ? 'rose' : 'indigo');
    const colorStyle = getEventColorClasses(finalColorName);

    const iconName = event.EventoIcono || event.eventoIcono || event.Icono || event.icono || event.TipoIcono || event.tipoIcono;

    return (
        <Tooltip text={name}>
            <div className={`
                flex items-center justify-center transition-all hover:scale-110 select-none p-0.5 rounded-full shadow-sm
                ${colorStyle}
                ${className}
            `}>
                {getEventIcon(iconName, size)}
            </div>
        </Tooltip>
    );
};

export const CalendarEventList: React.FC<{ events: any[], size?: number }> = ({ events, size = 15 }) => {
    if (!events || events.length === 0) return null;

    const limit = 2; // Only 2 visible events, as requested

    return (
        <div className="flex items-center gap-0.5">
            {events.slice(0, events.length > limit + 1 ? limit : limit + 1).map((e, idx) => {
                // If there are exactly 3 events, we might show 3 instead of 2+1, 
                // but the user says exactly "se ven solo 2", so I will follow that strictly.
                // Wait, if there are 3 events, and the limit is 2, it would show 2 + 1. 
                // 3 icons might fit better than 2 icons + "+1" pill?
                // Actually, let's stick to the limit.

                // Correction: if there are 3 events, 3 icons take 3*19=57px. 2 icons + pill takes 3*19=57px too.
                // So no space saved by "+1". But user said "solo 2".
                if (events.length > limit && idx >= limit) return null;
                return <CalendarEventTag key={idx} event={e} size={size} />;
            })}

            {events.length > limit && (
                <Tooltip text={
                    <div className="flex flex-col gap-1.5 min-w-[140px] max-w-[200px]">
                        <div className="text-[10px] font-bold text-slate-400 border-b border-white/20 pb-1 mb-1 uppercase tracking-widest">
                            {events.length} Eventos en total
                        </div>
                        {events.map((e: any, idx: number) => {
                            const c = String(e.TipoColorUI || e.tipoColorUI || e.ColorUI || e.colorUI || '').toLowerCase() || 'slate';
                            return (
                                <div key={idx} className={`flex px-1 gap-1.5 items-center ${idx < limit ? 'opacity-50' : ''}`}>
                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: themes[c]?.[400] || '#94a3b8' }} />
                                    <span className="text-[11px] truncate font-medium leading-tight">{e.Nombre || e.nombre}</span>
                                </div>
                            );
                        })}
                    </div>
                }>
                    <div className="flex items-center justify-center bg-slate-200 text-slate-600 text-[9px] font-black w-[19px] h-[19px] rounded-full border border-slate-300 shadow-sm hover:bg-slate-300 transition-colors shrink-0">
                        +{events.length - limit}
                    </div>
                </Tooltip>
            )}
        </div>
    );
};
