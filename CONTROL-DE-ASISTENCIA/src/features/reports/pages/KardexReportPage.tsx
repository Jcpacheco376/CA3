// src/features/reports/pages/KardexReportPage.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Search, FileSpreadsheet, FileText, ChevronDown, ChevronUp,
    MessageSquare, AlertCircle, ShieldAlert, Clock, CheckCircle2,
    Play, Loader2, Building, Briefcase, Tag, MapPin,
    ArrowUpDown, ArrowUp, ArrowDown, Contact
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { PayrollGuardModal } from '../components/PayrollGuardModal';
import { format } from 'date-fns'; // Se eliminaron imports de fechas que ya no se usan directamente
import { es } from 'date-fns/locale';

// --- IMPORTACIONES DEL MOTOR DE REPORTES ---
import { exportToExcel } from '../../../utils/reportExporter';
import { BaseReportGenerator, ReportThemeKey, ReportLayoutKey } from '../../../utils/report-engine/CoreReportGenerator';
import {
    KardexStandardReport,
    KardexCompactReport,
    KardexExecutiveReport
} from '../definitions/KardexVariants';
import { PDFPreviewModal } from '../../../components/ui/PDFPreviewModal';

// --- IMPORTACIONES DE REGLAS Y COMPONENTES ---
import { ReportValidators } from '../definitions/ReportRules';
import { AttendanceToolbar, FilterConfig } from '../../attendance/AttendanceToolbar';
import { EmployeeProfileModal } from '../../attendance/EmployeeProfileModal';
// IMPORTACIÓN DEL HOOK COMPARTIDO
import { useSharedAttendance } from '../../../hooks/useSharedAttendance';

// --- INTERFACES ---
interface FichaData {
    Fecha: string;
    HoraEntrada: string | null;
    HoraSalida: string | null;
    EstatusManualAbrev: string;
    EstatusChecadorAbrev: string;
    Comentarios: string;
    IncidenciaActivaId: number | null;
    Clasificacion: 'A' | 'F' | 'R' | 'D' | 'O'; // <--- Campo único
}

interface EmpleadoKardex {
    empleadoId: number;
    nombre: string;
    codRef: string;
    departamento: string;
    puesto: string;
    fichas: FichaData[];
}

// Tipo para el ordenamiento
type SortKey = 'empleadoId' | 'nombre' | 'departamento' | 'puesto';
type SortDirection = 'asc' | 'desc';

const safeDate = (dateString: string) => {
    if (!dateString) return new Date();
    const parts = dateString.substring(0, 10).split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

export const KardexReportPage = () => {
    const { getToken, user, can } = useAuth();

    // --- USO DEL HOOK COMPARTIDO ---
    // Reemplaza los estados locales de filtros, fechas y modo de vista
    const {
        filters, setFilters,
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        dateRange, rangeLabel,
        handleDatePrev, handleDateNext
    } = useSharedAttendance(user);

    // Estados Locales (Propios de esta página)
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<EmpleadoKardex[]>([]);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

    // Estados de Validación y PDF
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
    const [pendingFilters, setPendingFilters] = useState<any>(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const reportBuilderRef = useRef<BaseReportGenerator | null>(null);

    // Estado de Ordenamiento
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'nombre',
        direction: 'asc'
    });

    // Limpieza automática al cambiar filtros (usando los datos del hook)
    useEffect(() => {
        if (reportData.length > 0 || validationResult) {
            setReportData([]);
            setValidationResult(null);
            setExpandedRows([]);
        }
    }, [dateRange, filters]);

    // --- MANEJADORES DE UI ---
    const toggleRow = (empleadoId: number) => {
        setExpandedRows(prev => prev.includes(empleadoId) ? prev.filter(id => id !== empleadoId) : [...prev, empleadoId]);
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // --- CARGA DE DATOS ---
    const handleGenerateClick = async () => {
        if (!dateRange || dateRange.length === 0) return;

        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        // Objeto completo con filtros
        // NOTA: dateRange viene del hook como Date[], usamos el primero y el último
        const activeFilters = {
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'),
            filters: {
                departamentos: filters.depts,
                gruposNomina: filters.groups,
                puestos: filters.puestos,
                establecimientos: filters.estabs
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}/reports/validate-period`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(activeFilters)
            });

            if (!response.ok) throw new Error('Error al validar periodo.');
            const result = await response.json();

            setValidationResult(result);
            setPendingFilters(activeFilters);
            setIsGuardModalOpen(true);

        } catch (err: any) {
            console.error(err);
            setPendingFilters(activeFilters);
            handleConfirmGeneration();
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmGeneration = async () => {
        setIsGuardModalOpen(false);
        setIsLoading(true);
        const token = getToken();

        try {
            const response = await fetch(`${API_BASE_URL}/reports/kardex`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(pendingFilters)
            });

            if (!response.ok) throw new Error('Error al generar el reporte.');
            const data = await response.json();
            setReportData(data);
            setExpandedRows([]);
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // --- DATOS PROCESADOS (SORT & FILTER) ---
    const processedReportData = useMemo(() => {
        let data = reportData;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(emp =>
                emp.nombre.toLowerCase().includes(term) ||
                emp.codRef.toLowerCase().includes(term)
            );
        }
        return [...data].sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [reportData, searchTerm, sortConfig]);

    // --- EXPORTACIONES ---
    const handleExportExcel = () => {
        if (processedReportData.length === 0) return;
        const flatData = processedReportData.flatMap(emp =>
            emp.fichas.map(f => ({
                'ID Empleado': emp.codRef, 'Nombre': emp.nombre, 'Departamento': emp.departamento, 'Puesto': emp.puesto,
                'Fecha': format(safeDate(f.Fecha), 'yyyy-MM-dd'), 'Día': format(new Date(f.Fecha), 'EEEE', { locale: es }),
                'Hora Entrada': f.HoraEntrada ? format(new Date(f.HoraEntrada), 'HH:mm') : '',
                'Hora Salida': f.HoraSalida ? format(new Date(f.HoraSalida), 'HH:mm') : '',
                'Estatus Oficial': f.EstatusManualAbrev || '(Pendiente)', 'Comentarios': f.Comentarios
            }))
        );
        exportToExcel('Kardex_Asistencia', 'Registros', flatData);
    };

    const generateReport = (settings: { theme: ReportThemeKey, layout: ReportLayoutKey }) => {
        if (processedReportData.length === 0 || !pendingFilters) return;

        const config = {
            title: "Kardex de Asistencia",
            subTitle: `Periodo: ${pendingFilters.startDate} al ${pendingFilters.endDate}`,
            filtersText: "Filtros: Departamentos y Puestos activos"
        };

        let generator: BaseReportGenerator;
        switch (settings.layout) {
            case 'compact': generator = new KardexCompactReport(settings.theme, config); break;
            case 'executive': generator = new KardexExecutiveReport(settings.theme, config); break;
            case 'standard': default: generator = new KardexStandardReport(settings.theme, config); break;
        }

        generator.generateContent(processedReportData);
        reportBuilderRef.current = generator;
        setPreviewPdfUrl(generator.getBlobUrl());
    };

    const handleInitialPreview = () => {
        generateReport({ theme: 'corporate', layout: 'standard' });
        setIsPreviewOpen(true);
    };

    const handleSaveFromPreview = (saveAs: boolean) => {
        if (reportBuilderRef.current) {
            const fileName = `Kardex_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            saveAs ? reportBuilderRef.current.saveWithDialog(fileName) : reportBuilderRef.current.save(fileName);
        }
    };

    // --- RENDERIZADO VISUAL ---
    const getStatusStyle = (abrev: string) => {
        const styles: { [key: string]: string } = { 'A': 'bg-green-100 text-green-700 border-green-200', 'F': 'bg-red-100 text-red-700 border-red-200', 'RET': 'bg-orange-100 text-orange-700 border-orange-200', 'D': 'bg-slate-100 text-slate-500 border-slate-200' };
        return styles[abrev] || 'bg-gray-50 text-gray-600 border-gray-200';
    };

    const renderStatusCell = (ficha: any) => {
        const validation = ReportValidators.kardex(ficha);
        if (validation.status === 'pending_approval') {
            return (
                <Tooltip text="Ficha automática no aprobada manualmente.">
                    <span className="flex items-center justify-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2 py-1 rounded-full border border-amber-200 ">
                        <Clock size={12} /> Auto: {ficha.EstatusChecadorAbrev || '?'}
                    </span>
                </Tooltip>
            );
        }
        if (validation.status === 'incident') {
            return (
                <div className="flex flex-col items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border mb-0.5 ${getStatusStyle(ficha.EstatusManualAbrev)}`}>{ficha.EstatusManualAbrev}</span>
                    <span className="text-[9px] text-purple-500 font-semibold flex items-center gap-0.5"><ShieldAlert size={8} /> Incidencia</span>
                </div>
            );
        }
        if (validation.status === 'missing_data') return <span className="text-slate-300 text-xs italic">- Sin Datos -</span>;
        return <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusStyle(ficha.EstatusManualAbrev)}`}>{ficha.EstatusManualAbrev} <CheckCircle2 size={8} className="inline ml-0.5 text-green-600/50" /></span>;
    };

    const getSortIcon = (key: SortKey) => sortConfig.key !== key ? <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" /> : (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />);

    const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
        <th className={`p-3 text-left font-semibold text-slate-600 cursor-pointer group select-none hover:bg-slate-100 transition-colors ${className}`} onClick={() => handleSort(sortKey)}>
            <div className="flex items-center gap-2">{label} {getSortIcon(sortKey)}</div>
        </th>
    );

    const filterConfigurations: FilterConfig[] = useMemo(() => [
        { id: 'depts', title: 'Deptos', icon: <Building />, options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [], selectedValues: filters.depts, onChange: v => setFilters(f => ({ ...f, depts: v as number[] })), isActive: user?.activeFilters?.departamentos ?? false },
        { id: 'groups', title: 'Grupos', icon: <Briefcase />, options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [], selectedValues: filters.groups, onChange: v => setFilters(f => ({ ...f, groups: v as number[] })), isActive: user?.activeFilters?.gruposNomina ?? false },
        { id: 'puestos', title: 'Puestos', icon: <Tag />, options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [], selectedValues: filters.puestos, onChange: v => setFilters(f => ({ ...f, puestos: v as number[] })), isActive: user?.activeFilters?.puestos ?? false },
        { id: 'estabs', title: 'Estabs', icon: <MapPin />, options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [], selectedValues: filters.estabs, onChange: v => setFilters(f => ({ ...f, estabs: v as number[] })), isActive: user?.activeFilters?.establecimientos ?? false },
    ].filter(c => c.isActive), [user, filters]);

    return (
        <div className="space-y-6 animate-fade-in pb-10 h-full flex flex-col">

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h2 className="text-2xl font-bold text-slate-800">Kardex de Asistencia</h2><p className="text-slate-500 text-sm">Historial detallado y validación de registros.</p></div>
                <button onClick={handleGenerateClick} disabled={isLoading} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md ${isLoading ? 'opacity-70' : ''}`}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} {isLoading ? 'Analizando...' : 'Generar Reporte'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <AttendanceToolbar
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterConfigurations={filterConfigurations}
                    viewMode={viewMode} setViewMode={setViewMode} rangeLabel={rangeLabel}
                    handleDatePrev={handleDatePrev} handleDateNext={handleDateNext}
                    currentDate={currentDate} onDateChange={setCurrentDate}
                    showSearch={true} 
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col overflow-hidden flex-1">
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Resultados {processedReportData.length > 0 && <span className="ml-1 text-slate-400 font-normal">({processedReportData.length} registros)</span>}</h3>
                    <div className="flex gap-2">
                        <Tooltip text="Excel"><button onClick={handleExportExcel} disabled={processedReportData.length === 0} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 transition-colors"><FileSpreadsheet size={18} /></button></Tooltip>
                        <Tooltip text="PDF"><button onClick={handleInitialPreview} disabled={processedReportData.length === 0} className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 transition-colors"><FileText size={18} /></button></Tooltip>
                    </div>
                </div>

                <div className="flex-grow overflow-auto bg-slate-50/50">
                    {processedReportData.length === 0 && !isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400"><Search size={48} className="mb-4 opacity-20" /><p className="text-sm">Configura el periodo y genera el reporte.</p></div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <SortableHeader label="ID" sortKey="empleadoId" className="w-24 font-mono" />
                                    <SortableHeader label="Empleado" sortKey="nombre" />
                                    <SortableHeader label="Departamento" sortKey="departamento" className="hidden md:table-cell" />
                                    <SortableHeader label="Puesto" sortKey="puesto" className="hidden md:table-cell" />
                                    <th className="p-3 text-center w-24 text-green-600">Asist.</th>
                                    <th className="p-3 text-center w-24 text-red-600">Faltas</th>
                                    <th className="p-3 text-center w-24 text-orange-500">Retardos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {processedReportData.map(emp => {
                                    const isExpanded = expandedRows.includes(emp.empleadoId);
                                    console.log('Empleado:', emp.fichas)
                                    const asistencias = emp.fichas.filter(f => ['A'].includes(f.Clasificacion)).length;
                                    const faltas = emp.fichas.filter(f => f.Clasificacion === 'F').length;
                                    const retardos = emp.fichas.filter(f => f.Clasificacion === 'R').length;

                                    const pendingCount = emp.fichas.filter(f => ReportValidators.kardex(f).status === 'pending_approval').length;
                                    const incidentCount = emp.fichas.filter(f => ReportValidators.kardex(f).status === 'incident').length;
                                    const isAllGood = pendingCount === 0 && incidentCount === 0;

                                    return (
                                        <React.Fragment key={emp.empleadoId}>
                                            <tr onClick={() => toggleRow(emp.empleadoId)} className={`cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-3 text-center text-slate-400">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                                                <td className="p-3 font-mono text-slate-500">{emp.codRef}</td>
                                                <td className="p-3 font-medium text-slate-800">
                                                    <div className="flex items-center gap-2 group/name">
                                                        {/* Círculo Verde (Limpio) */}
                                                        {isAllGood && (
                                                            <Tooltip text="Sin problemas de configuración">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></div>
                                                            </Tooltip>
                                                        )}
                                                        {pendingCount > 0 && <Tooltip text={`${pendingCount} días pendientes de validación`}><div className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100 animate-pulse"></div></Tooltip>}
                                                        {incidentCount > 0 && <Tooltip text={`${incidentCount} incidencias`}><div className="w-2 h-2 rounded-full bg-purple-500 ring-2 ring-purple-100"></div></Tooltip>}

                                                        {emp.nombre}
                                                        <Tooltip text="Ver Ficha">
                                                            <button onClick={(e) => { e.stopPropagation(); setViewingEmployeeId(emp.empleadoId); }} className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full opacity-0 group-hover/name:opacity-100 transition-opacity">
                                                                <Contact size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                                <td className="p-3 hidden md:table-cell text-slate-500 truncate max-w-[150px]">{emp.departamento}</td>
                                                <td className="p-3 hidden md:table-cell text-slate-500 truncate max-w-[150px]">{emp.puesto}</td>
                                                <td className="p-3 text-center font-bold text-slate-700 bg-green-50/50">{asistencias}</td>
                                                <td className="p-3 text-center font-bold text-slate-700 bg-red-50/50">{faltas}</td>
                                                <td className="p-3 text-center font-bold text-slate-700 bg-orange-50/50">{retardos}</td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50 shadow-inner">
                                                    <td colSpan={8} className="p-0">
                                                        <div className="p-4 pl-12 animate-slide-down">
                                                            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b">
                                                                        <tr><th className="p-2 pl-4 text-left">Fecha</th><th className="p-2 text-center">Entrada</th><th className="p-2 text-center">Salida</th><th className="p-2 text-center">Estatus</th><th className="p-2 w-1/3">Observaciones / Incidencias</th></tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {emp.fichas.map((ficha, idx) => (
                                                                            <tr key={idx} className="hover:bg-slate-50/80">
                                                                                <td className="p-2 pl-4 font-medium text-slate-700 capitalize border-r border-slate-100">{format(safeDate(ficha.Fecha), 'EEE d MMM', { locale: es })}</td>
                                                                                <td className="p-2 text-center font-mono text-slate-600">{ficha.HoraEntrada ? format(new Date(ficha.HoraEntrada), 'HH:mm') : '--'}</td>
                                                                                <td className="p-2 text-center font-mono text-slate-600">{ficha.HoraSalida ? format(new Date(ficha.HoraSalida), 'HH:mm') : '--'}</td>
                                                                                <td className="p-2 text-center">{renderStatusCell(ficha)}</td>
                                                                                <td className="p-2 text-slate-500">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        {ficha.Comentarios && <span className="flex items-start gap-1"><MessageSquare size={12} className="mt-0.5 shrink-0" /> <span className="italic">"{ficha.Comentarios}"</span></span>}
                                                                                        {ficha.IncidenciaActivaId && <span className="flex items-center gap-1 text-purple-600 font-semibold bg-purple-50 px-1.5 py-0.5 rounded w-fit"><ShieldAlert size={10} /> Discrepancia #{ficha.IncidenciaActivaId}</span>}
                                                                                        {ReportValidators.kardex(ficha).status === 'pending_approval' && <span className="text-[10px] text-amber-600 flex items-center gap-1"><AlertCircle size={10} /> Pendiente de validar</span>}
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <PayrollGuardModal
                isOpen={isGuardModalOpen} onClose={() => setIsGuardModalOpen(false)}
                onConfirm={handleConfirmGeneration} validation={validationResult} canOverride={can('nomina.override')}
                reportType="kardex"
            />

            <PDFPreviewModal
                isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} pdfUrl={previewPdfUrl}
                title="Kardex de Asistencia" fileName={`Kardex_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                onSettingsChange={generateReport} onSave={handleSaveFromPreview}
                allowedLayouts={['standard', 'compact', 'executive']}
            />

            {viewingEmployeeId && <EmployeeProfileModal employeeId={viewingEmployeeId as any} onClose={() => setViewingEmployeeId(null)} getToken={getToken} user={user} />}
        </div>
    );
};