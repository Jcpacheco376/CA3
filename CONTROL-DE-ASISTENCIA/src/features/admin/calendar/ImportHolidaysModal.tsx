import React, { useState, useEffect, useMemo } from 'react';
import { CloudDownload, RotateCcw, CalendarCheck2, Info, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { Modal, Button } from '../../../components/ui/Modal';
import { SmartSelect } from '../../../components/ui/SmartSelect';
import { EventType } from './types';
import { Tooltip } from '../../../components/ui/Tooltip';
import { suggestIconFromName, DynamicIcon } from './utils';
import { IconPicker } from './IconPicker';

interface HolidayItem {
    id: string;
    date: string;
    localName: string;
    name: string;
    icono: string;
    selected: boolean; // Added selection state
}

interface ImportHolidaysModalProps {
    isOpen: boolean;
    onClose: () => void;
    importYear: number;
    setImportYear: (y: number) => void;
    importTypeId: string;
    setImportTypeId: (id: string) => void;
    isImporting: boolean;
    onImportConfirmed: (holidays: HolidayItem[]) => void;
    eventTypes: EventType[];
}

export const ImportHolidaysModal: React.FC<ImportHolidaysModalProps> = ({
    isOpen, onClose, importYear, setImportYear, importTypeId, setImportTypeId,
    isImporting, onImportConfirmed, eventTypes
}) => {
    const [previewList, setPreviewList] = useState<HolidayItem[]>([]);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // Helper to extract correct icon for a holiday
    const resolveHolidayIcon = (localName: string, typeIcon: string) => {
        return suggestIconFromName(localName, typeIcon);
    };

    // List of unofficial informative days for Mexico
    const getUnofficialDays = (year: number): HolidayItem[] => {
        const typeIcon = eventTypes.find(t => t.TipoEventoId === 'INFORMATIVO')?.Icono || 'Info';
        const list = [
            { id: '14feb', date: `${year}-02-14`, localName: 'Día de San Valentín', name: 'Valentine\'s Day' },
            { id: '30apr', date: `${year}-04-30`, localName: 'Día del Niño', name: 'Children\'s Day' },
            { id: '05may', date: `${year}-05-05`, localName: 'Batalla de Puebla', name: 'Cinco de Mayo' },
            { id: '10may', date: `${year}-05-10`, localName: 'Día de las Madres', name: 'Mother\'s Day' },
            { id: '15may', date: `${year}-05-15`, localName: 'Día del Maestro', name: 'Teacher\'s Day' },
            { id: '23may', date: `${year}-05-23`, localName: 'Día del Estudiante', name: 'Student\'s Day' },
            { id: 'jun3rd', date: `${year}-06-16`, localName: 'Día del Padre', name: 'Father\'s Day' },
            { id: '01nov', date: `${year}-11-01`, localName: 'Día de Todos los Santos', name: 'All Saints\' Day' },
            { id: '02nov', date: `${year}-11-02`, localName: 'Día de Muertos', name: 'Day of the Dead' },
            { id: '12dec', date: `${year}-12-12`, localName: 'Día de la Virgen de Guadalupe', name: 'Our Lady of Guadalupe' },
            { id: '24dec', date: `${year}-12-24`, localName: 'Nochebuena', name: 'Christmas Eve' },
            { id: '31dec', date: `${year}-12-31`, localName: 'Víspera de Año Nuevo', name: 'New Year\'s Eve' },
        ];
        return list.map(h => ({
            ...h,
            icono: resolveHolidayIcon(h.localName, typeIcon),
            selected: true
        }));
    };

    const fetchOfficialHolidays = async (year: number) => {
        try {
            setIsLoadingPreview(true);
            const typeIcon = eventTypes.find(t => t.TipoEventoId === 'DIA_FERIADO')?.Icono || 'Calendar';
            const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/MX`);
            if (response.ok) {
                const data = await response.json();
                setPreviewList(data.map((h: any, i: number) => ({
                    id: `off-${i}-${h.date}`,
                    date: h.date,
                    localName: h.localName,
                    name: h.name,
                    icono: resolveHolidayIcon(h.localName, typeIcon),
                    selected: true
                })));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingPreview(false);
        }
    };

    const resetList = () => {
        if (importTypeId === 'DIA_FERIADO') {
            fetchOfficialHolidays(importYear);
        } else if (importTypeId === 'INFORMATIVO') {
            setPreviewList(getUnofficialDays(importYear));
        } else {
            setPreviewList([]);
        }
    };

    useEffect(() => {
        if (isOpen && importTypeId) {
            resetList();
        } else if (!importTypeId) {
            setPreviewList([]);
        }
    }, [isOpen, importTypeId, importYear]);

    const toggleItemSelection = (id: string) => {
        setPreviewList(prev => prev.map(item =>
            item.id === id ? { ...item, selected: !item.selected } : item
        ));
    };

    const updateItemIcon = (id: string, newIcon: string) => {
        setPreviewList(prev => prev.map(item =>
            item.id === id ? { ...item, icono: newIcon } : item
        ));
    };

    const formatDisplayDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        return dateObj.toLocaleDateString('es-MX', {
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        });
    };

    const filteredTypes = useMemo(() =>
        eventTypes.filter(t => t.TipoEventoId === 'DIA_FERIADO' || t.TipoEventoId === 'INFORMATIVO'),
        [eventTypes]);

    const selectedCount = useMemo(() => previewList.filter(h => h.selected).length, [previewList]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => !isImporting && onClose()}
            title="Importar Eventos Masivos"
            size="lg"
            footer={
                <div className="flex items-center justify-end w-full gap-3">
                    <Button variant="secondary" onClick={onClose} disabled={isImporting}>Cancelar</Button>
                    <Button
                        onClick={() => onImportConfirmed(previewList.filter(h => h.selected))}
                        isLoading={isImporting}
                        disabled={isImporting || selectedCount === 0}
                    >
                        <CloudDownload size={16} /> Importar ({selectedCount})
                    </Button>
                </div>
            }
        >
            <div className="space-y-6 pt-2">
                <div className="grid grid-cols-[120px,1fr] gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                        <input
                            type="number"
                            min="2000" max="2100"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[--theme-500] transition hover:border-slate-300"
                            value={importYear}
                            onChange={e => setImportYear(Number(e.target.value))}
                            disabled={isImporting}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Categoría a Importar</label>
                        <SmartSelect
                            value={importTypeId}
                            options={filteredTypes.map(t => ({ value: t.TipoEventoId, title: t.Nombre }))}
                            onChange={(val: any) => setImportTypeId(val)}
                            placeholder="Selecciona categoría..."
                        />
                    </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/30">
                    <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarCheck2 className="text-slate-400" size={18} />
                            <span className="text-sm font-semibold text-slate-700">Vista Previa de Importación</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {selectedCount} Seleccionados
                            </span>
                            {previewList.length > 0 && (
                                <Tooltip text="Restablecer selección e iconos">
                                    <button
                                        onClick={resetList}
                                        className="p-1.5 text-slate-400 hover:text-[--theme-600] transition hover:bg-slate-100 rounded-lg"
                                    >
                                        <RotateCcw size={16} />
                                    </button>
                                </Tooltip>
                            )}
                        </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                        {isLoadingPreview ? (
                            <div className="py-20 text-center flex flex-col items-center gap-3">
                                <div className="w-8 h-8 border-4 border-[--theme-500]/30 border-t-[--theme-500] rounded-full animate-spin" />
                                <p className="text-xs text-slate-500">Cargando eventos...</p>
                            </div>
                        ) : previewList.length > 0 ? (
                            <div className="space-y-1.5">
                                {previewList.map((h) => (
                                    <div
                                        key={h.id}
                                        className={`group flex items-center justify-between p-2 pl-3 rounded-lg border transition-all ${h.selected
                                            ? 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                                            : 'bg-slate-50 opacity-60 grayscale-[0.5] border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                            {/* Icon Picker */}
                                            <div className={!h.selected ? 'pointer-events-none' : ''}>
                                                <IconPicker
                                                    value={h.icono}
                                                    onChange={(name) => updateItemIcon(h.id, name)}
                                                    compact
                                                />
                                            </div>

                                            <div
                                                className="flex flex-col cursor-pointer flex-1 overflow-hidden"
                                                onClick={() => toggleItemSelection(h.id)}
                                            >
                                                <span className={`text-sm font-semibold truncate transition-colors ${h.selected ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {h.localName}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[10px] font-mono font-bold py-0.5 px-1.5 rounded transition-colors ${h.selected ? 'bg-slate-100 text-slate-500' : 'bg-slate-200 text-slate-400'
                                                        } capitalize whitespace-nowrap`}>
                                                        {formatDisplayDate(h.date)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 italic truncate">{h.name}</span>
                                                </div>
                                            </div>

                                            {/* Selection Toggle (moved to right) */}
                                            <Tooltip text={h.selected ? 'No importar este evento' : 'Incluir en la importación'}>
                                                <button
                                                    onClick={() => toggleItemSelection(h.id)}
                                                    className={`p-2 transition-colors shrink-0 ${h.selected ? 'text-[--theme-500]' : 'text-slate-300'}`}
                                                >
                                                    {h.selected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                </button>
                                            </Tooltip>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-20 text-center flex flex-col items-center gap-3">
                                {importTypeId ? (
                                    <>
                                        <AlertCircle className="text-slate-300" size={40} />
                                        <p className="text-sm text-slate-400">No hay eventos en esta categoría para {importYear}</p>
                                    </>
                                ) : (
                                    <>
                                        <Info className="text-slate-300" size={40} />
                                        <p className="text-sm text-slate-400">Seleccione una categoría para ver la previsualización</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                        Los eventos que ya existan en el calendario para las mismas fechas no serán duplicados.
                        A continuación puede personalizar qué eventos traer y qué icono asignarles.
                    </p>
                </div>
            </div>
        </Modal>
    );
};
