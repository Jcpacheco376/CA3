// src/features/reports/pages/AttendanceListReportPage.tsx
import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
    Search, FileSpreadsheet, Download, ChevronDown, ChevronUp,
    Clock, ArrowUpDown, ArrowUp, ArrowDown, Play, Loader2,
    Building, Briefcase, Tag, MapPin,
    Contact, ShieldAlert, CalendarOff, Timer // Iconos necesarios
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { PayrollGuardModal } from '../components/PayrollGuardModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { exportToExcel } from '../../../utils/reportExporter';
import { BaseReportGenerator, ReportThemeKey, ReportLayoutKey } from '../../../utils/report-engine/CoreReportGenerator';
import {
    AttendanceStandardReport,
    AttendanceSignatureReport,
    AttendanceCompactReport
} from '../definitions/AttendanceListVariants';
import { PDFPreviewModal } from '../../../components/ui/PDFPreviewModal';
import { AttendanceToolbar, FilterConfig } from '../../attendance/AttendanceToolbar';
import { ReportValidators } from '../definitions/ReportRules';
import { EmployeeProfileModal } from '../../attendance/EmployeeProfileModal';
// IMPORTACIÓN DEL HOOK COMPARTIDO
import { useSharedAttendance } from '../../../hooks/useSharedAttendance';

// --- TIPOS ---
interface FichaData {
    Fecha: string;
    HoraEntrada: string | null;
    HoraSalida: string | null;
    EstatusManualAbrev: string;
    EstatusChecadorAbrev: string;
    IncidenciaActivaId: number | null;
    HorarioId: number | null;
    HorasTrabajadas: number;
}

interface EmpleadoReporte {
    empleadoId: number;
    nombre: string;
    codRef: string;
    departamento: string;
    puesto: string;
    totalHoras: string;
    fichas: FichaData[];
}

type SortKey = 'empleadoId' | 'nombre' | 'departamento' | 'puesto';
type SortDirection = 'asc' | 'desc';

// Helper de Fechas
const safeDate = (dateString: string) => {
    if (!dateString) return new Date();
    const parts = dateString.substring(0, 10).split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

export const AttendanceListReportPage = () => {
    const { getToken, user, can } = useAuth();

    // --- USO DEL HOOK COMPARTIDO ---
    // Reemplaza toda la gestión de estado local para filtros y fechas
    const { 
        filters, setFilters, 
        viewMode, setViewMode, 
        currentDate, setCurrentDate, 
        dateRange, rangeLabel, 
        handleDatePrev, handleDateNext 
    } = useSharedAttendance(user);

    // --- ESTADOS LOCALES (Propios de la página) ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<EmpleadoReporte[]>([]);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'nombre', direction: 'asc' });
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

    const [validationResult, setValidationResult] = useState<any>(null);
    const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
    const [pendingFilters, setPendingFilters] = useState<any>(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const reportBuilderRef = useRef<BaseReportGenerator | null>(null);

    // Limpieza automática al cambiar filtros (usando los datos del hook)
    useEffect(() => {
        if (reportData.length > 0) { setReportData([]); setExpandedRows([]); setValidationResult(null); }
    }, [dateRange, filters]);

    // --- MANEJADORES ---
    const toggleRow = (id: number) => setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    const handleSort = (key: SortKey) => setSortConfig(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));

    // --- CARGA DE DATOS ---
    const handleGenerateClick = async () => {
        if (!dateRange || dateRange.length === 0) return;

        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        // Construcción del objeto de filtros para la API
        const activeFilters = {
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'),
            filters: { departamentos: filters.depts, gruposNomina: filters.groups, puestos: filters.puestos, establecimientos: filters.estabs }
        };

        try {
            const response = await fetch(`${API_BASE_URL}/reports/validate-period`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(activeFilters) // Enviamos filtros completos
            });
            if (!response.ok) throw new Error('Error validando.');
            setValidationResult(await response.json());
            setPendingFilters(activeFilters);
            setIsGuardModalOpen(true);
        } catch (err) { setPendingFilters(activeFilters); handleConfirmGeneration(); } finally { setIsLoading(false); }
    };

    const handleConfirmGeneration = async () => {
        setIsGuardModalOpen(false);
        setIsLoading(true);
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/reports/attendance-list`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(pendingFilters)
            });
            if (!response.ok) throw new Error('Error generando reporte.');
            setReportData(await response.json());
            setExpandedRows([]);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    };

    // --- PROCESAMIENTO ---
    const processedData = useMemo(() => {
        let data = reportData;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            data = data.filter(e => e.nombre.toLowerCase().includes(term) || e.codRef.toLowerCase().includes(term));
        }
        return [...data].sort((a, b) => {
            const valA = a[sortConfig.key]; const valB = b[sortConfig.key];
            if (typeof valA === 'string' && typeof valB === 'string') return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [reportData, searchTerm, sortConfig]);

    // --- EXPORT ---
    const handleExportExcel = () => {
        if (processedData.length === 0) return;
        const flat = processedData.flatMap(emp => emp.fichas.map(f => ({
            'ID': emp.codRef, 'Empleado': emp.nombre, 'Puesto': emp.puesto,
            'Fecha': format(safeDate(f.Fecha), 'yyyy-MM-dd'),
            'Entrada': f.HoraEntrada ? format(new Date(f.HoraEntrada), 'HH:mm') : '',
            'Salida': f.HoraSalida ? format(new Date(f.HoraSalida), 'HH:mm') : '',
            'Horas': f.HorasTrabajadas,
            'Estatus': f.EstatusManualAbrev || f.EstatusChecadorAbrev || '-'
        })));
        exportToExcel('Lista_Asistencia', 'Asistencia', flat);
    };

    const generatePDF = (settings: { theme: ReportThemeKey, layout: ReportLayoutKey }) => {
        if (processedData.length === 0 || !pendingFilters) return;
        const config = { title: "Lista de Asistencia", subTitle: `Periodo: ${pendingFilters.startDate} al ${pendingFilters.endDate}`, filtersText: "Reporte Operativo" };

        let generator: BaseReportGenerator;
        switch (settings.layout) {
            case 'compact': generator = new AttendanceCompactReport(settings.theme, config); break;
            case 'signature': generator = new AttendanceSignatureReport(settings.theme, config); break;
            case 'standard': default: generator = new AttendanceStandardReport(settings.theme, config); break;
        }
        generator.generateContent(processedData);
        reportBuilderRef.current = generator;
        setPreviewPdfUrl(generator.getBlobUrl());
    };

    const handleInitialPreview = () => { generatePDF({ theme: 'corporate', layout: 'standard' }); setIsPreviewOpen(true); };
    const handleSavePDF = (saveAs: boolean) => reportBuilderRef.current && (saveAs ? reportBuilderRef.current.saveWithDialog(`Lista_${format(new Date(), 'yyyyMMdd')}.pdf`) : reportBuilderRef.current.save(`Lista_${format(new Date(), 'yyyyMMdd')}.pdf`));

    // --- RENDER ---
    const getSortIcon = (key: SortKey) => sortConfig.key !== key ? <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" /> : (sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />);

    const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
        <th className={`p-3 text-left font-semibold text-slate-600 cursor-pointer group hover:bg-slate-100 transition-colors ${className}`} onClick={() => handleSort(sortKey)}>
            <div className="flex items-center gap-2">{label} {getSortIcon(sortKey)}</div>
        </th>
    );

    // Render de Estatus Embellecido (Badges)
    const renderStatus = (ficha: any) => {
        const val = ReportValidators.attendanceList(ficha);

        if (val.status === 'missing_schedule') {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    <CalendarOff size={10} /> Sin Turno
                </span>
            );
        }

        if (val.status === 'missing_data') {
            return <span className="text-red-300 italic text-xs font-medium">- Ausente -</span>;
        }

        const estatus = ficha.EstatusManualAbrev || ficha.EstatusChecadorAbrev || '-';

        // Estilos de colores igual que en Kardex
        const styles: { [key: string]: string } = {
            'A': 'bg-green-50 text-green-700 border-green-200',
            'F': 'bg-red-50 text-red-700 border-red-200',
            'RET': 'bg-orange-50 text-orange-700 border-orange-200',
            'D': 'bg-slate-100 text-slate-500 border-slate-200'
        };
        const style = styles[estatus] || 'bg-blue-50 text-blue-700 border-blue-200';

        return (
            <span className={`px-2 py-0.5 rounded text-xs font-bold border ${style}`}>
                {estatus}
            </span>
        );
    };

    // Configuración de Filtros
    const filterConfigurations: FilterConfig[] = useMemo(() => [
        { id: 'depts', title: 'Deptos', icon: <Building />, options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [], selectedValues: filters.depts, onChange: v => setFilters(f => ({ ...f, depts: v as number[] })), isActive: user?.activeFilters?.departamentos ?? false },
        { id: 'groups', title: 'Grupos', icon: <Briefcase />, options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [], selectedValues: filters.groups, onChange: v => setFilters(f => ({ ...f, groups: v as number[] })), isActive: user?.activeFilters?.gruposNomina ?? false },
        { id: 'puestos', title: 'Puestos', icon: <Tag />, options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [], selectedValues: filters.puestos, onChange: v => setFilters(f => ({ ...f, puestos: v as number[] })), isActive: user?.activeFilters?.puestos ?? false },
        { id: 'estabs', title: 'Estabs', icon: <MapPin />, options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [], selectedValues: filters.estabs, onChange: v => setFilters(f => ({ ...f, estabs: v as number[] })), isActive: user?.activeFilters?.establecimientos ?? false },
    ].filter(c => c.isActive), [user, filters]);

    return (
        <div className="space-y-6 animate-fade-in pb-10 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h2 className="text-2xl font-bold text-slate-800">Lista de Asistencia</h2><p className="text-slate-500 text-sm">Reporte operativo de entradas y salidas.</p></div>
                <button onClick={handleGenerateClick} disabled={isLoading} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md ${isLoading ? 'opacity-70' : ''}`}>
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} {isLoading ? 'Procesando...' : 'Generar Lista'}
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <AttendanceToolbar
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    filterConfigurations={filterConfigurations} viewMode={viewMode} setViewMode={setViewMode}
                    rangeLabel={rangeLabel} handleDatePrev={handleDatePrev} handleDateNext={handleDateNext}
                    currentDate={currentDate} onDateChange={setCurrentDate}
                />
            </div>

            {/* Grid */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col overflow-hidden flex-1">
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Resultados {processedData.length > 0 && <span className="font-normal text-slate-400">({processedData.length})</span>}</h3>
                    <div className="flex gap-2">
                        <Tooltip text="Excel"><button onClick={handleExportExcel} disabled={!processedData.length} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 transition-colors"><FileSpreadsheet size={18} /></button></Tooltip>
                        <Tooltip text="PDF"><button onClick={handleInitialPreview} disabled={!processedData.length} className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 transition-colors"><Download size={18} /></button></Tooltip>
                    </div>
                </div>

                <div className="flex-grow overflow-auto bg-slate-50/50">
                    {processedData.length === 0 && !isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400"><Search size={48} className="mb-4 opacity-20" /><p className="text-sm">Selecciona un periodo para ver la lista.</p></div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <SortableHeader label="ID" sortKey="empleadoId" className="w-24 font-mono" />
                                    <SortableHeader label="Empleado" sortKey="nombre" />
                                    <SortableHeader label="Depto." sortKey="departamento" className="hidden md:table-cell" />
                                    <SortableHeader label="Puesto" sortKey="puesto" className="hidden md:table-cell" />
                                    <th className="p-3 text-center w-32 text-slate-600">Resumen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {processedData.map(emp => {
                                    const isExpanded = expandedRows.includes(emp.empleadoId);

                                    const diasAsistidos = emp.fichas.filter(f => f.HoraEntrada && f.HoraEntrada !== '00:00').length;
                                    const incidentCount = emp.fichas.filter(f => f.IncidenciaActivaId).length;
                                    const missingSchedule = emp.fichas.filter(f => f.HorarioId).length;
                                    const isAllGood = incidentCount === 0 && missingSchedule === 0;

                                    return (
                                        <React.Fragment key={emp.empleadoId}>
                                            <tr onClick={() => toggleRow(emp.empleadoId)} className={`cursor-pointer hover:bg-slate-50 ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-3 text-center text-slate-400">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                                                <td className="p-3 font-mono text-slate-500">{emp.codRef}</td>
                                                <td className="p-3 font-medium text-slate-800">
                                                    <div className="flex items-center gap-2 group/name">
                                                        {isAllGood && (
                                                            <Tooltip text="Sin novedades / Asistencia correcta">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100"></div>
                                                            </Tooltip>
                                                        )}
                                                        {incidentCount > 0 && (
                                                            <Tooltip text={`${incidentCount} incidencias`}>
                                                                <div className="w-2 h-2 rounded-full bg-purple-500 ring-2 ring-purple-100"></div>
                                                            </Tooltip>
                                                        )}
                                                        {missingSchedule > 0 && (
                                                            <Tooltip text={`${missingSchedule} días sin turno asignado`}>
                                                                <div className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-slate-100"></div>
                                                            </Tooltip>
                                                        )}
                                                        {emp.nombre}

                                                        <Tooltip text="Ver Ficha">
                                                            <button onClick={(e) => { e.stopPropagation(); setViewingEmployeeId(emp.empleadoId); }} className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full opacity-0 group-hover/name:opacity-100 transition-opacity ml-auto">
                                                                <Contact size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                                <td className="p-3 hidden md:table-cell text-slate-500 text-xs">{emp.departamento}</td>
                                                <td className="p-3 hidden md:table-cell text-slate-500 text-xs">{emp.puesto}</td>
                                                <td className="p-3 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="px-2 py-0.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600">{diasAsistidos} asist.</span>
                                                        {parseFloat(emp.totalHoras) > 0 && <span className="text-[10px] text-blue-600 font-mono flex items-center gap-1"><Timer size={10} /> {emp.totalHoras} hrs</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-slate-50 shadow-inner">
                                                    <td colSpan={6} className="p-0">
                                                        <div className="p-4 pl-12 animate-slide-down">
                                                            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b">
                                                                        <tr><th className="p-2 pl-4 text-left">Fecha</th><th className="p-2 text-center">Entrada</th><th className="p-2 text-center">Salida</th><th className="p-2 text-center">Horas</th><th className="p-2 text-center">Estatus</th></tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {emp.fichas.map((f, idx) => {
                                                                            const val = ReportValidators.attendanceList(f);
                                                                            const rowBg = val.status === 'missing_data' ? 'bg-slate-50' : 'bg-white';
                                                                            return (
                                                                                <tr key={idx} className={`hover:bg-slate-50/80 ${rowBg}`}>
                                                                                    <td className="p-2 pl-4 font-medium text-slate-700 border-r border-slate-100">{format(safeDate(f.Fecha), 'EEE d MMM', { locale: es })}</td>
                                                                                    <td className="p-2 text-center font-mono text-slate-600">{f.HoraEntrada ? format(new Date(f.HoraEntrada), 'HH:mm') : '--'}</td>
                                                                                    <td className="p-2 text-center font-mono text-slate-600">{f.HoraSalida ? format(new Date(f.HoraSalida), 'HH:mm') : '--'}</td>
                                                                                    <td className="p-2 text-center font-mono text-blue-600 font-semibold">{f.HorasTrabajadas > 0 ? f.HorasTrabajadas : '-'}</td>
                                                                                    <td className="p-2 text-center">
                                                                                        <div className="flex items-center justify-center gap-2">
                                                                                            {renderStatus(f)}
                                                                                            {f.IncidenciaActivaId && <Tooltip text="Incidencia"><ShieldAlert size={12} className="text-purple-500" /></Tooltip>}
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
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
                onConfirm={handleConfirmGeneration} validation={validationResult} canOverride={!can('nomina.override')}
                reportType="attendance_list"
            />

            <PDFPreviewModal
                isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} pdfUrl={previewPdfUrl}
                title="Lista de Asistencia" onSettingsChange={generatePDF} onSave={handleSavePDF}
                allowedLayouts={['standard', 'signature', 'compact']}
            />

            {viewingEmployeeId && <EmployeeProfileModal employeeId={viewingEmployeeId as any} onClose={() => setViewingEmployeeId(null)} getToken={getToken} user={user} />}
        </div>
    );
};