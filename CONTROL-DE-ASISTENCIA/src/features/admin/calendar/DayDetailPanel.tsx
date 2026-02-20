// src/features/admin/calendar/DayDetailPanel.tsx
import React from 'react';
import { Calendar as CalendarIcon, Sparkles, Plus, Filter, Users, Pencil, Trash2 } from 'lucide-react';
import { CalendarEvent } from './types';
import { MONTHS_ES, parseDateKey, getColor, DynamicIcon, LOGICA_LABELS } from './utils';
import { Tooltip } from '../../../components/ui/Tooltip';
import { themes } from '../../../config/theme';

interface DayDetailPanelProps {
    selectedDate: string | null;
    selectedDayEvents: CalendarEvent[];
    openCreateModal: (dateStr?: string) => void;
    openEditModal: (ev: CalendarEvent) => void;
    handleDelete: (id: number) => void;
}

export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
    selectedDate, selectedDayEvents, openCreateModal, openEditModal, handleDelete
}) => {
    return (
        <div className="w-80 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col min-h-0 overflow-hidden shrink-0">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                {selectedDate ? (
                    <div>
                        <p className="text-[10px] text-[--theme-500] font-semibold uppercase tracking-wider">
                            {parseDateKey(selectedDate).toLocaleDateString('es-ES', { weekday: 'long' })}
                        </p>
                        <p className="text-lg font-bold text-slate-800">
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

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {selectedDate && selectedDayEvents.length === 0 && (
                    <div className="text-center py-6">
                        <CalendarIcon size={28} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-xs text-slate-400 mb-2">Sin eventos</p>
                        <button onClick={() => openCreateModal(selectedDate)} className="text-xs text-[--theme-500] font-semibold hover:underline">
                            + Agregar evento
                        </button>
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
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <DynamicIcon name={ev.TipoIcono} size={14} style={{ color: themes[ev.TipoColorUI]?.[500] }} />
                                        <h4 className="font-semibold text-slate-800 text-sm truncate">{ev.Nombre}</h4>
                                    </div>
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
                                            <p className="text-[10px] text-slate-400 leading-tight">
                                                {ev.Filtros.map(f => f.valorNombre).join(', ')}
                                            </p>
                                        </div>
                                    )}
                                    {ev.AplicaATodos && (
                                        <p className="mt-1 text-[10px] text-slate-400 italic flex items-center gap-1">
                                            <Users size={10} /> Todos los empleados
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
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
                            </div>
                        </div>
                    );
                })}
            </div>
            {selectedDate && (
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
