// src/features/reports/pages/KardexReportPage.tsx
import React, { useState, useRef } from 'react'; // Importar useRef
import { 
    Search, FileSpreadsheet, Download, ChevronDown, ChevronUp, 
    MessageSquare, AlertCircle
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { ReportFilterBar } from './ReportFilterBar';
import { PayrollGuardModal } from '../components/PayrollGuardModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Importamos tipos y clases actualizadas
import { exportToExcel, PDFReportBuilder, ReportThemeKey } from '../../../utils/reportExporter';
import { PDFPreviewModal } from '../../../components/ui/PDFPreviewModal';

// ... (Interfaces FichaData y EmpleadoKardex se mantienen igual) ...
interface FichaData {
    Fecha: string;
    HoraEntrada: string | null;
    HoraSalida: string | null;
    EstatusManualAbrev: string;
    EstatusChecadorAbrev: string;
    Comentarios: string;
    IncidenciaActivaId: number | null;
}

interface EmpleadoKardex {
    empleadoId: number;
    nombre: string;
    codRef: string;
    departamento: string;
    puesto: string;
    fichas: FichaData[];
}

export const KardexReportPage = () => {
    const { getToken, can } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState<EmpleadoKardex[]>([]);
    
    // Estados para validación
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
    const [pendingFilters, setPendingFilters] = useState<any>(null);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);

    // --- NUEVO: Estado y Referencias para PDF ---
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    
    // Guardamos la instancia actual del builder en una ref para no perderla entre renderizados
    // y poder llamar a su método .saveWithDialog()
    const reportBuilderRef = useRef<PDFReportBuilder | null>(null);

    // ... (toggleRow, handleValidate, handleConfirmGeneration, handleExportExcel se mantienen igual) ...
    const toggleRow = (empleadoId: number) => {
        setExpandedRows(prev => prev.includes(empleadoId) ? prev.filter(id => id !== empleadoId) : [...prev, empleadoId]);
    };

    const handleValidate = async (filters: any) => {
        setIsLoading(true);
        const token = getToken();
        if (!token) return;
        try {
            const response = await fetch(`${API_BASE_URL}/reports/validate-period`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ startDate: filters.startDate, endDate: filters.endDate })
            });
            if (!response.ok) throw new Error('Error al validar periodo.');
            const result = await response.json();
            setValidationResult(result);
            setPendingFilters(filters);
            setIsGuardModalOpen(true);
        } catch (err: any) {
            console.error(err);
            setPendingFilters(filters);
            handleConfirmGeneration(); 
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmGeneration = async () => {
        setIsGuardModalOpen(false);
        setIsLoading(true);
        const token = getToken();
        const filters = pendingFilters;
        try {
            const response = await fetch(`${API_BASE_URL}/reports/kardex`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(filters)
            });
            if (!response.ok) throw new Error('Error al generar el reporte.');
            const data = await response.json();
            setReportData(data);
            setExpandedRows([]);
        } catch (err: any) { console.error(err); } finally { setIsLoading(false); }
    };

    const handleExportExcel = () => {
        if (reportData.length === 0) return;
        const flatData = reportData.flatMap(emp => 
            emp.fichas.map(f => ({
                'ID Empleado': emp.codRef, 'Nombre': emp.nombre, 'Departamento': emp.departamento, 'Puesto': emp.puesto,
                'Fecha': format(new Date(f.Fecha), 'yyyy-MM-dd'), 'Día': format(new Date(f.Fecha), 'EEEE', { locale: es }),
                'Hora Entrada': f.HoraEntrada ? format(new Date(f.HoraEntrada), 'HH:mm') : '',
                'Hora Salida': f.HoraSalida ? format(new Date(f.HoraSalida), 'HH:mm') : '',
                'Estatus': f.EstatusManualAbrev, 'Comentarios': f.Comentarios
            }))
        );
        exportToExcel('Kardex_Asistencia', 'Registros', flatData);
    };

    // --- GENERACIÓN DEL REPORTE (Centralizada) ---
    const generateReport = (themeKey: ReportThemeKey = 'corporate') => {
        if (reportData.length === 0 || !pendingFilters) return;

        const periodStr = `Periodo: ${pendingFilters.startDate} al ${pendingFilters.endDate}`;
        
        // Creamos una nueva instancia con el tema seleccionado
        const builder = new PDFReportBuilder(
            "Kardex de Asistencia", 
            periodStr,
            "Filtros: Departamentos y Puestos activos",
            themeKey // Pasamos el tema
        );
        
        builder.generateKardex(reportData);
        
        // Guardamos la referencia para poder guardar después
        reportBuilderRef.current = builder;
        
        // Actualizamos la URL para el modal
        setPreviewPdfUrl(builder.getBlobUrl());
    };

    const handleInitialPreview = () => {
        generateReport('corporate'); // Generar inicial con default
        setIsPreviewOpen(true);
    };

    const handleSaveFromPreview = (saveAs: boolean) => {
        if (reportBuilderRef.current) {
            const fileName = `Kardex_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            if (saveAs) {
                reportBuilderRef.current.saveWithDialog(fileName);
            } else {
                reportBuilderRef.current.save(fileName); // Descarga directa
            }
        }
    };

    // Helpers visuales (sin cambios)
    const formatTime = (isoString: string | null) => isoString ? format(new Date(isoString), 'HH:mm') : '--:--';
    const formatDate = (isoString: string) => isoString ? format(new Date(isoString), 'EEE d MMM', { locale: es }) : '-';
    const getStatusBadge = (abrev: string) => {
        const styles: {[key: string]: string} = { 'A': 'bg-green-100 text-green-700 border-green-200', 'F': 'bg-red-100 text-red-700 border-red-200', 'RET': 'bg-orange-100 text-orange-700 border-orange-200', 'D': 'bg-slate-100 text-slate-500 border-slate-200', 'VAC': 'bg-blue-100 text-blue-700 border-blue-200', 'INC': 'bg-purple-100 text-purple-700 border-purple-200' };
        return <span className={`px-2 py-0.5 rounded text-xs font-bold border ${styles[abrev] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{abrev}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <ReportFilterBar onGenerate={handleValidate} isLoading={isLoading} />

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">
                        Resultados del Periodo {reportData.length > 0 && <span className="ml-1 text-slate-400 font-normal">({reportData.length} registros)</span>}
                    </h3>
                    <div className="flex gap-2">
                        <Tooltip text="Descargar Excel">
                            <button onClick={handleExportExcel} disabled={reportData.length === 0} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                <FileSpreadsheet size={18} />
                            </button>
                        </Tooltip>
                        
                        <Tooltip text="Vista Previa PDF">
                            <button 
                                onClick={handleInitialPreview} 
                                disabled={reportData.length === 0} 
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <Download size={18} /> 
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className="flex-grow overflow-auto bg-slate-50/50">
                    {/* ... (Tabla Master-Detail igual que antes) ... */}
                    {reportData.length === 0 && !isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="text-sm">Configura los filtros y genera el reporte para ver datos.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            {/* ... (Header y Body de la tabla sin cambios) ... */}
                            <thead className="bg-slate-100 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10"></th>
                                    <th className="p-3 w-24">ID</th>
                                    <th className="p-3">Empleado</th>
                                    <th className="p-3 hidden md:table-cell">Departamento</th>
                                    <th className="p-3 hidden md:table-cell">Puesto</th>
                                    <th className="p-3 text-center w-24 text-green-600">Asist.</th>
                                    <th className="p-3 text-center w-24 text-red-600">Faltas</th>
                                    <th className="p-3 text-center w-24 text-orange-500">Retardos</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {reportData.map(emp => {
                                    const isExpanded = expandedRows.includes(emp.empleadoId);
                                    const asistencias = emp.fichas.filter(f => ['A', 'D', 'VAC'].includes(f.EstatusManualAbrev)).length;
                                    const faltas = emp.fichas.filter(f => f.EstatusManualAbrev === 'F').length;
                                    const retardos = emp.fichas.filter(f => f.EstatusManualAbrev === 'RET').length;
                                    return (
                                        <React.Fragment key={emp.empleadoId}>
                                            <tr onClick={() => toggleRow(emp.empleadoId)} className={`cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-3 text-center text-slate-400">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</td>
                                                <td className="p-3 font-mono text-slate-500">{emp.codRef}</td>
                                                <td className="p-3 font-medium text-slate-800">{emp.nombre}</td>
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
                                                                        <tr><th className="p-2 pl-4 text-left">Fecha</th><th className="p-2 text-center">Entrada</th><th className="p-2 text-center">Salida</th><th className="p-2 text-center">Estatus</th><th className="p-2 w-1/3">Observaciones</th></tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {emp.fichas.map((ficha, idx) => (
                                                                            <tr key={idx} className="hover:bg-slate-50/80">
                                                                                <td className="p-2 pl-4 font-medium text-slate-700 capitalize border-r border-slate-100 bg-slate-50/30">{formatDate(ficha.Fecha)}</td>
                                                                                <td className="p-2 text-center font-mono text-slate-600">{formatTime(ficha.HoraEntrada)}</td>
                                                                                <td className="p-2 text-center font-mono text-slate-600">{formatTime(ficha.HoraSalida)}</td>
                                                                                <td className="p-2 text-center">{getStatusBadge(ficha.EstatusManualAbrev)}</td>
                                                                                <td className="p-2 text-slate-500">
                                                                                    <div className="flex flex-col gap-1">
                                                                                        {ficha.Comentarios && <span className="flex items-start gap-1"><MessageSquare size={12} className="mt-0.5 shrink-0"/> <span className="italic">"{ficha.Comentarios}"</span></span>}
                                                                                        {ficha.IncidenciaActivaId && <span className="flex items-center gap-1 text-amber-600 font-semibold"><AlertCircle size={12}/> Incidencia #{ficha.IncidenciaActivaId}</span>}
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
                isOpen={isGuardModalOpen}
                onClose={() => setIsGuardModalOpen(false)}
                onConfirm={handleConfirmGeneration}
                validation={validationResult}
                canOverride={can('nomina.override')}
            />

            {/* --- MODIFICADO: Conexión de callbacks --- */}
            <PDFPreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                pdfUrl={previewPdfUrl}
                title="Kardex de Asistencia"
                fileName={`Kardex_${format(new Date(), 'yyyy-MM-dd')}.pdf`}
                onSettingsChange={generateReport} // Al cambiar tema, se regenera
                onSave={handleSaveFromPreview}    // Al guardar, se usa el builder actual
            />
        </div>
    );
};