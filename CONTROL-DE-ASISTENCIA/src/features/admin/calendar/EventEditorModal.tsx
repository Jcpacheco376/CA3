// src/features/admin/calendar/EventEditorModal.tsx
import React, { SetStateAction } from 'react';
import { Save, Users, Filter, Trash2, Plus, Check, Info } from 'lucide-react';
import { Modal, Button } from '../../../components/ui/Modal';
import { SmartSelect } from '../../../components/ui/SmartSelect';
import { ModernDatePicker } from '../../../components/ui/ModernDatePicker';
import { FilterMultiSelect } from './FilterMultiSelect';
import { CalendarEvent, EventType, FilterGroup, CatalogItem } from './types';
import { DIMENSIONS, SENTENCE_FLOW, LOGICA_LABELS, DynamicIcon, getColor } from './utils';
import { Tooltip } from '../../../components/ui/Tooltip';

interface EventEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingEvent: CalendarEvent | null;
    eventTypes: EventType[];
    formData: {
        Fecha: string;
        Nombre: string;
        Descripcion: string;
        TipoEventoId: string;
        AplicaATodos: boolean;
    };
    setFormData: React.Dispatch<SetStateAction<{ Fecha: string; Nombre: string; Descripcion: string; TipoEventoId: string; AplicaATodos: boolean; }>>;
    formFilterGroups: FilterGroup[];
    setScopeMode: (aplicaATodos: boolean) => void;
    catalogs: Record<string, CatalogItem[]>;
    toggleFilterValue: (groupId: string, dimension: string, valorId: number) => void;
    clearDimension: (groupId: string, dimension: string) => void;
    addGroup: () => void;
    removeGroup: (groupId: string) => void;
    isCountLoading: boolean;
    matchingCount: { total: number | null, byGroup: number[] };
    totalCount: number | null;
    handleSubmit: (e: React.FormEvent) => void;
}

export const EventEditorModal: React.FC<EventEditorModalProps> = ({
    isOpen, onClose, editingEvent, eventTypes, formData, setFormData,
    formFilterGroups, setScopeMode, catalogs, toggleFilterValue, clearDimension,
    addGroup, removeGroup, isCountLoading, matchingCount, totalCount, handleSubmit
}) => {
    const selectedType = eventTypes.find(t => t.TipoEventoId === formData.TipoEventoId);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingEvent ? 'Editar Evento' : 'Nuevo Evento'}
            size="lg"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit" form="calendar-event-form">
                        <Save size={16} />
                        {editingEvent ? 'Actualizar' : 'Crear'}
                    </Button>
                </>
            }
        >
            <form id="calendar-event-form" onSubmit={handleSubmit} className="space-y-4">
                {/* Row 1: Date + Type */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
                        <ModernDatePicker
                            value={formData.Fecha}
                            onChange={(date) => setFormData(prev => ({
                                ...prev,
                                Fecha: date ? date.toISOString().split('T')[0] : ''
                            }))}
                            placeholder="Seleccionar fecha"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evento</label>
                        <SmartSelect
                            value={formData.TipoEventoId}
                            options={eventTypes.map(t => ({ value: t.TipoEventoId, title: t.Nombre }))}
                            onChange={(val: any) => setFormData(prev => ({ ...prev, TipoEventoId: val }))}
                            placeholder="Seleccione..."
                        />
                    </div>
                </div>

                {/* Type Info Banner */}
                {selectedType && (
                    <div className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${getColor(selectedType.ColorUI).pastel}`}>
                        <DynamicIcon name={selectedType.Icono} size={15} className="mt-0.5 shrink-0 opacity-80" />
                        <div>
                            <span className="font-semibold">{LOGICA_LABELS[selectedType.LogicaCalculo]?.label || selectedType.LogicaCalculo}</span>
                            <span className="mx-1">—</span>
                            <span>{selectedType.Descripcion || LOGICA_LABELS[selectedType.LogicaCalculo]?.description}</span>
                        </div>
                    </div>
                )}

                {/* Name */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Evento</label>
                    <input
                        type="text" required
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[--theme-500] transition hover:border-slate-300"
                        placeholder="Ej. Navidad, Viernes Santo"
                        value={formData.Nombre}
                        onChange={e => setFormData({ ...formData, Nombre: e.target.value })}
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
                    <textarea
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[--theme-500] transition resize-none hover:border-slate-300"
                        rows={2}
                        value={formData.Descripcion}
                        onChange={e => setFormData({ ...formData, Descripcion: e.target.value })}
                    />
                </div>

                {/* ═══ SCOPE SECTION ═══════════════════════════════════ */}
                <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-semibold text-slate-700">¿A quiénes aplica?</label>
                    </div>

                    {/* Scope Toggle */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => setScopeMode(true)}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left
                                ${formData.AplicaATodos
                                    ? 'border-[--theme-500] bg-[--theme-50]'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                        >
                            <Users size={18} className={formData.AplicaATodos ? 'text-[--theme-500]' : 'text-slate-400'} />
                            <div>
                                <p className={`text-sm font-semibold ${formData.AplicaATodos ? 'text-[--theme-700]' : 'text-slate-600'}`}>
                                    Todos los empleados
                                </p>
                                <p className="text-[10px] text-slate-400">Sin restricciones</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setScopeMode(false)}
                            className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left
                                ${!formData.AplicaATodos
                                    ? 'border-[--theme-500] bg-[--theme-50]'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                        >
                            <Filter size={18} className={!formData.AplicaATodos ? 'text-[--theme-500]' : 'text-slate-400'} />
                            <div>
                                <p className={`text-sm font-semibold ${!formData.AplicaATodos ? 'text-[--theme-700]' : 'text-slate-600'}`}>
                                    Solo algunos
                                </p>
                                <p className="text-[10px] text-slate-400">Filtrar por criterios</p>
                            </div>
                        </button>
                    </div>

                    {/* ═══ SENTENCE-FLOW MULTI-RULE BUILDER ═════════════════ */}
                    {!formData.AplicaATodos && (
                        <div className="space-y-4">
                            {/* Rule Groups Map */}
                            {formFilterGroups.map((group, groupIdx) => {
                                const isActiveCount = matchingCount.total !== null && matchingCount.byGroup[groupIdx] !== undefined;
                                const grpCount = matchingCount.byGroup[groupIdx];

                                return (
                                    <React.Fragment key={group.id}>
                                        {groupIdx > 0 && (
                                            <div className="flex items-center gap-4 my-4">
                                                <div className="flex-1 h-px bg-slate-200" />
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 rounded-full border border-slate-200">
                                                    O TAMBIÉN...
                                                </span>
                                                <div className="flex-1 h-px bg-slate-200" />
                                            </div>
                                        )}

                                        <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                                            {/* Header & Delete action */}
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm">
                                                        {groupIdx + 1}
                                                    </div>
                                                    <p className="text-xs text-slate-600 font-medium tracking-tight">
                                                        Empleados que cumplan esto:
                                                    </p>
                                                </div>
                                                {formFilterGroups.length > 1 && (
                                                    <Tooltip text="Eliminar regla">
                                                        <button type="button" onClick={() => removeGroup(group.id)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-white rounded transition">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>

                                            {/* Sentence Pipeline */}
                                            <div className="relative pl-5">
                                                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-gradient-to-b from-[--theme-300] via-slate-200 to-slate-200" />

                                                {SENTENCE_FLOW.map((step, idx) => {
                                                    const dim = DIMENSIONS.find(d => d.key === step.dimKey)!;
                                                    const items = catalogs[dim.key] || [];
                                                    const stepFilter = group.filters.find(f => f.dimension === dim.key);
                                                    let selected = stepFilter ? stepFilter.valores : [];
                                                    if (items.length === 1) {
                                                        selected = [items[0].id];
                                                    }
                                                    const isActive = selected.length > 0;
                                                    const isLast = idx === SENTENCE_FLOW.length - 1;

                                                    return (
                                                        <div key={step.dimKey} className={`relative ${isLast ? '' : 'mb-5'}`}>
                                                            <div className={`absolute -left-5 top-[7px] w-[15px] h-[15px] rounded-full border-2 flex items-center justify-center transition-all duration-300
                                                                ${isActive ? 'bg-[--theme-500] border-[--theme-500] shadow-sm shadow-[--theme-500]/30' : 'bg-white border-slate-300'}`}>
                                                                {isActive && <Check size={8} strokeWidth={3} className="text-white" />}
                                                            </div>

                                                            <p className={`text-[11px] font-semibold mb-1.5 ml-1 transition-colors ${isActive ? 'text-[--theme-600]' : 'text-slate-500'}`}>
                                                                {step.connector}
                                                            </p>

                                                            <div className="ml-1">
                                                                <FilterMultiSelect
                                                                    items={items}
                                                                    selected={selected}
                                                                    onToggle={(valId) => toggleFilterValue(group.id, dim.key, valId)}
                                                                    onClear={() => clearDimension(group.id, dim.key)}
                                                                    placeholder={step.placeholder}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Group Footer Count */}
                                            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                                                    <Users size={14} />
                                                    {isCountLoading ? (
                                                        <span className="italic">Calculando...</span>
                                                    ) : (
                                                        <span>
                                                            {isActiveCount ? (grpCount === 0 ? <span className="text-red-500 font-bold">0 empleados (no suma nada)</span> : <span className="text-[--theme-600] font-bold">{grpCount} empleados coinciden</span>) : '—'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })}

                            {/* Add rule button */}
                            <div className="pt-2">
                                <button type="button" onClick={addGroup} className="flex items-center gap-1.5 text-xs font-bold text-[--theme-500] hover:text-[--theme-600] px-3 py-2 rounded-lg border border-dashed border-[--theme-300] hover:border-[--theme-500] hover:bg-white shadow-sm transition w-full justify-center">
                                    <Plus size={14} /> Agregar otra regla ("O...")
                                </button>
                            </div>

                            {/* TOTAL Result Bar */}
                            <div className="mt-6 bg-gradient-to-r from-slate-50 to-white flex items-center gap-4 px-4 py-3 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[--theme-500]" />
                                <div className="flex items-center gap-2 shrink-0 w-36 border-r border-slate-200">
                                    <Users size={20} className={matchingCount.total === 0 ? 'text-red-400' : 'text-[--theme-500]'} />
                                    {isCountLoading ? (
                                        <div className="w-5 h-5 border-2 border-slate-200 border-t-[--theme-500] rounded-full animate-spin" />
                                    ) : (
                                        <span className={`text-2xl font-bold ${matchingCount.total === 0 ? 'text-red-500' : matchingCount.total !== null ? 'text-slate-800' : 'text-slate-400'}`}>
                                            {matchingCount.total !== null ? matchingCount.total : '—'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                                            TOTAL COMBINADO
                                        </span>
                                        {totalCount !== null && matchingCount.total !== null && totalCount > 0 && (
                                            <span className={`text-[11px] font-bold ${matchingCount.total === 0 ? 'text-red-500' : 'text-[--theme-600]'}`}>
                                                {Math.round((matchingCount.total / totalCount) * 100)}% de toda la plantilla
                                            </span>
                                        )}
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className={`h-full rounded-full transition-all duration-700 ease-out ${matchingCount.total === 0 ? 'bg-red-400' : 'bg-gradient-to-r from-[--theme-400] to-[--theme-500]'}`}
                                            style={{ width: totalCount && matchingCount.total !== null ? `${Math.max((matchingCount.total / totalCount) * 100, 1)}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {matchingCount.total === 0 && !isCountLoading && (
                                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2 shadow-sm">
                                    <Info size={14} className="text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-[11px] text-red-600 font-medium">
                                        No hay empleados que cumplan estas reglas combinadas. Intenta relajar algún criterio.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </form>
        </Modal>
    );
};
