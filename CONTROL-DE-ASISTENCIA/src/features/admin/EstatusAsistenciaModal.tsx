// src/features/admin/EstatusAsistenciaModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui/Modal';
import { AttendanceStatus } from '../../types/index';
import { Tooltip } from '../../components/ui/Tooltip';
import { statusColorPalette } from '../../config/theme';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { Calculator, Settings2, Banknote } from 'lucide-react';
import { SmartSelect } from '../../components/ui/SmartSelect'; // Ajusta la ruta según donde guardes el componente

// --- Componentes Auxiliares ---
const FichaPreview = ({ abreviatura, colorUI }: { abreviatura: string, colorUI: string }) => {
    const { bgText, border } = statusColorPalette[colorUI] || statusColorPalette.slate;
    return (
        <div className="space-y-2 text-center">
            <label className="block text-sm font-medium text-slate-700">Vista Previa</label>
            <div className={`relative w-24 h-16 mx-auto rounded-md font-bold text-lg flex items-center justify-center transition-all duration-200 border-b-4 ${border}`}>
                <div className={`w-full h-full rounded-md ${bgText} bg-opacity-90 flex items-center justify-center shadow-inner-sm`}>
                    {abreviatura || '?'}
                </div>
            </div>
        </div>
    );
};

const Toggle = ({ enabled, onChange }: { enabled: boolean, onChange: (enabled: boolean) => void }) => (
    <button type="button" onClick={() => onChange(!enabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none ${enabled ? 'bg-[--theme-500]' : 'bg-gray-200'}`}>
        <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const formatTitle = (id: string) => {
    if (!id) return 'Seleccionar...';
    return id.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

export const EstatusAsistenciaModal = ({ isOpen, onClose, onSave, status }: { isOpen: boolean; onClose: () => void; onSave: (status: AttendanceStatus) => void; status: AttendanceStatus | null; }) => {
    const { getToken } = useAuth();
    const [formData, setFormData] = useState<Partial<AttendanceStatus>>({});
    
    // Estados para Catálogos
    const [calculationTypes, setCalculationTypes] = useState<{ TipoCalculoId: string, Descripcion: string }[]>([]);
    const [payrollConcepts, setPayrollConcepts] = useState<{ ConceptoId: number, Nombre: string, CodRef: string }[]>([]);
    const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(false);

    const isNew = !status?.EstatusId;

    // Cargar catálogos
    useEffect(() => {
        const fetchCatalogs = async () => {
            if (!isOpen) return;
            setIsLoadingCatalogs(true);
            try {
                const token = getToken();
                const headers = { 'Authorization': `Bearer ${token}` };
                const [calcRes, payrollRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/catalogs/calculation-types`, { headers }),
                    fetch(`${API_BASE_URL}/catalogs/payroll-concepts`, { headers })
                ]);
                if (calcRes.ok) setCalculationTypes(await calcRes.json());
                if (payrollRes.ok) setPayrollConcepts(await payrollRes.json());
            } catch (error) {
                console.error("Error cargando catálogos", error);
            } finally {
                setIsLoadingCatalogs(false);
            }
        };
        fetchCatalogs();
    }, [isOpen, getToken]);

    // Inicializar Formulario
    useEffect(() => {
        if (isOpen) {
            if (status) {
                setFormData(status);
            } else {
                setFormData({
                    Abreviatura: '', Descripcion: '', ColorUI: 'slate', ValorNomina: 1.00,
                    VisibleSupervisor: true, Activo: true,
                    TipoCalculoId: '',
                    ConceptoNominaId: undefined,
                    DiasRegistroFuturo: 0, PermiteComentario: false,
                    Esdefault: false
                });
            }
        }
    }, [status, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        let val: string | number | null = value;
        if (type === 'number') {
            if (value === '') val = null;
            else if (name === 'ValorNomina') val = parseFloat(value);
            else val = parseInt(value, 10);
        }
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const handleToggleChange = (name: keyof AttendanceStatus, value: boolean) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData as AttendanceStatus);
    };

    const footer = (
        <>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button type="submit" form="status-modal-form" disabled={!formData.TipoCalculoId}>Guardar</Button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isNew ? 'Crear Estatus de Asistencia' : 'Editar Estatus de Asistencia'} footer={footer} size="xl">
            <form id="status-modal-form" onSubmit={handleSubmit} className="space-y-6">

                {/* --- SECCIÓN 1: DATOS GENERALES --- */}
                <div className="flex gap-6 items-start">
                    <div className="w-1/3">
                        <FichaPreview abreviatura={formData.Abreviatura || ''} colorUI={formData.ColorUI || 'slate'} />
                    </div>
                    <div className="w-2/3">
                        <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1">
                                <Tooltip text="Código corto (ej: 'A', 'VAC'). Max 5 chars.">
                                    <label className="block text-sm font-medium text-slate-700">Abreviatura</label>
                                </Tooltip>
                                <input type="text" name="Abreviatura" value={formData.Abreviatura || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500]" required maxLength={5} autoFocus />
                            </div>
                            <div className="col-span-3">
                                <label className="block text-sm font-medium text-slate-700">Descripción</label>
                                <input type="text" name="Descripcion" value={formData.Descripcion || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500]" required />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SECCIÓN 2: COLOR --- */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Color de Interfaz</label>
                    <div className="flex flex-wrap gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        {Object.keys(statusColorPalette).map((colorName) => (
                            <button
                                key={colorName}
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, ColorUI: colorName }))}
                                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none ring-offset-2 ${formData.ColorUI === colorName ? `ring-2 ring-[--theme-500] scale-110` : ''} ${statusColorPalette[colorName].main}`}
                                title={colorName}
                            />
                        ))}
                    </div>
                </div>

                {/* --- SECCIÓN 3: CONFIGURACIÓN LÓGICA --- */}
                <div className="border-t pt-6">
                    <h3 className="text-md font-bold text-slate-800 mb-4">Configuración de Comportamiento</h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        
                        {/* COLUMNA 1: LÓGICA Y NÓMINA */}
                        <div className="space-y-6">

                            {/* 1. CÁLCULO AUTOMÁTICO */}
                            <SmartSelect
                                label={
                                    <Tooltip text="Define cómo el sistema interpreta este estatus para cálculos.">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Cálculo Automático <span className="text-red-500">*</span>
                                        </label>
                                    </Tooltip>
                                }
                                value={formData.TipoCalculoId}
                                options={calculationTypes.map(t => ({
                                    value: t.TipoCalculoId,
                                    title: formatTitle(t.TipoCalculoId),
                                    subtitle: t.Descripcion,
                                }))}
                                onChange={(val) => setFormData(prev => ({ ...prev, TipoCalculoId: val as string }))}
                                isLoading={isLoadingCatalogs}
                                placeholder="Seleccionar..."
                                loadingText="Cargando..."
                                buttonIcon={Calculator}
                                itemIcon={Settings2}
                                colorScheme="primary"
                                showButtonSubtitle={false}
                                maxHeightClass="max-h-72"
                            />

                            {/* 2. CONCEPTO NÓMINA */}
                            <SmartSelect
                                label={
                                    <Tooltip text="Concepto contable para el reporte de prenómina.">
                                        <label className="block text-sm font-medium text-slate-700">
                                            Concepto Nómina
                                        </label>
                                    </Tooltip>
                                }
                                value={formData.ConceptoNominaId}
                                options={payrollConcepts.map(c => ({
                                    value: c.ConceptoId,
                                    title: c.CodRef,
                                    subtitle: c.Nombre,
                                }))}
                                onChange={(val) => setFormData(prev => ({ ...prev, ConceptoNominaId: val as number | undefined }))}
                                isLoading={isLoadingCatalogs}
                                placeholder="Sin Concepto Asignado"
                                loadingText="..."
                                buttonIcon={Banknote}
                                itemIcon={Banknote}
                                colorScheme="emerald"
                                includeNoneOption={true}
                                noneLabel="Ninguno / Sin Efecto en Nómina"
                                maxHeightClass="max-h-60"
                            />

                            {/* 3. VALOR NÓMINA */}
                            <div>
                                <Tooltip text="Factor multiplicador: 1.0 = Día Completo, 0.5 = Medio Día, 0.0 = Sin Pago.">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Valor / Factor Nómina</label>
                                </Tooltip>
                                <input type="number" name="ValorNomina" value={formData.ValorNomina ?? 0} onChange={handleChange} className="w-24 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[--theme-500] text-center font-semibold" step="0.1" min="0" max="3" />
                                <span className="text-slate-500 text-sm ml-2">días/unidad</span>
                            </div>
                        </div>

                        {/* COLUMNA 2: REGLAS DE NEGOCIO */}
                        <div className="space-y-4 border-l pl-6 border-slate-100">
                            <div className="flex items-center justify-between">
                                <Tooltip text="Visible para asignación manual por supervisores."><span className="font-medium text-slate-700">Asignable Manualmente</span></Tooltip>
                                <Toggle enabled={formData.VisibleSupervisor || false} onChange={(val) => handleToggleChange('VisibleSupervisor', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Habilita el campo de comentarios (opcional) al asignar.">
                                    <span className="font-medium text-slate-700">Permite Comentario</span>
                                </Tooltip>
                                <Toggle enabled={formData.PermiteComentario || false} onChange={(val) => handleToggleChange('PermiteComentario', val)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Tooltip text="Disponible para uso general."><span className="font-medium text-slate-700">Estatus Activo</span></Tooltip>
                                <Toggle enabled={formData.Activo !== false} onChange={(val) => handleToggleChange('Activo', val)} />
                            </div>
                            
                            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                                <Tooltip text="Días a futuro permitidos (0 = Solo hoy/pasado).">
                                    <span className="text-sm font-medium text-slate-700">Días Registro Futuro</span>
                                </Tooltip>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        name="DiasRegistroFuturo"
                                        value={formData.DiasRegistroFuturo ?? 0}
                                        onChange={handleChange}
                                        className="w-16 p-1 border border-slate-300 rounded-md text-center text-sm focus:outline-none focus:ring-1 focus:ring-[--theme-500]"
                                        min="0"
                                    />
                                    <span className="text-xs text-slate-500">días</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </Modal>
    );
};