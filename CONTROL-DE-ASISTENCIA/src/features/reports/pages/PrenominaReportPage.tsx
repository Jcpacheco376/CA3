import React, { useState, useMemo, useEffect } from 'react';
import {
    FileSpreadsheet, Loader2, Play, DollarSign,
    Building, Briefcase, Tag, MapPin, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown,
    ChevronDown, ChevronUp, Search, Calendar, Layers, Contact,
    Lock, AlertTriangle, CheckCircle, RefreshCw // <--- Iconos nuevos
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- IMPORTACIONES CLAVE ---
import { AttendanceToolbar, FilterConfig } from '../../attendance/AttendanceToolbar';
import { useSharedAttendance } from '../../../hooks/useSharedAttendance';
import { exportToExcel } from '../../../utils/reportExporter';
import { PayrollGuardModal } from '../components/PayrollGuardModal';
import { EmployeeProfileModal } from '../../attendance/EmployeeProfileModal';

// --- HELPER: Parseo Seguro de Fechas ---
const safeDate = (dateString: string | null | undefined) => {
    if (!dateString) return new Date();
    try {
        if (dateString.includes('T')) return new Date(dateString);
        const parts = dateString.substring(0, 10).split('-');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        }
        return new Date(dateString);
    } catch (e) {
        return new Date();
    }
};

// --- TIPOS ---
interface DetalleDia {
    fecha: string;
    ConceptoCodigo: string;
    ConceptoNombre: string;
    CantidadDias: number;
}

interface PrenominaRow {
    EmpleadoId: number;
    CodigoEmpleado: string;
    NombreCompleto: string;
    GrupoNomina: string;
    Departamento: string;
    Puesto: string;
    FechaIngreso: string;
    DetalleNomina: DetalleDia[];
}

type SortKey = 'NombreCompleto' | 'Departamento' | 'Puesto' | 'CodigoEmpleado';
type SortDirection = 'asc' | 'desc';

export const PrenominaReportPage = () => {
    const { getToken, user } = useAuth();

    // --- HOOK COMPARTIDO ---
    const {
        filters, setFilters, viewMode, setViewMode, currentDate, setCurrentDate,
        dateRange, rangeLabel, handleDatePrev, handleDateNext
    } = useSharedAttendance(user);

    // --- ESTADOS ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PrenominaRow[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

    // --- NUEVO: ESTADO DEL REPORTE (Para mostrar badges al cargar) ---
    const [reportStatus, setReportStatus] = useState<{
        exists: boolean;
        isClosed: boolean;
        lastGenerated?: string;
        checked: boolean; // Para saber si ya revisamos
    }>({ exists: false, isClosed: false, checked: false });

    // Validaciones
    const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);

    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'NombreCompleto',
        direction: 'asc'
    });

    useEffect(() => {
        if (data.length > 0) setData([]);
        setError(null);
        setValidationResult(null);
        setExpandedRows([]);
    }, [dateRange, filters]);

    // ========================================================================
    // 1. EFECTO AUTOMÁTICO: REVISAR ESTADO AL CAMBIAR FILTROS (SIN CLIC)
    // ========================================================================
    useEffect(() => {
        const checkStatus = async () => {
            // Si falta info, reseteamos el estado
            if (!dateRange || !filters.groups || filters.groups.length === 0) {
                setReportStatus({ exists: false, isClosed: false, checked: false });
                return;
            }

            try {
                const token = getToken();
                const payload = {
                    startDate: format(dateRange[0], 'yyyy-MM-dd'),
                    endDate: format(dateRange[dateRange.length! - 1], 'yyyy-MM-dd'),
                    grupoNominaId: filters.groups[0],
                };

                // Hacemos la petición silenciosa al endpoint de validación
                const res = await fetch(`${API_BASE_URL}/reports/validate-prenomina`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const result = await res.json();
                    // Actualizamos el estado visual inmediatamente
                    setReportStatus({
                        exists: result.ReportExists, // Viene del SP actualizado
                        isClosed: result.IsClosed,   // Viene del SP actualizado
                        lastGenerated: result.LastGenerated,
                        checked: true
                    });
                }
            } catch (err) {
                console.error("Error verificando estado del reporte:", err);
            }
        };

        // Ejecutar chequeo (Debounce opcional si cambia muy rápido, aquí directo)
        checkStatus();

    }, [dateRange, filters.groups, getToken]); // Se ejecuta cuando cambian fechas o grupos


    // --- 2. VALIDAR AL DAR CLIC EN EL BOTÓN ---
    const handleValidateClick = async () => {
        if (!dateRange || !filters.groups || filters.groups.length === 0) {
            setError("Seleccione un rango de fechas y un grupo de nómina.");
            return;
        }
        
        // Si el usuario da clic en "Regenerar", pedimos confirmación PRIMERO
        if (reportStatus.exists) {
            const confirm = window.confirm(
                "⚠️ ATENCIÓN: REGENERACIÓN DE REPORTE\n\n" +
                "Ya existe un reporte guardado para este periodo.\n" +
                "¿Está seguro que desea ELIMINARLO y volver a generarlo con los datos actuales?\n\n" +
                "Esta acción no se puede deshacer."
            );
            if (!confirm) return;
        }

        setIsLoading(true);
        setError(null);
        const token = getToken();
        const payload = {
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length! - 1], 'yyyy-MM-dd'),
            grupoNominaId: filters.groups[0],
        };

        try {
            const res = await fetch(`${API_BASE_URL}/reports/validate-prenomina`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Error al validar.');
            
            const result = await res.json();
            setValidationResult(result);
            // Abrimos el modal (El modal mostrará semáforos rojos si hay problemas)
            setIsGuardModalOpen(true);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 3. GENERACIÓN FINAL (CONFIRMADA DESDE MODAL) ---
    const handleConfirmGeneration = async () => {
        setIsGuardModalOpen(false);
        setIsLoading(true);
        const token = getToken();
        const payload = {
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length! - 1], 'yyyy-MM-dd'),
            grupoNominaId: filters.groups![0],
            regenerate: reportStatus.exists // <--- ENVIAMOS FLAG PARA FORZAR REGENERACIÓN
        };

        try {
            const res = await fetch(`${API_BASE_URL}/reports/prenomina`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Error al generar prenómina.');
            
            const jsonData = await res.json();
            setData(jsonData);
            
            // Actualizamos estado local indicando que ahora SI existe
            setReportStatus(prev => ({ ...prev, exists: true, checked: true }));

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- 4. PROCESAMIENTO ---
    const dynamicColumns = useMemo(() => {
        const conceptsMap = new Map<string, string>();
        data.forEach(row => {
            if (Array.isArray(row.DetalleNomina)) {
                row.DetalleNomina.forEach(d => {
                    conceptsMap.set(d.ConceptoCodigo, d.ConceptoNombre);
                });
            }
        });
        return Array.from(conceptsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [data]);

    const getEmployeeTotal = (row: PrenominaRow, code: string) => {
        if (!row.DetalleNomina) return 0;
        return row.DetalleNomina
            .filter(d => d.ConceptoCodigo === code)
            .reduce((sum, d) => sum + (d.CantidadDias || 0), 0);
    };

    const processedData = useMemo(() => {
        let result = data;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(emp =>
                emp.NombreCompleto.toLowerCase().includes(term) ||
                emp.CodigoEmpleado.toLowerCase().includes(term)
            );
        }
        return [...result].sort((a, b) => {
            const aVal = a[sortConfig.key];
            const bVal = b[sortConfig.key];
            return sortConfig.direction === 'asc' 
                ? String(aVal).localeCompare(String(bVal)) 
                : String(bVal).localeCompare(String(aVal));
        });
    }, [data, searchTerm, sortConfig]);

    const handleExportExcel = () => {
        if (processedData.length === 0) return;
        const flatData = processedData.map(row => {
            const baseObj: any = {
                'ID': row.CodigoEmpleado,
                'Nombre': row.NombreCompleto,
                'Departamento': row.Departamento,
                'Puesto': row.Puesto,
                'Grupo': row.GrupoNomina
            };
            dynamicColumns.forEach(([code]) => {
                baseObj[code] = getEmployeeTotal(row, code);
            });
            return baseObj;
        });
        exportToExcel('Prenomina', 'Conceptos', flatData);
    };

    // --- 5. RENDERIZADO ---
    const toggleRow = (id: number) => {
        setExpandedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(curr => ({ key, direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc' }));
    };

    const SortableHeader = ({ label, sortKey, className = "" }: { label: string, sortKey: SortKey, className?: string }) => (
        <th className={`p-3 text-left font-semibold text-slate-600 cursor-pointer group select-none hover:bg-slate-100 transition-colors ${className}`} onClick={() => handleSort(sortKey)}>
            <div className="flex items-center gap-2">
                {label} 
                {sortConfig.key !== sortKey ? <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" /> : 
                 sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />}
            </div>
        </th>
    );

    const filterConfigurations: FilterConfig[] = useMemo(() => [
        { id: 'groups', title: 'Grupos', icon: <Briefcase />, options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [], selectedValues: filters.groups, selectionMode: 'single', onChange: v => setFilters(f => ({ ...f, groups: v as number[] })), isActive: user?.activeFilters?.gruposNomina ?? false },
    ].filter(c => c.isActive), [user, filters]);

    return (
        <div className="space-y-6 animate-fade-in pb-10 h-full flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" /> Prenómina
                    </h2>
                    
                    {/* INDICADORES VISUALES DE ESTADO */}
                    <div className="flex items-center gap-3 mt-1 min-h-[24px]">
                        {!filters.groups || filters.groups.length === 0 ? (
                            <span className="text-slate-400 text-sm italic">Seleccione un grupo para ver estado.</span>
                        ) : (
                            <>
                                {/* Badge de Cierre */}
                                {reportStatus.isClosed ? (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 animate-fade-in">
                                        <Lock size={10} /> Periodo Cerrado
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-amber-50 text-amber-600 px-2 py-0.5 rounded border border-amber-200 animate-fade-in">
                                        <AlertTriangle size={10} /> Periodo Abierto
                                    </span>
                                )}

                                {/* Badge de Generado */}
                                {reportStatus.exists ? (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200 animate-fade-in">
                                        <CheckCircle size={10} /> Reporte Generado
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] uppercase font-bold bg-slate-50 text-slate-400 px-2 py-0.5 rounded border border-slate-200 animate-fade-in">
                                        <Layers size={10} /> Sin Generar
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* BOTÓN INTELIGENTE */}
                <button 
                    onClick={handleValidateClick} 
                    disabled={isLoading || !filters.groups?.length} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all text-white 
                        ${reportStatus.exists 
                            ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-100' // Naranja si ya existe
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' // Verde si es nuevo
                        } 
                        hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : 
                        (reportStatus.exists ? <RefreshCw size={18} /> : <Play size={18} />)
                    } 
                    {isLoading ? 'Procesando...' : (reportStatus.exists ? 'Regenerar Reporte' : 'Generar Reporte')}
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <AttendanceToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterConfigurations={filterConfigurations} viewMode={viewMode} setViewMode={setViewMode} rangeLabel={rangeLabel} handleDatePrev={handleDatePrev} handleDateNext={handleDateNext} currentDate={currentDate} onDateChange={setCurrentDate} showSearch={true} />
            </div>

            {/* Grid */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col overflow-hidden flex-1">
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">Resultados {processedData.length > 0 && <span className="ml-1 text-slate-400 font-normal">({processedData.length})</span>}</h3>
                    <Tooltip text="Exportar"><button onClick={handleExportExcel} disabled={processedData.length === 0} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50"><FileSpreadsheet size={18} /></button></Tooltip>
                </div>

                <div className="flex-grow overflow-auto custom-scrollbar bg-slate-50/30">
                    {processedData.length === 0 && !isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            {error ? <><AlertCircle size={48} className="mb-4 text-red-300"/><p className="text-red-500">{error}</p></> : <><Search size={48} className="mb-4 opacity-20"/><p className="text-sm">Sin datos para mostrar.</p></>}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="p-3 w-10 sticky left-0 bg-slate-100 z-30 border-r border-slate-200"></th>
                                    <SortableHeader label="ID" sortKey="CodigoEmpleado" className="w-24 font-mono sticky left-10 z-30 bg-slate-100 border-r border-slate-200" />
                                    <SortableHeader label="Empleado" sortKey="NombreCompleto" />
                                    <SortableHeader label="Depto" sortKey="Departamento" className="hidden md:table-cell" />
                                    <SortableHeader label="Puesto" sortKey="Puesto" className="hidden md:table-cell" />
                                    {dynamicColumns.map(([code, name]) => (
                                        <th key={code} className="p-2 text-center min-w-[80px] bg-white border-l border-slate-200 border-b-2 border-b-emerald-500/50">
                                            <Tooltip text={name}><span className="text-xs font-bold text-emerald-800 cursor-help">{code}</span></Tooltip>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {processedData.map((row) => {
                                    const isExpanded = expandedRows.includes(row.EmpleadoId);
                                    return (
                                        <React.Fragment key={row.EmpleadoId}>
                                            <tr onClick={() => toggleRow(row.EmpleadoId)} className={`cursor-pointer transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-indigo-50/30' : ''}`}>
                                                <td className="p-3 text-center text-slate-400 sticky left-0 z-20 bg-inherit border-r border-slate-200">
                                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                </td>
                                                <td className="p-3 font-mono text-slate-500 sticky left-10 z-20 bg-inherit border-r border-slate-200">
                                                    {row.CodigoEmpleado}
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2 group/name">
                                                        <span className="font-medium text-slate-800">{row.NombreCompleto}</span>
                                                        <Tooltip text="Ver Ficha">
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setViewingEmployeeId(row.EmpleadoId); }}
                                                                className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full opacity-0 group-hover/name:opacity-100 transition-opacity"
                                                            >
                                                                <Contact size={16} />
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                                <td className="p-3 hidden md:table-cell text-slate-500 truncate max-w-[150px]">{row.Departamento}</td>
                                                <td className="p-3 hidden md:table-cell text-slate-500 truncate max-w-[150px]">{row.Puesto}</td>
                                                
                                                {/* Celdas Dinámicas */}
                                                {dynamicColumns.map(([code]) => {
                                                    const val = getEmployeeTotal(row, code);
                                                    return (
                                                        <td key={code} className={`p-2 text-right border-l border-slate-100 font-mono text-xs ${val > 0 ? 'text-emerald-700 font-bold bg-emerald-50/30' : 'text-slate-300'}`}>
                                                            {(val || 0) > 0 ? (val || 0).toFixed(2) : '-'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>

                                            {/* DETALLE DIARIO */}
                                            {isExpanded && (
                                                <tr className="bg-slate-50 shadow-inner">
                                                    <td colSpan={5 + dynamicColumns.length} className="p-0">
                                                        <div className="p-4 pl-12 animate-slide-down">
                                                            <div className="rounded-lg border border-slate-200 overflow-hidden bg-white max-w-3xl">
                                                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                                                                    <Calendar size={14} className="text-blue-500"/>
                                                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Desglose Diario</span>
                                                                </div>
                                                                <table className="w-full text-xs">
                                                                    <thead className="bg-slate-100 text-slate-500 font-semibold border-b">
                                                                        <tr>
                                                                            <th className="p-2 pl-4 text-left">Fecha</th>
                                                                            <th className="p-2 text-left">Concepto</th>
                                                                            <th className="p-2 text-right pr-4">Valor</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-slate-100">
                                                                        {row.DetalleNomina && row.DetalleNomina.length > 0 ? (
                                                                            row.DetalleNomina.map((det, idx) => (
                                                                                <tr key={idx} className="hover:bg-slate-50">
                                                                                    <td className="p-2 pl-4 font-medium text-slate-700 border-r border-slate-100 w-32">
                                                                                        {format(safeDate(det.fecha), 'EEE dd MMM', { locale: es })}
                                                                                    </td>
                                                                                    <td className="p-2 text-slate-600">
                                                                                        <span className="font-mono text-[10px] bg-slate-100 px-1 rounded mr-2 text-slate-500">{det.ConceptoCodigo}</span>
                                                                                        {det.ConceptoNombre}
                                                                                    </td>
                                                                                    <td className="p-2 pr-4 text-right font-bold text-emerald-700">
                                                                                        {(det.CantidadDias || 0).toFixed(2)}
                                                                                    </td>
                                                                                </tr>
                                                                            ))
                                                                        ) : (
                                                                            <tr><td colSpan={3} className="p-4 text-center italic text-slate-400">Sin detalles registrados.</td></tr>
                                                                        )}
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
                            {processedData.length > 0 && (
                                <tfoot className="bg-slate-100 font-bold text-slate-700 border-t-2 border-slate-300 sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <td colSpan={5} className="p-3 text-right text-slate-600 sticky left-0 bg-slate-100 border-r border-slate-300 z-40">
                                            TOTALES GENERALES:
                                        </td>
                                        {dynamicColumns.map(([code]) => {
                                            const total = processedData.reduce((sum, r) => {
                                                return sum + getEmployeeTotal(r, code);
                                            }, 0);
                                            return (
                                                <td key={code} className="p-2 text-right border-l border-slate-300 text-emerald-800 font-mono text-xs bg-slate-100">
                                                    {(total || 0).toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    )}
                </div>
            </div>

            <PayrollGuardModal isOpen={isGuardModalOpen} onClose={() => setIsGuardModalOpen(false)} onConfirm={handleConfirmGeneration} validation={validationResult} reportType="kardex" />
            
            {viewingEmployeeId && (
                <EmployeeProfileModal 
                    employeeId={viewingEmployeeId} 
                    onClose={() => setViewingEmployeeId(null)} 
                    getToken={getToken} 
                    user={user} 
                />
            )}
        </div>
    );
};