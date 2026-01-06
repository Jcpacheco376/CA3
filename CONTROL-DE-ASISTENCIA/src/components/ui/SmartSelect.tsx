import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
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
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

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
        setIsOpen(!isOpen);
    };

    const handleSelect = (val: string | number | undefined) => {
        onChange(val);
        setIsOpen(false);
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
                    className="w-full text-left bg-white border border-slate-300 text-slate-700 py-2.5 px-3 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[--theme-500]/20 focus:border-[--theme-500] flex justify-between items-center sm:text-sm transition-all"
                >
                    {isLoading ? (
                        <span className="text-slate-400">{loadingText}</span>
                    ) : selectedOption ? (
                        <div className="flex-1 min-w-0 mr-2 flex items-center gap-2 overflow-hidden">
                            {ButtonIcon && value !== undefined && (
                                <ButtonIcon size={16} className={`${colors.buttonIcon} shrink-0`} />
                            )}
                            <span className="font-semibold text-slate-800 shrink-0">
                                {String(selectedOption.value)}
                            </span>
                            {selectedOption.subtitle && (
                                <span className="text-slate-500 text-xs truncate ml-2">
                                    ({selectedOption.subtitle})
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                </button>
            </Tooltip>

            {isOpen && ReactDOM.createPortal(
                <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
                    <div
                        className={`fixed z-[9999] bg-white shadow-2xl ${maxHeightClass} rounded-xl py-1 text-base ring-1 ring-black/5 overflow-auto focus:outline-none sm:text-sm custom-scrollbar animate-in fade-in zoom-in-95 duration-100 border border-slate-100`}
                        style={{ top: coords.top, left: coords.left, width: coords.width }}
                    >
                        {options.map((option) => {
                            const isSelected = option.value === value;
                            const tooltipText = option.subtitle || option.title;
                            return (
                                <Tooltip key={String(option.value)} text={tooltipText}>
                                    <div
                                        onClick={() => handleSelect(option.value)}
                                        className={`cursor-pointer select-none relative py-2.5 pl-3 pr-9 transition-colors border-b border-slate-50 last:border-0 ${isSelected ? colors.selectedBg : 'hover:bg-slate-50'}`}
                                    >
                                        <div className="flex items-center gap-x-2 min-w-0">
                                            <span className={`block shrink-0 ${isSelected ? colors.titleSelected : 'font-medium text-slate-800'}`}>
                                                {String(option.value)}
                                            </span>
                                            {option.subtitle && (
                                                <span className={`truncate text-xs ${isSelected ? colors.subtitleSelected : 'text-slate-400'}`}>
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
                </>,
                document.body
            )}
        </div>
    );
};