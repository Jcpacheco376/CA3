// src/features/reports/pages/PrenominaReportPage.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
    FileSpreadsheet, Loader2, Play, DollarSign,
    Building, Briefcase, Tag, MapPin, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { Tooltip } from '../../../components/ui/Tooltip';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { format } from 'date-fns';

// --- IMPORTACIONES CLAVE ---
import { AttendanceToolbar, FilterConfig } from '../../attendance/AttendanceToolbar';
import { useSharedAttendance } from '../../../hooks/useSharedAttendance';
import { exportToExcel } from '../../../utils/reportExporter';
import { PayrollGuardModal } from '../components/PayrollGuardModal';

// --- TIPOS ---
interface ConceptoItem {
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
    ConceptosCalculados: ConceptoItem[];
}

type SortKey = 'NombreCompleto' | 'Departamento' | 'GrupoNomina';
type SortDirection = 'asc' | 'desc';

export const PrenominaReportPage = () => {
    const { getToken, user, can } = useAuth();

    // --- HOOK COMPARTIDO ---
    const {
        filters, setFilters,
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        dateRange, rangeLabel,
        handleDatePrev, handleDateNext
    } = useSharedAttendance(user);

    // --- ESTADOS LOCALES ---
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<PrenominaRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    // --- ESTADOS PARA VALIDACIÓN (CANDADO) ---
    const [isGuardModalOpen, setIsGuardModalOpen] = useState(false);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [pendingFilters, setPendingFilters] = useState<any>(null);

    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'NombreCompleto',
        direction: 'asc'
    });

    useEffect(() => {
        if (data.length > 0) setData([]);
        setError(null);
        setValidationResult(null);
    }, [dateRange, filters]);

    // --- 1. VALIDAR ANTES DE GENERAR ---
    const handleValidateClick = async () => {
        if (!dateRange || dateRange.length === 0) return;

        setIsLoading(true);
        setError(null);
        const token = getToken();

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
            const res = await fetch(`${API_BASE_URL}/reports/validate-period`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(activeFilters)
            });

            if (!res.ok) throw new Error('Error al validar el periodo.');
            const result = await res.json();

            setValidationResult(result);
            setPendingFilters(activeFilters);
            setIsGuardModalOpen(true);

        } catch (err: any) {
            console.error(err);
            setError('No se pudo validar el estado del periodo. Intente nuevamente.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- 2. CONFIRMAR Y GENERAR ---
    const handleConfirmGeneration = async () => {
        setIsGuardModalOpen(false);
        setIsLoading(true);
        const token = getToken();

        try {
            const res = await fetch(`${API_BASE_URL}/reports/prenomina`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(pendingFilters)
            });

            if (!res.ok) throw new Error('Error al calcular la prenómina.');
            const jsonData = await res.json();
            setData(jsonData);
        } catch (err: any) {
            console.error(err);
            setError('Error al generar los datos. Verifique la conexión.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- 3. COLUMNAS Y PROCESAMIENTO ---
    const dynamicColumns = useMemo(() => {
        const conceptsMap = new Map<string, string>();
        data.forEach(row => {
            if (Array.isArray(row.ConceptosCalculados)) {
                row.ConceptosCalculados.forEach(c => {
                    conceptsMap.set(c.ConceptoCodigo, c.ConceptoNombre);
                });
            }
        });
        return Array.from(conceptsMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [data]);

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
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
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
                const item = row.ConceptosCalculados.find(c => c.ConceptoCodigo === code);
                baseObj[code] = item ? item.CantidadDias : 0;
            });
            return baseObj;
        });
        exportToExcel('Prenomina', 'Conceptos', flatData);
    };

    const handleSort = (key: SortKey) => {
        setSortConfig(curr => ({
            key,
            direction: curr.key === key && curr.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-emerald-600" /> : <ArrowDown size={14} className="text-emerald-600" />;
    };

    const filterConfigurations: FilterConfig[] = useMemo(() => [
        { id: 'depts', title: 'Deptos', icon: <Building />, options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [], selectedValues: filters.depts, onChange: v => setFilters(f => ({ ...f, depts: v as number[] })), isActive: user?.activeFilters?.departamentos ?? false },
        { id: 'groups', title: 'Grupos', icon: <Briefcase />, options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [], selectedValues: filters.groups, onChange: v => setFilters(f => ({ ...f, groups: v as number[] })), isActive: user?.activeFilters?.gruposNomina ?? false },
        { id: 'puestos', title: 'Puestos', icon: <Tag />, options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [], selectedValues: filters.puestos, onChange: v => setFilters(f => ({ ...f, puestos: v as number[] })), isActive: user?.activeFilters?.puestos ?? false },
        { id: 'estabs', title: 'Estabs', icon: <MapPin />, options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [], selectedValues: filters.estabs, onChange: v => setFilters(f => ({ ...f, estabs: v as number[] })), isActive: user?.activeFilters?.establecimientos ?? false },
    ].filter(c => c.isActive), [user, filters]);

    return (
        <div className="space-y-6 animate-fade-in pb-10 h-full flex flex-col">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="text-emerald-600" /> Reporte de Prenómina
                    </h2>
                    <p className="text-slate-500 text-sm">Resumen consolidado de conceptos para pago.</p>
                </div>
                <button 
                    onClick={handleValidateClick} 
                    disabled={isLoading} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md ${isLoading ? 'opacity-70' : ''}`}
                >
                    {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} 
                    {isLoading ? 'Procesando...' : 'Generar Prenómina'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <AttendanceToolbar
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
                    filterConfigurations={filterConfigurations}
                    viewMode={viewMode} setViewMode={setViewMode} 
                    rangeLabel={rangeLabel}
                    handleDatePrev={handleDatePrev} handleDateNext={handleDateNext}
                    currentDate={currentDate} onDateChange={setCurrentDate}
                    showSearch={true} 
                />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 min-h-[400px] flex flex-col overflow-hidden flex-1 relative">
                <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">
                        Resultados {processedData.length > 0 && <span className="ml-1 text-slate-400 font-normal">({processedData.length} empleados)</span>}
                    </h3>
                    <div className="flex gap-2">
                        <Tooltip text="Exportar Excel">
                            <button onClick={handleExportExcel} disabled={processedData.length === 0} className="p-2 text-green-600 hover:bg-green-50 rounded-md disabled:opacity-50 transition-colors">
                                <FileSpreadsheet size={18} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className="flex-grow overflow-auto custom-scrollbar">
                    {processedData.length === 0 && !isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                            {error ? (
                                <><AlertCircle size={48} className="mb-4 text-red-300" /><p className="text-red-500">{error}</p></>
                            ) : (
                                <><DollarSign size={48} className="mb-4 opacity-20" /><p className="text-sm">Configura el periodo y genera el reporte.</p></>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="p-3 sticky left-0 z-30 bg-slate-100 min-w-[250px] border-r border-slate-200 cursor-pointer group hover:bg-slate-200/50 transition-colors" onClick={() => handleSort('NombreCompleto')}>
                                        <div className="flex items-center gap-2">Empleado {getSortIcon('NombreCompleto')}</div>
                                    </th>
                                    <th className="p-3 min-w-[120px] cursor-pointer group hover:bg-slate-200/50" onClick={() => handleSort('Departamento')}>
                                        <div className="flex items-center gap-2">Depto {getSortIcon('Departamento')}</div>
                                    </th>
                                    <th className="p-3 min-w-[100px] cursor-pointer group hover:bg-slate-200/50" onClick={() => handleSort('GrupoNomina')}>
                                        <div className="flex items-center gap-2">Grupo {getSortIcon('GrupoNomina')}</div>
                                    </th>
                                    {dynamicColumns.map(([code, name]) => (
                                        <th key={code} className="p-2 text-center min-w-[80px] bg-slate-50 border-l border-slate-200">
                                            <Tooltip text={name}>
                                                <div className="flex flex-col items-center justify-center cursor-help">
                                                    <span className="text-xs font-bold text-emerald-800">{code}</span>
                                                </div>
                                            </Tooltip>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {processedData.map((row, idx) => (
                                    <tr key={row.EmpleadoId} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="p-3 sticky left-0 z-10 bg-white group-hover:bg-blue-50/50 border-r border-slate-200">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{row.NombreCompleto}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">
                                                        {row.CodigoEmpleado}
                                                    </span>
                                                    <span className="text-xs text-slate-400 truncate max-w-[140px]" title={row.Puesto}>
                                                        {row.Puesto}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-slate-500 text-xs">{row.Departamento}</td>
                                        <td className="p-3 text-slate-500 text-xs">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                                {row.GrupoNomina}
                                            </span>
                                        </td>
                                        {dynamicColumns.map(([code]) => {
                                            const item = row.ConceptosCalculados.find(c => c.ConceptoCodigo === code);
                                            const val = item ? item.CantidadDias : 0;
                                            const hasValue = val > 0;
                                            return (
                                                <td key={code} className={`p-2 text-right border-l border-slate-100 font-mono text-xs ${hasValue ? 'text-emerald-700 font-bold bg-emerald-50/30' : 'text-slate-300'}`}>
                                                    {val > 0 ? val.toFixed(2) : '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                            {processedData.length > 0 && (
                                <tfoot className="bg-slate-100 font-bold text-slate-700 border-t-2 border-slate-300 sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                                    <tr>
                                        <td className="p-3 text-right sticky left-0 z-30 bg-slate-100 border-r border-slate-300">TOTALES:</td>
                                        <td colSpan={2} className="bg-slate-100"></td>
                                        {dynamicColumns.map(([code]) => {
                                            const total = processedData.reduce((sum, r) => {
                                                const item = r.ConceptosCalculados.find(c => c.ConceptoCodigo === code);
                                                return sum + (item ? item.CantidadDias : 0);
                                            }, 0);
                                            return (
                                                <td key={code} className="p-2 text-right border-l border-slate-300 text-emerald-800 font-mono text-xs">
                                                    {total > 0 ? total.toFixed(2) : '-'}
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

            <PayrollGuardModal
                isOpen={isGuardModalOpen}
                onClose={() => setIsGuardModalOpen(false)}
                onConfirm={handleConfirmGeneration}
                validation={validationResult}
                canOverride={can('nomina.override')}
                reportType="prenomina"
            />
        </div>
    );
};