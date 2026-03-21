import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { Search, X, ChevronDown, SearchX, Calendar, HelpCircle } from 'lucide-react';
import { ICON_CATALOG } from './iconCatalog';
import { Tooltip } from '../../../components/ui/Tooltip';

interface IconPickerProps {
    value: string;
    onChange: (name: string) => void;
    defaultIcon?: string;
    compact?: boolean;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, defaultIcon, compact = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [coords, setCoords] = useState<{ top: number, left: number, width: number } | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Normalize search term
    const normalizedSearch = useMemo(() =>
        search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
        [search]);

    const filteredIcons = useMemo(() => {
        if (!normalizedSearch) return ICON_CATALOG;
        return ICON_CATALOG.filter(item =>
            item.name.toLowerCase().includes(normalizedSearch) ||
            item.tags.some(tag => tag.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").includes(normalizedSearch))
        );
    }, [normalizedSearch]);

    const updateCoords = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: 288 // Fixed width for the dropdown (w-72 = 18rem = 288px)
            });
        }
    };

    const handleToggle = () => {
        if (!isOpen) {
            updateCoords();
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('scroll', updateCoords, true);
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords, true);
            window.removeEventListener('resize', updateCoords);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return;
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedIconName = value || defaultIcon || 'Calendar';
    const SelectedIcon = (LucideIcons as any)[selectedIconName] || Calendar;

    const dropdown = coords && (
        <div
            ref={dropdownRef}
            style={{
                position: 'absolute',
                top: coords.top + 5,
                left: coords.left,
                width: coords.width,
                zIndex: 9999
            }}
            className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
        >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        autoFocus
                        type="text"
                        className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-[--theme-500] transition shadow-inner"
                        placeholder="Buscar icono..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition"
                        >
                            <X size={12} className="text-slate-400" />
                        </button>
                    )}
                </div>
            </div>

            <div className="max-h-60 overflow-y-auto p-2 scrollbar-thin">
                <div className="grid grid-cols-5 gap-1.5">
                    {filteredIcons.map((item) => {
                        const IconComp = (LucideIcons as any)[item.name] || HelpCircle;
                        const isSelected = value === item.name;

                        return (
                            <Tooltip key={item.name} text={item.tags[0] || item.name} placement="top">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(item.name);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`flex flex-col items-center justify-center w-full aspect-square rounded-lg border transition-all 
                                        ${isSelected
                                            ? 'bg-[--theme-500] border-[--theme-500] text-white shadow-md'
                                            : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200 hover:text-[--theme-600]'
                                        }`}
                                >
                                    <IconComp size={18} />
                                </button>
                            </Tooltip>
                        );
                    })}
                </div>
                {filteredIcons.length === 0 && (
                    <div className="py-8 text-center flex flex-col items-center gap-2">
                        <SearchX size={32} className="text-slate-300" />
                        <p className="text-xs text-slate-400 font-medium tracking-tight px-4">
                            No hay resultados para "{search}"
                        </p>
                    </div>
                )}
            </div>

            {value && (
                <div className="p-2 border-t border-slate-100 bg-slate-50/30 flex justify-end">
                    <button
                        onClick={() => { onChange(''); setIsOpen(false); }}
                        className="text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest px-2 py-1"
                    >
                        Limpiar icono
                    </button>
                </div>
            )}
        </div>
    );

    if (compact) {
        return (
            <div className="relative inline-block">
                <Tooltip text="Cambiar icono">
                    <button
                        ref={triggerRef}
                        type="button"
                        onClick={handleToggle}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${isOpen
                                ? 'bg-[--theme-500] border-[--theme-500] text-white shadow-md'
                                : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-[--theme-50] hover:text-[--theme-500] hover:border-[--theme-100]'
                            }`}
                    >
                        <SelectedIcon size={18} />
                    </button>
                </Tooltip>
                {isOpen && ReactDOM.createPortal(dropdown, document.body)}
            </div>
        );
    }

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center gap-2 pl-2.5 pr-8 py-2 rounded-lg border border-slate-200 bg-white text-sm hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[--theme-500]/20 text-left min-h-[40px]"
            >
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-50 text-slate-500 border border-slate-100 shrink-0">
                    <SelectedIcon size={16} />
                </div>
                <span className={`truncate ${value ? 'text-slate-700 font-semibold' : 'text-slate-400 font-medium'}`}>
                    {value || 'Seleccione'}
                </span>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {isOpen && ReactDOM.createPortal(dropdown, document.body)}
        </div>
    );
};
