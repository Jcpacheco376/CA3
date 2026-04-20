//src/components/ui/SmartSelect.tsx
import React, { useState, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface SmartSelectOption {
    value: string | number;
    title: string;
    subtitle?: string;
}

interface SmartSelectProps {
    label?: React.ReactNode;
    value: string | number | undefined;
    options: SmartSelectOption[];
    onChange: (value: string | number | undefined) => void;
    isLoading?: boolean;
    placeholder?: string;
    loadingText?: string;
    buttonIcon?: React.ElementType;
    itemIcon?: React.ElementType;
    colorScheme?: 'primary' | 'emerald';
    includeNoneOption?: boolean;
    noneLabel?: string;
    maxHeightClass?: string;
    searchThreshold?: number; // Show search when options exceed this count
    showButtonSubtitle?: boolean;
}

export const SmartSelect: React.FC<SmartSelectProps> = ({
    label,
    value,
    options,
    onChange,
    isLoading = false,
    placeholder = 'Seleccionar...',
    loadingText = 'Cargando...',
    buttonIcon: ButtonIcon,
    itemIcon: ItemIcon,
    colorScheme = 'primary',
    includeNoneOption = false,
    noneLabel = 'Ninguno / Sin Efecto',
    maxHeightClass = 'max-h-72',
    searchThreshold = 6,
    showButtonSubtitle = true,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.value === value);
    const showSearch = options.length > searchThreshold;

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const q = searchQuery.toLowerCase().trim();
        return options.filter(opt =>
            opt.title.toLowerCase().includes(q) ||
            (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
        );
    }, [options, searchQuery]);

    const colors = colorScheme === 'emerald' ? {
        buttonIcon: 'text-emerald-600',
        selectedBg: 'bg-emerald-50',
        titleSelected: 'font-bold text-emerald-700',
        subtitleSelected: 'text-emerald-600/80',
        check: 'text-emerald-600',
    } : {
        buttonIcon: 'text-[--theme-500]',
        selectedBg: 'bg-[--theme-50]',
        titleSelected: 'font-bold text-[--theme-700]',
        subtitleSelected: 'text-[--theme-600]/80',
        check: 'text-[--theme-600]',
    };

    const toggleOpen = () => {
        if (isLoading) return;

        if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + 2,
                left: rect.left,
                width: rect.width,
            });
        }

        if (isOpen) {
            setSearchQuery('');
        }

        setIsOpen(!isOpen);

        // Focus the search input after opening
        if (!isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    };

    const handleSelect = (val: string | number | undefined) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="w-full">
            {label && <div className="mb-1">{label}</div>}

            <Tooltip text={selectedOption?.subtitle || selectedOption?.title || ''} disabled={!selectedOption}>
                <button
                    ref={triggerRef}
                    type="button"
                    onClick={toggleOpen}
                    disabled={isLoading}
                    className="w-full text-left bg-white border border-slate-200 text-slate-700 py-2 px-3 rounded-lg focus:outline-none focus:border-[--theme-500] flex justify-between items-center sm:text-sm transition-all hover:border-slate-300"
                >
                    {isLoading ? (
                        <span className="text-slate-400">{loadingText}</span>
                    ) : selectedOption ? (
                        <div className="flex-1 min-w-0 mr-2 flex items-center gap-2 overflow-hidden">
                            {ButtonIcon && value !== undefined && (
                                <ButtonIcon size={16} className={`${colors.buttonIcon} shrink-0`} />
                            )}
                            <span className="font-semibold text-slate-800 truncate shrink-0">
                                {selectedOption.title}
                            </span>
                            {selectedOption.subtitle && showButtonSubtitle && (
                                <span className="text-slate-500 text-xs truncate ml-2 flex-1">
                                    ({selectedOption.subtitle})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                    <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[--theme-500]' : 'text-slate-400'}`} />
                </button>
            </Tooltip>

            {isOpen && ReactDOM.createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={handleClose} />
                    <div
                        className={`fixed z-[9999] bg-white shadow-2xl rounded-xl text-base ring-1 ring-black/5 focus:outline-none sm:text-sm animate-in fade-in zoom-in-95 duration-100 border border-slate-100 flex flex-col`}
                        style={{ top: coords.top, left: coords.left, width: coords.width }}
                    >
                        {/* Search input - only shown when options exceed threshold */}
                        {showSearch && (
                            <div className="p-2 border-b border-slate-100">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar..."
                                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-[--theme-400] placeholder:text-slate-400"
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Options list */}
                        <div className={`${maxHeightClass} overflow-auto py-1 custom-scrollbar`}>
                            {filteredOptions.length === 0 && (
                                <div className="px-3 py-4 text-sm text-slate-400 text-center">
                                    Sin resultados
                                </div>
                            )}

                            {filteredOptions.map((option) => {
                                const isSelected = option.value === value;
                                const tooltipText = option.subtitle || option.title;
                                return (
                                    <Tooltip key={String(option.value)} text={tooltipText}>
                                        <div
                                            onClick={() => handleSelect(option.value)}
                                            className={`cursor-pointer select-none relative py-2.5 pl-3 pr-9 transition-colors border-b border-slate-50 last:border-0 ${isSelected ? colors.selectedBg : 'hover:bg-slate-50'}`}
                                        >
                                            <div className="flex items-center gap-x-2 min-w-0">
                                                <span className={`block truncate shrink-0 ${isSelected ? colors.titleSelected : 'font-medium text-slate-800'}`}>
                                                    {option.title}
                                                </span>
                                                {option.subtitle && (
                                                    <span className={`truncate text-xs flex-1 ${isSelected ? colors.subtitleSelected : 'text-slate-400'}`}>
                                                        ({option.subtitle})
                                                    </span>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                    <Check size={16} className={colors.check} />
                                                </span>
                                            )}
                                        </div>
                                    </Tooltip>
                                );
                            })}

                            {includeNoneOption && (
                                <div
                                    onClick={() => handleSelect(undefined)}
                                    className="cursor-pointer select-none relative py-2.5 pl-3 pr-9 hover:bg-slate-50 text-slate-500 border-t border-slate-100 italic flex items-center gap-2"
                                >
                                    <span className="block truncate">{noneLabel}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};