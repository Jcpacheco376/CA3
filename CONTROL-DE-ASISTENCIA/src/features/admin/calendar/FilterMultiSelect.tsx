// src/features/admin/calendar/FilterMultiSelect.tsx
import React, { useState, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Lock, X, Search, Check } from 'lucide-react';
import { CatalogItem } from './types';

interface FilterMultiSelectProps {
    items: CatalogItem[];
    selected: number[];
    onToggle: (id: number) => void;
    onClear: () => void;
    placeholder: string;
    readOnly?: boolean;
}

export const FilterMultiSelect: React.FC<FilterMultiSelectProps> = ({ items, selected, onToggle, onClear, placeholder, readOnly = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const isSingle = items.length === 1;
    const effectiveSelected = isSingle ? [items[0].id] : selected;
    const selectedItems = items.filter(i => effectiveSelected.includes(i.id));
    const showSearch = items.length > 6;

    const filteredItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(i => i.nombre.toLowerCase().includes(q));
    }, [items, search]);

    const sortedItems = useMemo(() =>
        [...filteredItems].sort((a, b) => {
            const aS = effectiveSelected.includes(a.id) ? 0 : 1;
            const bS = effectiveSelected.includes(b.id) ? 0 : 1;
            return aS - bS;
        }),
        [filteredItems, effectiveSelected]
    );

    const handleOpen = () => {
        if (isSingle || readOnly) return;
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const width = Math.max(rect.width, 300);
            const left = Math.min(rect.left, window.innerWidth - width - 16);
            setCoords({ top: rect.bottom + 4, left, width });
        }
        setIsOpen(true);
        setSearch('');
        setTimeout(() => searchRef.current?.focus(), 60);
    };

    const isEffectivelyReadOnly = isSingle || readOnly;

    return (
        <div className="relative">
            {/* Trigger */}
            <div
                ref={triggerRef}
                onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
                className={`min-h-[38px] w-full px-2.5 py-1.5 rounded-lg border transition-all
                    flex flex-wrap items-center gap-1.5
                    ${isEffectivelyReadOnly ? 'cursor-default bg-slate-50 border-slate-200 opacity-90 text-slate-500' : 'cursor-pointer'}
                    ${isOpen ? 'border-[--theme-500] shadow-sm bg-white' : (isEffectivelyReadOnly ? '' : 'border-slate-200 hover:border-slate-300')}
                    ${!isEffectivelyReadOnly && effectiveSelected.length > 0 ? 'bg-white' : ''}`}
            >
                {selectedItems.length === 0 ? (
                    <span className="text-xs text-slate-400 italic select-none">{placeholder}</span>
                ) : (
                    selectedItems.map(item => (
                        <span key={item.id}
                            className="inline-flex items-center gap-1 bg-[--theme-100] text-[--theme-700] text-[11px] font-medium px-2 py-0.5 rounded-md"
                        >
                            {item.nombre}
                            {!isEffectivelyReadOnly && (
                                <button type="button" onClick={e => { e.stopPropagation(); onToggle(item.id); }}
                                    className="hover:text-[--theme-900] transition-colors ml-0.5">
                                    <X size={10} />
                                </button>
                            )}
                        </span>
                    ))
                )}
                {!isEffectivelyReadOnly && (
                    <ChevronDown size={14} className={`ml-auto shrink-0 transition-transform duration-200
                        ${isOpen ? 'rotate-180 text-[--theme-500]' : 'text-slate-400'}`} />
                )}
                {isEffectivelyReadOnly && (
                    <Lock size={12} className="ml-auto shrink-0 text-slate-400" />
                )}
            </div>

            {/* Portal dropdown */}
            {isOpen && ReactDOM.createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
                    <div className="fixed z-[9999] bg-white shadow-xl rounded-xl border border-slate-100 flex flex-col animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: coords.top, left: coords.left, width: coords.width }}>
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                            <span className="text-[10px] text-slate-400 font-medium">
                                {selected.length} de {items.length} seleccionados
                            </span>
                            {selected.length > 0 && (
                                <button type="button" onClick={onClear}
                                    className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5 transition-colors">
                                    <X size={10} /> Limpiar
                                </button>
                            )}
                        </div>
                        {showSearch && (
                            <div className="p-2 border-b border-slate-100">
                                <div className="relative">
                                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input ref={searchRef} type="text" value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Buscar..."
                                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-[--theme-400] placeholder:text-slate-400"
                                        autoComplete="off" />
                                </div>
                            </div>
                        )}
                        <div className="max-h-52 overflow-y-auto py-1 custom-scrollbar">
                            {sortedItems.map(item => {
                                const isChecked = selected.includes(item.id);
                                return (
                                    <div key={item.id} onClick={() => onToggle(item.id)}
                                        className={`px-3 py-2 flex items-center gap-2.5 cursor-pointer transition-colors
                                            ${isChecked ? 'bg-[--theme-50]' : 'hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                                            ${isChecked ? 'bg-[--theme-500] border-[--theme-500]' : 'border-slate-300 bg-white'}`}>
                                            {isChecked && <Check size={10} strokeWidth={3} className="text-white" />}
                                        </div>
                                        <span className={`text-sm ${isChecked ? 'font-semibold text-[--theme-700]' : 'text-slate-700'}`}>
                                            {item.nombre}
                                        </span>
                                    </div>
                                );
                            })}
                            {sortedItems.length === 0 && (
                                <div className="px-3 py-4 text-xs text-slate-400 text-center">Sin resultados</div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};
