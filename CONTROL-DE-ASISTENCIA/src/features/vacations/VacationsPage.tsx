import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Palmtree, Users, UserCircle, Plus,
    CheckCircle2, FileText, Umbrella, Zap, Loader2, ShieldCheck, RefreshCcw
} from 'lucide-react';
import { useVacationForm } from '../../hooks/useVacationForm';
import { EmployeeProfileModal } from '../attendance/EmployeeProfileModal';
import { Tooltip } from '../../components/ui/Tooltip';

import { parseSQLDate, VacationMode, VacationDetailModalState } from '../../types/vacations';
import { EmployeeSidebar } from './EmployeeSidebar';
import { VacationHistoryTimeline } from './VacationHistoryTimeline';
import { ApprovalsTable } from './ApprovalsTable';
import { VacationRequestModal } from './VacationRequestModal';
import { VacationDetailModal } from './VacationDetailModal';

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
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [expandedYear, setExpandedYear] = useState<number | null>(null);
    const [yearDetails, setYearDetails] = useState<Record<number, any>>({});
    const [vacationMode, setVacationMode] = useState<VacationMode>('FIN');
    const [officialMode, setOfficialMode] = useState<VacationMode>('FIN');
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
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);

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
            case 'Cancelado': return 'bg-slate-100 text-slate-500 ring-1 ring-slate-200';
            case 'PendienteHorario': return 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-200';
            default: return 'bg-amber-100 text-amber-700 ring-1 ring-amber-200';
        }
    };

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
                    if (histData.length > 0 && selectedYear === null) {
                        setSelectedYear(Math.max(...histData.map((h: any) => h.Anio)));
                    }
                } else {
                    setHistory([]);
                }
                if (reqRes.ok) setRequests(await reqRes.json());
            } else {
                const reqsRes = await fetch(reqUrl, { headers });
                if (reqsRes.ok) setRequests(await reqsRes.json());
                setBalance(null);
                setHistory([]);
            }

            if (isManager && employees.length === 0) {
                const empRes = await fetch(`${API_BASE_URL}/employees/permitted`, { headers });
                if (empRes.ok) {
                    const emps = await empRes.json();
                    setEmployees(emps);
                    if (emps.length > 0 && !selectedEmployeeId) setSelectedEmployeeId(emps[0].EmpleadoId);
                }
            }

            // Fetch calendar events once for holiday calculation (feeds the form hook + DateRangePicker dots)
            if (calendarEvents.length === 0) {
                const evRes = await fetch(`${API_BASE_URL}/calendar-events`, { headers });
                if (evRes.ok) setCalendarEvents(await evRes.json());
            }
        } catch (e) {
            console.error('fetchData Error:', e);
            addNotification('Error', 'No se pudo cargar la información de vacaciones.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const loadYearDetails = async (empleadoId: number | undefined, year: number) => {
        if (!empleadoId || !year || year <= 0) return null;
        const token = getToken();
        try {
            const res = await fetch(`${API_BASE_URL}/vacations/details/${empleadoId}/${year}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setYearDetails(prev => ({ ...prev, [year]: data }));
                return data;
            }
        } catch (error) {
            console.error(error);
        }
        return null;
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
        setSelectedYear(null);
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
        calendarEvents,
        onDaysCalculated: setCalculatedDays
    });

    const openCreateModal = () => {
        resetForm();

        let initialEmpId = '';
        if (activeTab === 'my_vacations') {
            initialEmpId = user?.EmpleadoId ? String(user.EmpleadoId) : '';
        } else if (activeTab === 'team_vacations' && selectedEmployeeId) {
            initialEmpId = String(selectedEmployeeId);
        }

        setNewRequest((prev: any) => ({
            ...prev,
            empleadoId: initialEmpId
        }));
        setIsRequestModalOpen(true);
    };

    const handleCreateRequest = async () => {
        if (!newRequest.fechaInicio || !newRequest.fechaFin) {
            addNotification('Atención', 'Selecciona un periodo de fechas válido.', 'warning');
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
                    // Integridad: si no es manager, usar el ID de sesión siempre
                    empleadoId: !isManager ? (user?.EmpleadoId || 0) : (newRequest.empleadoId ? parseInt(newRequest.empleadoId) : 0),
                    fechaInicio: newRequest.fechaInicio,
                    fechaFin: newRequest.fechaFin,
                    comentarios: newRequest.comentarios
                    // diasSolicitados, diasNaturales, diasFeriados calculados por el SP en el backend
                })
            });
            const data = await res.json();
            if (res.ok) {
                const isPendienteHorario = data.estatus === 'PendienteHorario';
                addNotification(
                    isPendienteHorario ? 'Solicitud en espera de horario' : 'Éxito',
                    data.message || 'Solicitud creada correctamente.',
                    isPendienteHorario ? 'warning' : 'success'
                );
                setIsRequestModalOpen(false);
                fetchData();
            } else {
                addNotification('Error', data.message || 'Error al crear solicitud.', 'error');
            }
        } catch { addNotification('Error', 'Revisa la conexión.', 'error'); }
    };

    const handleApproveReject = async (id: number, estatus: 'Aprobado' | 'Rechazado' | 'Cancelado') => {
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

    const handleSaveExtraordinary = async (saldoId: number, dias: number, fecha: string, detalleId?: number | null) => {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/vacations/adjustment/detail`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                saldoId,
                fecha,
                dias,
                tipo: 'Ajuste',
                detalleId
            })
        });
        if (res.ok) {
            const targetId = activeTab === 'team_vacations' ? selectedEmployeeId ?? undefined : user?.EmpleadoId;
            if (targetId && detailModal?.year) {
                loadYearDetails(targetId, detailModal.year).then((refreshedData: any) => {
                    if (refreshedData && detailModal) {
                        setDetailModal({ ...detailModal, data: refreshedData });
                    }
                });
            }
            fetchData();
        }
    };

    const handleDeleteExtraordinary = async (detalleId: number) => {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/vacations/adjustment/detail/${detalleId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const targetId = activeTab === 'team_vacations' ? selectedEmployeeId ?? undefined : user?.EmpleadoId;
            if (targetId && detailModal?.year) {
                loadYearDetails(targetId, detailModal.year).then((refreshedData: any) => {
                    if (refreshedData && detailModal) {
                        setDetailModal({ ...detailModal, data: refreshedData });
                    }
                });
            }
            fetchData();
        }
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

    return (
        <div className="py-2 md:py-3 flex flex-col animate-fade-in h-full overflow-hidden" style={{ height: 'calc(100vh - 75px)' }}>
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
            </div>

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

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--theme-500]"></div>
                </div>
            ) : activeTab === 'my_vacations' && !user?.EmpleadoId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
                    <div className="p-4 bg-orange-50 rounded-full mb-4">
                        <UserCircle size={48} className="text-orange-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Usuario no vinculado a empleado</h2>
                    <p className="text-slate-500 max-w-md">Tu cuenta actual de sistema no está asociada a ningún folio de empleado.<br /><br />Para poder consultar e ingresar solicitudes de vacaciones a tu nombre de forma automática, necesitas que un Administrador te asigne el vinculo desde tu perfil.</p>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    {(activeTab === 'my_vacations' || activeTab === 'team_vacations') && (
                        <div className="flex flex-row gap-0 items-stretch h-full overflow-hidden">
                            {activeTab === 'team_vacations' && (
                                <EmployeeSidebar
                                    employees={employees}
                                    filteredEmployees={filteredEmployees}
                                    searchTerm={searchTerm}
                                    selectedEmployeeId={selectedEmployeeId}
                                    sidebarWidth={sidebarWidth}
                                    sidebarRef={sidebarRef}
                                    isResizing={isResizing}
                                    vacationMode={vacationMode}
                                    onSearch={setSearchTerm}
                                    onSelectEmployee={setSelectedEmployeeId}
                                    onStartResize={() => setIsResizing(true)}
                                    onViewProfile={setViewingEmployeeId}
                                />
                            )}

                            <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar px-1 flex flex-col gap-4">
                                {displayData && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                                        </div>

                                        <div className={`bg-gradient-to-br ${(displayData?.DiasRestantes || 0) < 0 ? 'from-rose-500 to-rose-700' : 'from-[--theme-500] to-[--theme-700]'} p-3.5 rounded-xl shadow-sm text-white flex flex-col items-center justify-center relative overflow-hidden`}>
                                            <div className="absolute -right-4 -top-4 opacity-10"><Palmtree size={100} /></div>
                                            <span className="text-xs font-semibold text-[--theme-100] uppercase tracking-wider relative z-10">{isCumulative ? 'Saldo Acumulado' : 'Saldo al Periodo'}</span>
                                            <span className="text-4xl font-bold mt-0.5 relative z-10">{formatValue(displayData?.DiasRestantes ?? 0)}</span>
                                        </div>
                                    </div>
                                )}

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

                                <div className="flex flex-col flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50/50">
                                        <h2 className="text-base font-bold text-slate-800">
                                            {activeTab === 'team_vacations' ? 'Trámites de Vacaciones' : 'Mis Trámites de Vacaciones'}
                                        </h2>
                                        <button
                                            onClick={openCreateModal}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-[--theme-500] hover:bg-[--theme-600] text-white rounded-lg transition-colors shadow-sm font-medium text-sm"
                                        >
                                            <Plus size={16} />
                                            Nueva Solicitud
                                        </button>
                                    </div>
                                    <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                                        <ApprovalsTable
                                            requests={requests}
                                            getStatusStyle={getStatusStyle}
                                            onApproveReject={handleApproveReject}
                                            user={user}
                                            activasTitle={activeTab === 'team_vacations' ? 'Solicitudes Activas del Empleado' : 'Mis Solicitudes Activas'}
                                            historicoTitle={activeTab === 'team_vacations' ? 'Histórico del Empleado' : 'Mi Histórico'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'approvals' && (
                        <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1">
                            <ApprovalsTable
                                requests={requests}
                                getStatusStyle={getStatusStyle}
                                onApproveReject={handleApproveReject}
                                user={user}
                            />
                        </div>
                    )}
                </div>
            )}

            <VacationRequestModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                isManager={isManager}
                employees={employees}
                newRequest={newRequest}
                setNewRequest={setNewRequest}
                handleInputChange={handleInputChange}
                handleCreateRequest={handleCreateRequest}
                vacationMode={vacationMode}
                isSelfRequest={activeTab === 'my_vacations'}
                calendarEvents={calendarEvents}
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
                canManageVacations={canManageVacations}
                onSaveAdjustment={handleSaveExtraordinary}
                onDeleteAdjustment={handleDeleteExtraordinary}
            />

            <div className="fixed bottom-2 right-2 text-[10px] text-slate-300 pointer-events-none">UI: Antigravity-V2</div>
        </div>
    );
};
