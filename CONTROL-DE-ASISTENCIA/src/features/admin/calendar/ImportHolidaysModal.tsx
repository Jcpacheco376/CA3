// src/features/admin/calendar/ImportHolidaysModal.tsx
import React from 'react';
import { CloudDownload } from 'lucide-react';
import { Modal, Button } from '../../../components/ui/Modal';
import { SmartSelect } from '../../../components/ui/SmartSelect';
import { EventType } from './types';

interface ImportHolidaysModalProps {
    isOpen: boolean;
    onClose: () => void;
    importYear: number;
    setImportYear: (y: number) => void;
    importTypeId: string;
    setImportTypeId: (id: string) => void;
    isImporting: boolean;
    handleImportHolidays: (e: React.FormEvent) => void;
    eventTypes: EventType[];
}

export const ImportHolidaysModal: React.FC<ImportHolidaysModalProps> = ({
    isOpen, onClose, importYear, setImportYear, importTypeId, setImportTypeId,
    isImporting, handleImportHolidays, eventTypes
}) => {
    return (
        <Modal
            isOpen={isOpen}
            onClose={() => !isImporting && onClose()}
            title="Importar Festivos Oficiales"
            size="md"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose} disabled={isImporting}>Cancelar</Button>
                    <Button type="submit" form="import-holidays-form" isLoading={isImporting} disabled={isImporting}>
                        <CloudDownload size={16} /> Importar
                    </Button>
                </>
            }
        >
            <form id="import-holidays-form" onSubmit={handleImportHolidays} className="space-y-4 pt-2">
                <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    Esta herramienta se conecta a una base de datos pública y obtendrá todos los días de asueto oficiales para México en el año seleccionado.
                </p>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Año</label>
                        <input
                            type="number" required
                            min="2000" max="2100"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-[--theme-500] transition hover:border-slate-300"
                            value={importYear}
                            onChange={e => setImportYear(Number(e.target.value))}
                            disabled={isImporting}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Asignar como (Tipo de Evento)</label>
                    <SmartSelect
                        value={importTypeId}
                        options={eventTypes.map(t => ({ value: t.TipoEventoId, title: t.Nombre }))}
                        onChange={(val: any) => setImportTypeId(val)}
                        placeholder="Selecciona el tipo de evento..."
                    />
                    <p className="text-xs text-slate-500 mt-1.5 ml-1">
                        Se recomienda seleccionar un tipo que exente la asistencia, como "Feriado Oficial".
                    </p>
                </div>
            </form>
        </Modal>
    );
};
