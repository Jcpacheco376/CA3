import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';
import { format, differenceInCalendarDays } from 'date-fns';
import {
    Palmtree, Users, UserCircle, Plus,
    CheckCircle2, FileText, Umbrella, Zap, Edit, RefreshCw
} from 'lucide-react';
import { useVacationForm } from '../../hooks/useVacationForm';
import { EmployeeProfileModal } from '../attendance/EmployeeProfileModal';

import { parseSQLDate, VacationMode, VacationDetailModalState, ExtraordinaryModalState } from '../../types/vacations';
import { EmployeeSidebar } from './EmployeeSidebar';
import { VacationHistoryTimeline } from './VacationHistoryTimeline';
import { ApprovalsTable } from './ApprovalsTable';
import { VacationRequestModal } from './VacationRequestModal';
import { VacationDetailModal } from './VacationDetailModal';
import { ExtraordinaryAdjustmentModal } from './ExtraordinaryAdjustmentModal';

export const VacationsPage = () => {
    const { user, getToken, can } = useAuth();
    const { addNotification } = useNotification();
    const canManageVacations = can('vacaciones.manage');
    const canApproveVacations = can('vacaciones.approve');
    const isManager = !!(canManageVacations || canApproveVacations ||
        (user?.Roles && Array.isArray(user.Roles) && user.Roles.some(r =>
            r.NombreRol?.toUpperCase() === 'SADMIN' ||
            r.NombreRol?.toUpperCase() === 'ADMINISTRADOR' ||
            r.NombreRol?.toUpperCase() === 'ADMIN'
        )));

    const canReadVacations = can('vacaciones.read') || isManager;

    const [activeTab, setActiveTab] = useState<'team_vacations' | 'my_vacations' | 'approvals'>(
        canApproveVacations ? 'approvals' : (isManager ? 'team_vacations' : 'my_vacations')
    );
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [balance, setBalance] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [detailModal, setDetailModal] = useState<VacationDetailModalState | null>(null);
    const [extraordinaryModal, setExtraordinaryModal] = useState<ExtraordinaryModalState | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(null);
    const [yearDetails, setYearDetails] = useState<Record<number, any>>({});
    const [vacationMode, setVacationMode] = useState<VacationMode>('FIN');
    const [officialMode, setOfficialMode] = useState<VacationMode>('FIN');
    const [extraValue, setExtraValue] = useState(0);
    const [extraFecha, setExtraFecha] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [isVacationModeHovered, setIsVacationModeHovered] = useState(false);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sidebarWidth, setSidebarWidth] = useState(260);
    const [isResizing, setIsResizing] = useState(false);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);
    const [calculatedDays, setCalculatedDays] = useState(0);

    const sidebarRef = useRef<HTMLDivElement>(null);
    const historyContainerRef = useRef<HTMLDivElement>(null);

    const maxAnio = history.length > 0 ? Math.max(...history.map(h => h.Anio)) : 0;
    const currentYear = selectedYear || maxAnio;

    // ── Derived state ─────────────────────────────────────────────────────────
    const filteredEmployees = React.useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        if (searchWords.length === 0) return employees;
        return employees.filter(emp => {
            const fieldsToSearch = [
                emp.NombreCompleto || '',
                emp.CodRef || '',
                emp.PuestoNombre || '',
                emp.DepartamentoNombre || ''
            ].map(f => f.toLowerCase());
            return searchWords.every(word => fieldsToSearch.some(field => field.includes(word)));
        });
    }, [employees, searchTerm]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const getProportionalValue = (h: any) => {
        const start = h.FechaInicio ? parseSQLDate(h.FechaInicio) : (h.FechaInicioPeriodo ? parseSQLDate(h.FechaInicioPeriodo) : null);
        const end = h.FechaFin ? parseSQLDate(h.FechaFin) : (h.FechaFinPeriodo ? parseSQLDate(h.FechaFinPeriodo) : null);
        if (!start || !end) return h.DiasOtorgados || 0;
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const dStart = new Date(start); dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(end); dEnd.setHours(23, 59, 59, 999);
        if (today < dStart) return 0;
        if (today > dEnd) return h.DiasOtorgados || 0;
        switch (vacationMode) {
            case 'FIN': return 0;
            case 'INI': return h.DiasOtorgados || 0;
            case 'DEV': {
                const totalDays = differenceInCalendarDays(dEnd, dStart) + 1;
                const elapsedDays = differenceInCalendarDays(today, dStart) + 1;
                const ratio = Math.min(1, Math.max(0, elapsedDays / totalDays));
                return (h.DiasOtorgados || 0) * ratio;
            }
            default: return 0;
        }
    };

    const formatValue = (val: number): string | number => {
        if (vacationMode !== 'DEV') return Math.round(val);
        return Number.isInteger(val) ? val.toString() : val.toFixed(2);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Aprobado': return 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200';
            case 'Rechazado': return 'bg-rose-100 text-rose-700 ring-1 ring-rose-200';
            default: return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
        }
    };

    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
                <FileText className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No hay solicitudes</h3>
            <p className="text-slate-500 max-w-sm text-center mt-2">Aún no hay registros en esta sección.</p>
        </div>
    );

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchData = async (showLoader = true) => {
        if (showLoader) setIsLoading(true);
        const token = getToken();
        if (!token) return;
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const reqUrl = (isManager && activeTab === 'approvals')
                ? `${API_BASE_URL}/vacations/requests`
                : (activeTab === 'team_vacations' && selectedEmployeeId)
                    ? `${API_BASE_URL}/vacations/requests?empleadoId=${selectedEmployeeId}`
                    : `${API_BASE_URL}/vacations/requests?empleadoId=${user?.EmpleadoId || 0}`;

            const reqsRes = await fetch(reqUrl, { headers });
            if (reqsRes.ok) setRequests(await reqsRes.json());

            const targetEmpleadoId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
            if (targetEmpleadoId && activeTab !== 'approvals') {
                const [balRes, histRes, reqRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/vacations/balance/${targetEmpleadoId}`, { headers }),
                    fetch(`${API_BASE_URL}/vacations/history/${targetEmpleadoId}`, { headers }),
                    fetch(reqUrl, { headers })
                ]);
                if (balRes.ok) setBalance(await balRes.json()); else setBalance(null);
                if (histRes.ok) {
                    const histData = await histRes.json();
                    setHistory(histData);
                    if (histData.length > 0 && !selectedYear) {
                        setSelectedYear(Math.max(...histData.map((h: any) => h.Anio)));
                    }
                } else {
                    setHistory([]);
                }
                if (reqRes.ok) setRequests(await reqRes.json());
            } else {
                const reqsRes2 = await fetch(reqUrl, { headers });
                if (reqsRes2.ok) setRequests(await reqsRes2.json());
                setBalance(null);
                setHistory([]);
            }

            if (isManager && employees.length === 0) {
                const empRes = await fetch(`${API_BASE_URL}/employees`, { headers });
                if (empRes.ok) {
                    const emps = await empRes.json();
                    const activeEmps = emps.filter((e: any) => e.Activo);
                    setEmployees(activeEmps);
                    if (activeEmps.length > 0 && !selectedEmployeeId) setSelectedEmployeeId(activeEmps[0].EmpleadoId);
                }
            }
        } catch (e) {
            console.error('fetchData Error:', e);
            addNotification('Error', 'No se pudo cargar la información de vacaciones.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadYearDetails = async (empleadoId: number | undefined, year: number) => {
        if (!empleadoId || yearDetails[year]) return;
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/vacations/details/${empleadoId}/${year}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setYearDetails(prev => ({ ...prev, [year]: data }));
        }
    };

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadConfig = async () => {
            try {
                const token = getToken();
                const res = await fetch(`${API_BASE_URL}/catalogs/system-config`, { headers: { 'Authorization': `Bearer ${token}` } });
                if (res.ok) {
                    const cfg = await res.json();
                    const mode = (cfg.VacacionesModoOtorgamiento || 'FIN').toUpperCase() as VacationMode;
                    if (['FIN', 'DEV', 'INI'].includes(mode)) { setOfficialMode(mode); setVacationMode(mode); }
                }
            } catch { /* fallback FIN */ }
        };
        loadConfig();
    }, []);

    useEffect(() => {
        fetchData(activeTab !== 'team_vacations' || !selectedEmployeeId);
    }, [activeTab, selectedEmployeeId]);

    useEffect(() => {
        setYearDetails({});
        setExpandedYear(null);
    }, [selectedEmployeeId, activeTab]);

    useEffect(() => {
        if (activeTab === 'team_vacations' && filteredEmployees.length === 1 && searchTerm.trim() !== '') {
            const singleEmpId = filteredEmployees[0].EmpleadoId;
            if (selectedEmployeeId !== singleEmpId) setSelectedEmployeeId(singleEmpId);
        }
    }, [filteredEmployees, activeTab, selectedEmployeeId, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.group\\/card')) setExpandedYear(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0);
            if (newWidth > 200 && newWidth < 600) setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const { newRequest, setNewRequest, handleInputChange, resetForm } = useVacationForm({
        initialEmployeeId: (canManageVacations && activeTab === 'team_vacations' && selectedEmployeeId) ? String(selectedEmployeeId) : '',
        onDaysCalculated: setCalculatedDays
    });

    const openCreateModal = () => {
        resetForm();
        setNewRequest(prev => ({
            ...prev,
            empleadoId: (isManager && activeTab === 'team_vacations' && selectedEmployeeId) ? String(selectedEmployeeId) : ''
        }));
        setIsRequestModalOpen(true);
    };

    const handleCreateRequest = async () => {
        if (!newRequest.fechaInicio || !newRequest.fechaFin || calculatedDays <= 0) {
            addNotification('Atención', 'Datos de solicitud inválidos. Asegúrate de seleccionar fechas válidas.', 'warning');
            return;
        }
        if (isManager && !newRequest.empleadoId) {
            addNotification('Atención', 'Debes seleccionar a un empleado de la lista.', 'warning');
            return;
        }
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/vacations/request`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId: isManager && newRequest.empleadoId ? parseInt(newRequest.empleadoId) : user?.EmpleadoId,
                    fechaInicio: newRequest.fechaInicio,
                    fechaFin: newRequest.fechaFin,
                    diasSolicitados: calculatedDays,
                    comentarios: newRequest.comentarios
                })
            });
            if (res.ok) {
                addNotification('Éxito', 'Solicitud creada correctamente.', 'success');
                setIsRequestModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                addNotification('Error', data.message || 'Error al crear solicitud.', 'error');
            }
        } catch { addNotification('Error', 'Revisa la conexión.', 'error'); }
    };

    const handleApproveReject = async (id: number, estatus: 'Aprobado' | 'Rechazado') => {
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/vacations/approve/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ estatus })
            });
            if (res.ok) { addNotification('Éxito', 'Solicitud procesada.', 'success'); fetchData(); }
            else { const data = await res.json(); addNotification('Error', data.message || 'Error al procesar.', 'error'); }
        } catch { addNotification('Error', 'Debe conectarse al servidor.', 'error'); }
    };

    const handleRecalculate = async () => {
        const targetId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
        if (!targetId) return;
        setIsRecalculating(true);
        try {
            const token = getToken();
            await fetch(`${API_BASE_URL}/vacations/recalculate/${targetId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            await fetchData(false);
            addNotification('Éxito', 'Saldos recalculados.', 'success');
        } catch { addNotification('Error', 'Error al recalcular.', 'error'); }
        finally { setIsRecalculating(false); }
    };

    const handleSaveExtraordinary = async () => {
        if (!extraordinaryModal) return;
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/vacations/adjustment/detail`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                saldoId: extraordinaryModal.saldoId,
                fecha: extraFecha,
                dias: extraValue,
                tipo: 'Ajuste',
                detalleId: extraordinaryModal.detalleId
            })
        });
        if (res.ok) { setExtraordinaryModal(null); fetchData(); }
    };

    const handleOpenExtraordinaryEdit = async (saldoId: number, diasAjuste: number, year: number) => {
        const targetId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/vacations/details/${targetId}/${year}`, { headers: { 'Authorization': `Bearer ${token}` } });
        let existingAdjustment = null;
        if (res.ok) {
            const data = await res.json();
            existingAdjustment = data.ajustes?.find((a: any) => (a.tipo || a.Tipo || '').toString().toLowerCase() === 'ajuste');
        }
        if (existingAdjustment) {
            const diasVal = existingAdjustment.dias !== undefined ? existingAdjustment.dias : existingAdjustment.Dias;
            setExtraValue(parseFloat(diasVal) || 0);
        } else {
            setExtraValue(0);
        }
        setExtraordinaryModal({
            saldoId,
            currentValue: diasAjuste,
            detalleId: existingAdjustment?.detalleId || existingAdjustment?.DetalleId || null
        });
    };

    // ── Computed display data for summary cards ────────────────────────────────
    const isCumulative = currentYear === maxAnio;
    let displayData: any = null;

    if (history.length > 0) {
        const relevantHistory = history.filter(h => h.Anio <= currentYear);
        displayData = relevantHistory.reduce((acc, curr) => {
            const currentOtorgados = getProportionalValue(curr);
            return {
                ...acc,
                Anio: currentYear,
                DiasOtorgados: (acc.DiasOtorgados || 0) + currentOtorgados,
                DiasDisfrutados: (acc.DiasDisfrutados || 0) + (curr.DiasDisfrutados || 0),
                DiasPagados: (acc.DiasPagados || 0) + (curr.DiasPagados || 0),
                DiasAjuste: (acc.DiasAjuste || 0) + (curr.DiasAjuste || 0),
                ...(curr.Anio === currentYear ? {
                    FechaInicioPeriodo: curr.FechaInicio,
                    FechaFinPeriodo: curr.FechaFin,
                    SaldoId: curr.SaldoId
                } : {})
            };
        }, { ...history[0], DiasOtorgados: 0, DiasDisfrutados: 0, DiasPagados: 0, DiasAjuste: 0 });
        displayData.DiasRestantes = (displayData.DiasOtorgados || 0) - (displayData.DiasDisfrutados || 0);
    } else if (balance) {
        const propOtorgados = getProportionalValue(balance);
        displayData = { ...balance, DiasOtorgados: propOtorgados, DiasRestantes: propOtorgados - (balance.DiasDisfrutados || 0) };
    }

    // ── Guard ─────────────────────────────────────────────────────────────────
    if (!canReadVacations) {
        return (
            <div className="p-12 text-center">
                <h2 className="text-xl font-bold text-slate-800">No tienes acceso</h2>
                <p className="text-slate-500">No tienes los permisos necesarios para ver esta página.</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="py-2 md:py-3 flex flex-col animate-fade-in h-full overflow-hidden" style={{ height: 'calc(100vh - 75px)' }}>
            {/* Page header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[--theme-100] text-[--theme-600] rounded-lg">
                        <Palmtree size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Control de Vacaciones</h1>
                        <p className="text-sm text-slate-500 font-medium tracking-wide">Gestión de descansos y aprobaciones de plantilla</p>
                    </div>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-2 px-4 py-2 bg-[--theme-500] hover:bg-[--theme-600] text-white rounded-lg transition-colors shadow-sm font-medium"
                >
                    <Plus size={18} />
                    Nueva Solicitud
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mb-3 flex-shrink-0">
                {canManageVacations && (
                    <button
                        onClick={() => setActiveTab('team_vacations')}
                        className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'team_vacations' ? 'border-[--theme-500] text-[--theme-600]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Users size={16} />
                        Gestión de Equipo
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('my_vacations')}
                    className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'my_vacations' ? 'border-[--theme-500] text-[--theme-600]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <UserCircle size={16} />
                    Mis Vacaciones
                </button>
                {canApproveVacations && (
                    <button
                        onClick={() => setActiveTab('approvals')}
                        className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'approvals' ? 'border-[--theme-500] text-[--theme-600]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <CheckCircle2 size={16} />
                        Autorizaciones Pendientes
                    </button>
                )}
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--theme-500]"></div>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    {/* My Vacations / Team Vacations */}
                    {(activeTab === 'my_vacations' || activeTab === 'team_vacations') && (
                        <div className="flex flex-row gap-0 items-stretch h-full overflow-hidden">
                            {/* Employee sidebar (team only) */}
                            {activeTab === 'team_vacations' && (
                                <EmployeeSidebar
                                    employees={employees}
                                    filteredEmployees={filteredEmployees}
                                    searchTerm={searchTerm}
                                    selectedEmployeeId={selectedEmployeeId}
                                    sidebarWidth={sidebarWidth}
                                    sidebarRef={sidebarRef}
                                    isResizing={isResizing}
                                    onSearch={setSearchTerm}
                                    onSelectEmployee={setSelectedEmployeeId}
                                    onStartResize={() => setIsResizing(true)}
                                    onViewProfile={setViewingEmployeeId}
                                />
                            )}

                            {/* Main panel */}
                            <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar px-1 space-y-4">
                                {/* Summary cards */}
                                {displayData && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {/* Otorgados */}
                                        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative group">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                                                {displayData?.FechaInicioPeriodo && displayData?.FechaFinPeriodo ? (
                                                    <>{currentYear === maxAnio ? 'Total Acumulado' : `Saldo al ${currentYear}`}<br /><span className="text-[10px] lowercase italic font-normal text-slate-400">{format(parseSQLDate(displayData.FechaInicioPeriodo)!, 'dd MMM yy')} - {format(parseSQLDate(displayData.FechaFinPeriodo)!, 'dd MMM yy')}</span></>
                                                ) : `${currentYear === maxAnio ? 'Total Acumulado' : `Saldo al ${currentYear}`} (Aniv. ${displayData?.Anio || '-'})`}
                                            </span>
                                            <span className="text-3xl font-bold text-slate-800 mt-0.5">{formatValue(displayData?.DiasOtorgados || 0)}</span>
                                            {isCumulative && (
                                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md border border-indigo-100 uppercase tracking-tighter">
                                                    Acumulado
                                                </div>
                                            )}
                                        </div>

                                        {/* Consumidos */}
                                        <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative group">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isCumulative ? 'Total Consumidos' : 'Consumidos'}</span>
                                            <span className="text-3xl font-bold text-blue-600 mt-0.5">{formatValue(displayData?.DiasDisfrutados || 0)}</span>
                                            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                                                <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1 uppercase tracking-tight">
                                                    <Umbrella size={10} /> {formatValue((displayData?.DiasDisfrutados || 0) - (displayData?.DiasAjuste || 0) - (displayData?.DiasPagados || 0))} DISFRUTADOS
                                                </span>
                                                {(displayData?.DiasPagados > 0 || displayData?.DiasAjuste !== 0) && (
                                                    <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1 uppercase tracking-tight">
                                                        <Zap size={10} />
                                                        {displayData?.DiasPagados > 0 ? `${formatValue(displayData?.DiasPagados || 0)} PAGADOS` : ''}
                                                        {displayData?.DiasPagados > 0 && (displayData?.DiasAjuste || 0) !== 0 ? ' + ' : ''}
                                                        {(displayData?.DiasAjuste || 0) !== 0 ? `${(displayData?.DiasAjuste || 0) > 0 ? '+' : ''}${formatValue(displayData?.DiasAjuste || 0)} AJUSTE` : ''}
                                                    </span>
                                                )}
                                            </div>
                                            {!isCumulative && canManageVacations && (
                                                <button
                                                    onClick={() => handleOpenExtraordinaryEdit(displayData?.SaldoId || 0, displayData?.DiasAjuste || 0, currentYear)}
                                                    className="absolute top-2 right-2 p-1.5 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Disponibles */}
                                        <div className="bg-gradient-to-br from-[--theme-500] to-[--theme-700] p-3.5 rounded-xl shadow-sm text-white flex flex-col items-center justify-center relative overflow-hidden">
                                            <div className="absolute -right-4 -top-4 opacity-10"><Palmtree size={100} /></div>
                                            <span className="text-xs font-semibold text-[--theme-100] uppercase tracking-wider relative z-10">{isCumulative ? 'Saldo Acumulado' : 'Saldo al Periodo'}</span>
                                            <span className="text-4xl font-bold mt-0.5 relative z-10">{formatValue(displayData?.DiasRestantes ?? 0)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* History timeline */}
                                <VacationHistoryTimeline
                                    history={history}
                                    balance={balance}
                                    selectedYear={selectedYear}
                                    expandedYear={expandedYear}
                                    yearDetails={yearDetails}
                                    vacationMode={vacationMode}
                                    officialMode={officialMode}
                                    isVacationModeHovered={isVacationModeHovered}
                                    canManageVacations={canManageVacations}
                                    isRecalculating={isRecalculating}
                                    employees={employees}
                                    selectedEmployeeId={selectedEmployeeId}
                                    activeTab={activeTab}
                                    user={user}
                                    onYearSelect={setSelectedYear}
                                    onYearExpand={setExpandedYear}
                                    onLoadYearDetails={loadYearDetails}
                                    onOpenDetailModal={setDetailModal}
                                    onRecalculate={handleRecalculate}
                                    onModeChange={setVacationMode}
                                    onModeHover={setIsVacationModeHovered}
                                    formatValue={formatValue}
                                    getProportionalValue={getProportionalValue}
                                    historyContainerRef={historyContainerRef}
                                />

                                {/* Requests table */}
                                <div>
                                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <h2 className="text-base font-bold text-slate-800">Historial de Solicitudes</h2>
                                    </div>
                                    {requests.length === 0 ? renderEmptyState() : (
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                                                    <tr>
                                                        <th className="px-5 py-3 font-bold">Fechas</th>
                                                        <th className="px-5 py-3 font-bold text-center">Días</th>
                                                        <th className="px-5 py-3 font-bold">Estado</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm">
                                                    {requests.map(req => (
                                                        <tr key={req.SolicitudId} className="hover:bg-slate-50">
                                                            <td className="px-5 py-3">
                                                                <div className="font-medium">{format(parseSQLDate(req.FechaInicio)!, 'dd MMM yy')} - {format(parseSQLDate(req.FechaFin)!, 'dd MMM yy')}</div>
                                                            </td>
                                                            <td className="px-5 py-3 text-center">{req.DiasSolicitados}</td>
                                                            <td className="px-5 py-3">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusStyle(req.Estatus)}`}>{req.Estatus}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Approvals tab */}
                    {activeTab === 'approvals' && (
                        <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1">
                            <ApprovalsTable
                                requests={requests}
                                getStatusStyle={getStatusStyle}
                                onApproveReject={handleApproveReject}
                            />
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            <VacationRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                isManager={isManager}
                employees={employees}
                newRequest={newRequest}
                setNewRequest={setNewRequest}
                handleInputChange={handleInputChange}
                handleCreateRequest={handleCreateRequest}
            />

            {viewingEmployeeId && (
                <EmployeeProfileModal
                    employeeId={viewingEmployeeId as any}
                    onClose={() => setViewingEmployeeId(null)}
                    getToken={getToken}
                    user={user}
                />
            )}

            <VacationDetailModal
                detailModal={detailModal}
                onClose={() => setDetailModal(null)}
                getStatusStyle={getStatusStyle}
            />

            <ExtraordinaryAdjustmentModal
                extraordinaryModal={extraordinaryModal}
                onClose={() => setExtraordinaryModal(null)}
                extraValue={extraValue}
                setExtraValue={setExtraValue}
                extraFecha={extraFecha}
                setExtraFecha={setExtraFecha}
                onSave={handleSaveExtraordinary}
            />

            <div className="fixed bottom-2 right-2 text-[10px] text-slate-300 pointer-events-none">UI: Antigravity-V2</div>
        </div>
    );
};
