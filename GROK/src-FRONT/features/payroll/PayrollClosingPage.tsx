// src/features/payroll/PayrollClosingPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import { AttendanceToolbar, FilterConfig } from '../attendance/AttendanceToolbar';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Tooltip } from '../../components/ui/Tooltip';
import { EmployeeProfileModal } from '../attendance/EmployeeProfileModal';
import { 
  Lock, Unlock, AlertTriangle, CheckCircle, FileText, Briefcase, Building, Tag, MapPin, 
  UserCheck, AlertCircle, Clock, PieChart, Contact, GripVertical, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useSharedAttendance } from '../../hooks/useSharedAttendance';

// --- TIPOS DE DATOS ---
interface PeriodSummary {
    TotalFichas: number;
    ListasParaCierre: number;
    PendientesIncidencia: number;
    PendientesValidacion: number;
    YaBloqueadas: number;
    TotalFichasGrupo: number;
    ListasParaCierreGrupo: number;
    PendientesIncidenciaGrupo: number;
    PendientesValidacionGrupo: number;
    YaBloqueadasGrupo: number;
}

interface EmployeePayrollSummary {
    EmpleadoId: number;
    CodRef: string;
    NombreCompleto: string;
    Puesto: string;
    Departamento: string;
    TotalDias: number;
    DiasBloqueados: number;
    DiasListos: number;
    DiasConIncidencia: number;
    DiasPendientes: number;
}

// --- CONSTANTES DE UI ---
const COLUMN_WIDTH_STORAGE_KEY = 'payroll_closing_employee_column_width';
const MIN_COLUMN_WIDTH = 280;
const MAX_COLUMN_WIDTH = 800;
const DEFAULT_COLUMN_WIDTH = 380;

type SortKey = 'NombreCompleto' | 'Progreso' | 'Estado';
type SortDirection = 'asc' | 'desc';

const PayrollClosingPage: React.FC = () => {
    const { getToken, user } = useAuth();
    const notificationContext = useNotification();

    const {
        filters, setFilters,
        viewMode, setViewMode,
        currentDate, setCurrentDate,
        dateRange, rangeLabel,
        handleDatePrev, handleDateNext
    } = useSharedAttendance(user);

    // Asegurar que solo haya un grupo de nómina seleccionado en esta pantalla (modo single)
    useEffect(() => {
        if (filters.groups.length > 1) {
            setFilters(prev => ({ ...prev, groups: [prev.groups[0]] }));
        }
    }, [filters.groups, setFilters]);

    const notify = useCallback((msg: string, type: 'success' | 'error' | 'warning') => {
        const fn = typeof notificationContext === 'function' ? notificationContext :
                   (notificationContext as any)?.showNotification ||
                   (notificationContext as any)?.addNotification;
        if (fn) fn(msg, type);
    }, [notificationContext]);

    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<PeriodSummary | null>(null);
    const [employeeDetails, setEmployeeDetails] = useState<EmployeePayrollSummary[]>([]);

    const [showConfirmModal, setShowConfirmModal] = useState<'close' | 'unlock' | null>(null);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);
    const [comment, setComment] = useState('');

    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
        key: 'NombreCompleto',
        direction: 'asc'
    });

    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try {
            const savedWidth = localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
            return savedWidth ? Math.max(MIN_COLUMN_WIDTH, Math.min(parseInt(savedWidth, 10), MAX_COLUMN_WIDTH)) : DEFAULT_COLUMN_WIDTH;
        } catch { return DEFAULT_COLUMN_WIDTH; }
    });

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        document.body.classList.add('select-none', 'cursor-col-resize');
        const startX = e.clientX;
        const startWidth = employeeColumnWidth;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            setEmployeeColumnWidth(Math.max(MIN_COLUMN_WIDTH, Math.min(newWidth, MAX_COLUMN_WIDTH)));
        };
        const handleMouseUp = (upEvent: MouseEvent) => {
            document.body.classList.remove('select-none', 'cursor-col-resize');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            const finalWidth = startWidth + (upEvent.clientX - startX);
            const clamped = Math.max(MIN_COLUMN_WIDTH, Math.min(finalWidth, MAX_COLUMN_WIDTH));
            setEmployeeColumnWidth(clamped);
            localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, clamped.toString());
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const isFuturePeriod = useMemo(() => {
        if (!dateRange || dateRange.length === 0) return false;
        const endDate = new Date(dateRange[dateRange.length - 1]);
        const today = new Date();
        endDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return endDate > today;
    }, [dateRange]);

    const periodStatusInfo = useMemo(() => {
        if (!summary) {
            return {
                text: 'NO DISPONIBLE',
                icon: <AlertCircle size={20} className="text-slate-400" />,
                badgeClass: 'bg-slate-100 text-slate-500'
            };
        }
        if (summary.TotalFichas > 0 && summary.TotalFichas === summary.YaBloqueadas) {
            return {
                text: 'CERRADO',
                icon: <CheckCircle size={20} className="text-emerald-600" />,
                badgeClass: 'bg-emerald-100 text-emerald-700'
            };
        }
        if (summary.YaBloqueadas > 0) {
            return {
                text: 'PARCIAL',
                icon: <PieChart size={20} className="text-amber-600" />,
                badgeClass: 'bg-amber-100 text-amber-700'
            };
        }
        return {
            text: 'ABIERTO',
            icon: <Unlock size={20} className="text-slate-500" />,
            badgeClass: 'bg-slate-100 text-slate-700'
        };
    }, [summary]);

    const fetchData = useCallback(async () => {
        if (dateRange.length === 0) return;

        if (filters.groups.length === 0 && filters.depts.length === 0 && filters.puestos.length === 0 && filters.estabs.length === 0) {
            setSummary(null);
            setEmployeeDetails([]);
            return;
        }
        const token = getToken();
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/payroll/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    grupoNominaId: filters.groups.length > 0 ? filters.groups[0] : null,
                    departamentoIds: filters.depts,
                    puestoIds: filters.puestos,
                    establecimientoIds: filters.estabs,
                    fechaInicio: dateRange[0],
                    fechaFin: dateRange[dateRange.length - 1]
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Error al consultar datos');
            }

            const data = await res.json();
            setSummary(data.summary || null);
            setEmployeeDetails(data.employeeDetails || []);
        } catch (error: any) {
            notify(error.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [dateRange, filters, getToken, notify]);

    useEffect(() => {
        const timer = setTimeout(fetchData, 500);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleAction = async () => {
        if (!showConfirmModal) return;

        const token = getToken();
        if (!token) return;
        const endpoint = showConfirmModal === 'close' ? '/payroll/close' : '/payroll/unlock';

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    grupoNominaId: filters.groups.length > 0 ? filters.groups[0] : null,
                    fechaInicio: dateRange[0],
                    fechaFin: dateRange[dateRange.length - 1],
                    [showConfirmModal === 'close' ? 'comentarios' : 'motivo']: comment
                })
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message);
            notify(result.message, 'success');
            setShowConfirmModal(null);
            setComment('');
            await fetchData();
        } catch (error: any) {
            notify(error.message, 'error');
        }
    };

    const filterConfigs: FilterConfig[] = useMemo(() => {
        const configs: FilterConfig[] = [
            {
                id: 'departamentos',
                title: 'Departamentos',
                icon: <Building size={16} />,
                options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [],
                selectedValues: filters.depts,
                onChange: (vals) => setFilters(f => ({ ...f, depts: vals as number[] })),
                isActive: user?.activeFilters?.departamentos ?? true
            },
            {
                id: 'gruposNomina',
                title: 'Grupos Nómina',
                icon: <Briefcase size={16} />,
                options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [],
                selectedValues: filters.groups,
                selectionMode: 'single',
                onChange: (vals) => setFilters(f => ({ ...f, groups: vals as number[] })),
                isActive: user?.activeFilters?.gruposNomina ?? true
            },
            {
                id: 'puestos',
                title: 'Puestos',
                icon: <Tag size={16} />,
                options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [],
                selectedValues: filters.puestos,
                onChange: (vals) => setFilters(f => ({ ...f, puestos: vals as number[] })),
                isActive: user?.activeFilters?.puestos ?? true
            },
            {
                id: 'establecimientos',
                title: 'Establecimientos',
                icon: <MapPin size={16} />,
                options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [],
                selectedValues: filters.estabs,
                onChange: (vals) => setFilters(f => ({ ...f, estabs: vals as number[] })),
                isActive: user?.activeFilters?.establecimientos ?? true
            }
        ];
        return configs.filter(c => c.isActive && c.options.length > 0);
    }, [user, filters, setFilters]);

    const filteredEmployees = useMemo(() => {
        let data = [...employeeDetails];
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            data = data.filter(emp =>
                emp.NombreCompleto.toLowerCase().includes(lowerSearch) ||
                emp.CodRef.toLowerCase().includes(lowerSearch)
            );
        }
        return data.sort((a, b) => {
            let aValue: any, bValue: any;
            if (sortConfig.key === 'NombreCompleto') {
                aValue = a.NombreCompleto;
                bValue = b.NombreCompleto;
            } else if (sortConfig.key === 'Progreso') {
                aValue = a.TotalDias > 0 ? ((a.DiasListos + a.DiasBloqueados) / a.TotalDias) : 0;
                bValue = b.TotalDias > 0 ? ((b.DiasListos + b.DiasBloqueados) / b.TotalDias) : 0;
            } else if (sortConfig.key === 'Estado') {
                const getStatusPriority = (emp: EmployeePayrollSummary) => {
                    if (emp.DiasConIncidencia > 0) return 3;
                    if (emp.DiasPendientes > 0) return 2;
                    if (emp.DiasListos + emp.DiasBloqueados === emp.TotalDias && emp.TotalDias > 0) return 1;
                    return 0;
                };
                aValue = getStatusPriority(a);
                bValue = getStatusPriority(b);
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [employeeDetails, searchTerm, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const getSortIcon = (key: SortKey) => {
        if (sortConfig.key !== key) {
            return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        }
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-indigo-600" />
            : <ArrowDown size={14} className="text-indigo-600" />;
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header y Toolbar */}
            <div className="flex-none p-6 pb-0 space-y-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Cierre de Periodo</h2>
                    <p className="text-slate-500 text-sm">Resumen por empleado para validación de nómina.</p>
                </div>
               
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 shrink-0">
                    <AttendanceToolbar
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filterConfigurations={filterConfigs}
                        viewMode={viewMode}
                        setViewMode={setViewMode}
                        rangeLabel={rangeLabel}
                        handleDatePrev={handleDatePrev}
                        handleDateNext={handleDateNext}
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                    />
                </div>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                {(filters.groups.length === 0 && filters.depts.length === 0 && filters.puestos.length === 0 && filters.estabs.length === 0) ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-white rounded-lg border border-dashed border-slate-300">
                        <Briefcase size={48} className="mb-4 opacity-50 text-slate-300" />
                        <p className="font-medium text-slate-600">Selecciona filtros para comenzar</p>
                        <p className="text-sm mt-1">Usa los filtros en la barra superior para visualizar el periodo.</p>
                    </div>
                ) : loading && !summary ? (
                    <div className="flex flex-col h-full gap-6 animate-pulse">
                        <div className="flex-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-32 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                                    <div className="space-y-3">
                                        <div className="h-3 bg-slate-200 rounded w-32"></div>
                                        <div className="h-8 bg-slate-300 rounded w-20"></div>
                                        <div className="h-2 bg-slate-100 rounded w-full mt-4"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="h-10 bg-slate-50 border-b border-slate-100"></div>
                            <div className="flex-1 p-0">
                                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                    <div key={i} className="h-16 border-b border-slate-50 mx-4 my-2 bg-slate-50/50 rounded"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : summary ? (
                    <div className="flex flex-col h-full gap-6">
                        {/* KPIs */}
                        <div className="flex-none grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <KpiCard
                                title="Total Fichas"
                                value={summary.TotalFichas}
                                total={summary.TotalFichasGrupo}
                                labelTotal="Cobertura del Grupo"
                                icon={<FileText size={20} />}
                                color="bg-slate-100 text-slate-600"
                                barColor="bg-slate-500"
                            />
                            <KpiCard
                                title="Listas para Cierre"
                                value={summary.ListasParaCierre}
                                total={summary.TotalFichas}
                                groupValue={summary.ListasParaCierreGrupo}
                                groupTotal={summary.TotalFichasGrupo}
                                icon={<CheckCircle size={20} />}
                                color="bg-emerald-50 text-emerald-600"
                                barColor="bg-emerald-500"
                            />
                            <KpiCard
                                title="Pendientes"
                                value={summary.PendientesIncidencia + summary.PendientesValidacion}
                                total={summary.TotalFichas}
                                groupValue={(summary.PendientesIncidenciaGrupo || 0) + (summary.PendientesValidacionGrupo || 0)}
                                groupTotal={summary.TotalFichasGrupo}
                                icon={<AlertTriangle size={20} />}
                                color="bg-amber-50 text-amber-600"
                                barColor="bg-amber-500"
                                isError={true}
                            />
                            <KpiCard
                                title="Ya Bloqueadas"
                                value={summary.YaBloqueadas}
                                total={summary.TotalFichas}
                                groupValue={summary.YaBloqueadasGrupo}
                                groupTotal={summary.TotalFichasGrupo}
                                icon={<Lock size={20} />}
                                color="bg-indigo-50 text-indigo-600"
                                barColor="bg-indigo-500"
                            />

                            {/* Estado y Acciones */}
                            <div className="p-5 rounded-xl border border-indigo-100 bg-indigo-50/30 shadow-sm flex flex-col justify-between">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-1">Estado del Periodo</p>
                                        <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${periodStatusInfo.badgeClass}`}>
                                            {periodStatusInfo.text}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-lg bg-slate-50">
                                        {periodStatusInfo.icon}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-4">
                                    <button
                                        onClick={() => setShowConfirmModal('close')}
                                        disabled={summary.ListasParaCierre === 0 || isFuturePeriod}
                                        title={isFuturePeriod ? "No se pueden cerrar periodos futuros" : summary.ListasParaCierre === 0 ? "No hay fichas listas" : "Cerrar Periodo"}
                                        className={`w-full px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wide flex items-center justify-center gap-2 shadow-sm transition-all duration-200
                                            ${(summary.ListasParaCierre === 0 || isFuturePeriod)
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md'}`}
                                    >
                                        <Lock size={16} /> Cerrar Periodo
                                    </button>
                                    {summary.YaBloqueadas > 0 && (
                                        <Tooltip text="Desbloquear periodo">
                                            <button
                                                onClick={() => setShowConfirmModal('unlock')}
                                                className="p-2.5 border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Unlock size={16} />
                                            </button>
                                        </Tooltip>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isFuturePeriod && (
                            <div className="flex-none p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800 text-sm flex items-center gap-3">
                                <AlertTriangle size={20} className="text-orange-500" />
                                <div>
                                    <p className="font-bold">Periodo Futuro Seleccionado</p>
                                    <p className="text-xs mt-1">No se pueden cerrar periodos que incluyen días futuros.</p>
                                </div>
                            </div>
                        )}

                        {/* TABLA DE EMPLEADOS */}
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-sm text-left table-fixed">
                                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th
                                                className="px-6 py-3 font-semibold relative group cursor-pointer select-none hover:bg-slate-100 transition-colors"
                                                style={{ width: `${employeeColumnWidth}px` }}
                                                onClick={() => handleSort('NombreCompleto')}
                                            >
                                                <div className="flex items-center gap-2">
                                                    Empleado
                                                    {getSortIcon('NombreCompleto')}
                                                </div>
                                                <div
                                                    onMouseDown={handleResizeMouseDown}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-slate-200/50 transition-colors z-20"
                                                >
                                                    <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 font-semibold text-center w-[180px] cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('Progreso')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    Progreso
                                                    {getSortIcon('Progreso')}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 font-semibold text-center w-[160px] cursor-pointer group select-none hover:bg-slate-100 transition-colors" onClick={() => handleSort('Estado')}>
                                                <div className="flex items-center justify-center gap-2">
                                                    Estado
                                                    {getSortIcon('Estado')}
                                                </div>
                                            </th>
                                            <th className="px-6 py-3 font-semibold w-auto">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredEmployees.map((emp) => {
                                            const isFullyReady = emp.DiasListos + emp.DiasBloqueados === emp.TotalDias && emp.TotalDias > 0;
                                            const hasIncidents = emp.DiasConIncidencia > 0;
                                            const isPending = emp.DiasPendientes > 0;
                                            const progress = emp.TotalDias > 0 ? ((emp.DiasListos + emp.DiasBloqueados) / emp.TotalDias) * 100 : 0;
                                            return (
                                                <tr key={emp.EmpleadoId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center justify-between group">
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <Tooltip text={emp.NombreCompleto}>
                                                                        <span className="font-medium text-slate-900 truncate">{emp.NombreCompleto}</span>
                                                                    </Tooltip>
                                                                </div>
                                                                <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                                    <Tooltip text={`ID: ${emp.CodRef}`}>
                                                                        <p className="font-mono col-span-1 truncate">ID: {emp.CodRef}</p>
                                                                    </Tooltip>
                                                                    <Tooltip text={emp.Puesto || 'No asignado'}>
                                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                                                                            <span className="truncate">{emp.Puesto || 'No asignado'}</span>
                                                                        </p>
                                                                    </Tooltip>
                                                                    <Tooltip text={emp.Departamento || 'No asignado'}>
                                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                                            <Building size={12} className="text-slate-400 shrink-0" />
                                                                            <span className="truncate">{emp.Departamento || 'No asignado'}</span>
                                                                        </p>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                                <Tooltip text="Ver Ficha de Empleado">
                                                                    <button
                                                                        onClick={() => setViewingEmployeeId(emp.EmpleadoId)}
                                                                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                                    >
                                                                        <Contact size={18} />
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 align-middle">
                                                        <div className="w-full max-w-[140px] mx-auto">
                                                            <div className="flex justify-between text-xs mb-1 text-slate-500">
                                                                <span>{emp.DiasListos + emp.DiasBloqueados}/{emp.TotalDias} Días</span>
                                                                <span>{Math.round(progress)}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all duration-500 ${
                                                                        hasIncidents ? 'bg-red-500' :
                                                                        isPending ? 'bg-amber-400' :
                                                                        'bg-emerald-500'
                                                                    }`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-center">
                                                        {hasIncidents ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                                <AlertCircle size={12} /> Incidencias ({emp.DiasConIncidencia})
                                                            </span>
                                                        ) : isPending ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                                <Clock size={12} /> Pendiente
                                                            </span>
                                                        ) : isFullyReady ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                                                <UserCheck size={12} /> Listo
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-xs text-slate-500">
                                                        {hasIncidents && <p className="text-red-600">Tiene días con incidencias activas.</p>}
                                                        {isPending && <p>Faltan validaciones o datos.</p>}
                                                        {isFullyReady && <p className="text-emerald-600">Completo para cierre.</p>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {filteredEmployees.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400">
                                                    No se encontraron empleados en este periodo/filtro.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Modal de Confirmación */}
            {showConfirmModal && summary && (
                <ConfirmationModal
                    isOpen={true}
                    onClose={() => setShowConfirmModal(null)}
                    onConfirm={handleAction}
                    title={showConfirmModal === 'close' ? "Confirmar Cierre" : "Confirmar Desbloqueo"}
                >
                    <div className="space-y-3">
                        <div className={`p-3 rounded border text-sm ${showConfirmModal === 'close' ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                            {showConfirmModal === 'close'
                                ? <p>Se bloquearán <strong>{summary?.ListasParaCierre}</strong> fichas validadas.<br/>Las fichas pendientes no se verán afectadas.</p>
                                : <p><strong>¡Atención!</strong> Se habilitará la edición de todas las fichas del periodo.</p>
                            }
                        </div>
                        <textarea
                            className="w-full border border-slate-300 rounded p-2 text-sm focus:outline-none focus:border-indigo-500"
                            rows={3}
                            placeholder={showConfirmModal === 'close' ? "Comentarios (opcional)..." : "Motivo obligatorio..."}
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>
                </ConfirmationModal>
            )}

            {/* Modal de Perfil de Empleado */}
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

const KpiCard = ({ title, value, total, groupValue, groupTotal, labelTotal, icon, color, barColor, isError = false }: any) => {
    const percent = total > 0 ? (value / total) * 100 : 0;
    const groupPercent = groupTotal > 0 ? (groupValue / groupTotal) * 100 : 0;

    return (
        <div className={`p-5 rounded-2xl border ${isError && value > 0 ? 'border-red-100 bg-red-50/30' : 'border-slate-200 bg-white'} shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between`}>
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                    <h3 className={`text-3xl font-black mt-1 ${isError && value > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                        {value}
                    </h3>
                </div>
                <div className={`p-2.5 rounded-xl ${color} bg-opacity-20`}>
                    {icon}
                </div>
            </div>

            <div className="mt-4 space-y-4">
                {/* Progress for filtered view */}
                {total !== undefined && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-medium text-slate-400">
                            <span>{labelTotal || 'Filtro actual'}</span>
                            <span className="font-semibold">{value} / {total}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor || 'bg-slate-900'}`}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Progress for entire group */}
                {groupValue !== undefined && groupTotal !== undefined && total !== groupTotal && (
                    <div className="space-y-1 pt-3 border-t border-slate-100">
                        <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                            <span>Grupo de Nómina</span>
                            <span className="text-slate-600">{Math.round(groupPercent)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor || 'bg-slate-900'} opacity-40`}
                                style={{ width: `${groupPercent}%` }}
                            />
                        </div>
                        <div className="text-right text-[10px] text-slate-400 mt-0.5">
                            {groupValue} / {groupTotal}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PayrollClosingPage;