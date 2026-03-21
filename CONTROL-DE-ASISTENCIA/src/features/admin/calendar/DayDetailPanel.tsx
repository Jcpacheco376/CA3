// src/features/admin/calendar/DayDetailPanel.tsx
import React from 'react';
import { Calendar as CalendarIcon, Sparkles, Plus, Filter, Users, Pencil, Trash2, Cake, Award, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { CalendarEvent, EmployeeBirthday, EmployeeAnniversary } from './types';
import { MONTHS_ES, parseDateKey, getColor, DynamicIcon, LOGICA_LABELS } from './utils';
import { Tooltip } from '../../../components/ui/Tooltip';
import { themes } from '../../../config/theme';

interface DayDetailPanelProps {
    selectedDate: string | null;
    selectedDayEvents: CalendarEvent[];
    openCreateModal: (dateStr?: string) => void;
    openEditModal: (ev: CalendarEvent) => void;
    handleDelete: (id: number) => void;
    birthdays: EmployeeBirthday[];
    anniversaries: EmployeeAnniversary[];
    style?: React.CSSProperties;
    canManage?: boolean;
}

export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
    selectedDate, selectedDayEvents, openCreateModal, openEditModal, handleDelete, birthdays, anniversaries, style, canManage = true
}) => {
    // Filter birthdays for this specific day
    const dayBirthdays = React.useMemo(() => {
        if (!selectedDate) return [];
        const date = parseDateKey(selectedDate);
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return birthdays.filter(b => b.MesNacimiento === m && b.DiaNacimiento === d);
    }, [selectedDate, birthdays]);

    // Filter anniversaries for this specific day
    const dayAnniversaries = React.useMemo(() => {
        if (!selectedDate) return [];
        const date = parseDateKey(selectedDate);
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return anniversaries.filter(a => a.MesAniversario === m && a.DiaAniversario === d);
    }, [selectedDate, anniversaries]);

    return (
        <div style={style} className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                {selectedDate ? (
                    <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Detalle del día</p>
                        <p className="text-sm font-bold text-slate-700 leading-tight">
                            {parseDateKey(selectedDate).getDate()} de {MONTHS_ES[parseDateKey(selectedDate).getMonth()]}
                        </p>
                    </div>
                ) : (
                    <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Detalle del día</p>
                        <p className="text-xs text-slate-500 mt-0.5">Selecciona un día del calendario</p>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {/* Birthdays Section - Single element grouping all listing names */}
                {dayBirthdays.length > 0 && (
                    <div className="rounded-lg border border-pink-100 bg-gradient-to-br from-pink-50 to-orange-50 p-2.5 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <Cake size={80} className="text-pink-500" />
                        </div>

                        <div className="flex items-center gap-2 mb-2 relative">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                                <Cake size={14} className="text-pink-500 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="font-bold text-pink-700 text-[12px] leading-tight">
                                    {dayBirthdays.length === 1 ? '¡Hoy es su cumpleaños!' : '¡Cumpleaños de hoy!'}
                                </h4>
                                <p className="text-[9px] text-pink-400 font-semibold tracking-wide uppercase">Día de Celebración</p>
                            </div>
                        </div>

                        <div className="space-y-1.5 relative">
                            {dayBirthdays.map((b, idx) => (
                                <div key={b.EmpleadoId} className="flex items-center justify-between group/item">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-300 group-hover/item:bg-pink-500 transition-colors shrink-0" />
                                        <span className="text-[12px] font-bold text-pink-900 truncate">
                                            {b.Nombres} {b.ApellidoPaterno}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-pink-400 uppercase tracking-tighter shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        Felicidades
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-pink-100/50">
                            <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 text-pink-600 border border-pink-100 shadow-sm">
                                {dayBirthdays.length} {dayBirthdays.length === 1 ? 'Empleado' : 'Empleados'}
                            </span>
                            <span className="inline-flex text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/50 text-pink-400">
                                Evento de Sistema
                            </span>
                        </div>
                    </div>
                )}

                {/* Anniversaries Section - Unified card */}
                {dayAnniversaries.length > 0 && (
                    <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-2.5 shadow-sm relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <Award size={80} className="text-blue-500" />
                        </div>

                        <div className="flex items-center gap-2 mb-2 relative">
                            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                                <Award size={14} className="text-blue-500 animate-pulse" />
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-700 text-[12px] leading-tight">
                                    {dayAnniversaries.length === 1 ? '¡Aniversario laboral!' : '¡Aniversarios de hoy!'}
                                </h4>
                                <p className="text-[9px] text-blue-400 font-semibold tracking-wide uppercase">Hitos de Carrera</p>
                            </div>
                        </div>

                        <div className="space-y-1.5 relative">
                            {dayAnniversaries.map((a) => (
                                <div key={a.EmpleadoId} className="flex items-center justify-between group/item">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-300 group-hover/item:bg-blue-500 transition-colors shrink-0" />
                                        <span className="text-[12px] font-bold text-blue-900 truncate">
                                            {a.Nombres} {a.ApellidoPaterno}
                                        </span>
                                    </div>
                                    <span className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter shrink-0">
                                        {a.AniosServicio}º AÑO
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-blue-100/50">
                            <span className="inline-flex text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/70 text-blue-600 border border-blue-100 shadow-sm">
                                {dayAnniversaries.length} {dayAnniversaries.length === 1 ? 'Empleado' : 'Empleados'}
                            </span>
                            <span className="inline-flex text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/50 text-blue-400">
                                Trayectoria
                            </span>
                        </div>
                    </div>
                )}

                {selectedDate && selectedDayEvents.length === 0 && (
                    <div className="text-center py-6">
                        <CalendarIcon size={28} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-xs text-slate-400 mb-2">Sin eventos</p>
                        {canManage && (
                            <button onClick={() => openCreateModal(selectedDate)} className="text-xs text-[--theme-500] font-semibold hover:underline">
                                + Agregar evento
                            </button>
                        )}
                    </div>
                )}
                {!selectedDate && (
                    <div className="text-center py-6">
                        <Sparkles size={28} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-xs text-slate-400">Haz clic en un día para ver sus eventos</p>
                    </div>
                )}
                {selectedDayEvents.map(ev => {
                    const c = getColor(ev.TipoColorUI);
                    return (
                        <div key={ev.EventoId} className="rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow group">
                            <div className="flex flex-col">
                                {/* Header Row: Title + Action Buttons */}
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <DynamicIcon name={ev.EventoIcono || ev.TipoIcono} size={14} style={{ color: themes[ev.TipoColorUI]?.[500] }} className="shrink-0" />
                                        <h4 className="font-semibold text-slate-800 text-sm truncate">{ev.Nombre}</h4>
                                    </div>
                                    {canManage && (
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mt-0.5">
                                            <Tooltip text="Editar">
                                                <button onClick={() => openEditModal(ev)} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-[--theme-500] transition-colors">
                                                    <Pencil size={13} />
                                                </button>
                                            </Tooltip>
                                            <Tooltip text="Eliminar">
                                                <button onClick={() => handleDelete(ev.EventoId)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={13} />
                                                </button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>

                                {/* Content Area: Uses 100% full width */}
                                {ev.Descripcion && <p className="text-[11px] text-slate-500 mb-1.5 line-clamp-2">{ev.Descripcion}</p>}
                                <div className="flex flex-wrap gap-1">
                                    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bgText}`}>
                                        {ev.TipoEventoNombre}
                                    </span>
                                    <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                        {LOGICA_LABELS[ev.LogicaCalculo]?.label || ev.LogicaCalculo}
                                    </span>
                                </div>
                                {!ev.AplicaATodos && ev.Filtros.length > 0 && (
                                    <div className="mt-1.5 flex items-start gap-1">
                                        <Filter size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                        <p className="text-[10px] text-slate-400 leading-tight break-words">
                                            {ev.Filtros.map(f => f.valorNombre).join(', ')}
                                        </p>
                                    </div>
                                )}
                                {ev.AplicaATodos && (
                                    <p className="mt-1.5 text-[10px] text-slate-400 italic flex items-center gap-1">
                                        <Users size={10} /> Todos los empleados
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {selectedDate && canManage && (
                <div className="p-3 border-t border-slate-200">
                    <button
                        onClick={() => openCreateModal(selectedDate)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 text-slate-400 rounded-lg hover:border-[--theme-300] hover:text-[--theme-500] hover:bg-slate-50 transition-all text-xs font-medium"
                    >
                        <Plus size={14} /> Agregar evento
                    </button>
                </div>
            )}
        </div>
    );
};
