import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { useNotification } from '../../context/NotificationContext';
import { format, differenceInCalendarDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Palmtree, Users, CalendarDays, Plus, UserCircle, Search,
    Clock, CheckCircle2, XCircle, Trash2, Edit, FileText, Contact,
    RefreshCw, CreditCard, ChevronRight, X as XIcon, AlertCircle,
    Umbrella, Zap, SlidersHorizontal, Info, History
} from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { Tooltip } from '../../components/ui/Tooltip';
import { useVacationForm } from '../../hooks/useVacationForm';
import { EmployeeProfileModal } from '../attendance/EmployeeProfileModal';

export const VacationsPage = () => {
    const { user, getToken, can } = useAuth();
    const { addNotification } = useNotification();
    const canManageVacations = can('vacaciones.manage');
    const canApproveVacations = can('vacaciones.approve');
    const isManager = canManageVacations || canApproveVacations ||
        (user?.Roles && Array.isArray(user.Roles) && user.Roles.some(r =>
            r.NombreRol?.toUpperCase() === 'SADMIN' ||
            r.NombreRol?.toUpperCase() === 'ADMINISTRADOR' ||
            r.NombreRol?.toUpperCase() === 'ADMIN'
        ));

    const canReadVacations = can('vacaciones.read') || isManager;

    const [activeTab, setActiveTab] = useState<'team_vacations' | 'my_vacations' | 'approvals'>(
        canApproveVacations ? 'approvals' : (isManager ? 'team_vacations' : 'my_vacations')
    );
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
    const [balance, setBalance] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [detailModal, setDetailModal] = useState<{ year: number; data: any } | null>(null);
    const [adjustmentModal, setAdjustmentModal] = useState<{ saldoId: number; year: number } | null>(null);
    const [extraordinaryModal, setExtraordinaryModal] = useState<{ saldoId: number; currentValue: number } | null>(null);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [showProportional, setShowProportional] = useState(false);
    const [newAdjustment, setNewAdjustment] = useState({ fecha: format(new Date(), 'yyyy-MM-dd'), dias: 1, descripcion: '' });
    const [extraValue, setExtraValue] = useState(0);
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Estado local para el conteo de días. Se pasa a useVacationForm
    const [calculatedDays, setCalculatedDays] = useState(0);

    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState(''); // Estado para la búsqueda

    // Lógica de filtrado memorizada
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

            return searchWords.every(word =>
                fieldsToSearch.some(field => field.includes(word))
            );
        });
    }, [employees, searchTerm]);

    const [sidebarWidth, setSidebarWidth] = useState(260); // Ancho inicial del sidebar
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

    // Auto-selección cuando solo queda un resultado
    useEffect(() => {
        if (activeTab === 'team_vacations' && filteredEmployees.length === 1 && searchTerm.trim() !== '') {
            const singleEmpId = filteredEmployees[0].EmpleadoId;
            if (selectedEmployeeId !== singleEmpId) {
                setSelectedEmployeeId(singleEmpId);
            }
        }
    }, [filteredEmployees, activeTab, selectedEmployeeId, searchTerm]);

    const getProportionalValue = (h: any) => {
        if (!showProportional) return h.DiasOtorgados || 0;

        // Fechas normalizadas
        const start = h.FechaInicio ? new Date(h.FechaInicio) : (h.FechaInicioPeriodo ? new Date(h.FechaInicioPeriodo) : null);
        const end = h.FechaFin ? new Date(h.FechaFin) : (h.FechaFinPeriodo ? new Date(h.FechaFinPeriodo) : null);
        if (!start || !end) return h.DiasOtorgados || 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dStart = new Date(start); dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(end); dEnd.setHours(23, 59, 59, 999);

        if (today > dEnd) return h.DiasOtorgados || 0; // Pasado: 100%
        if (today < dStart) return 0; // Futuro: 0%

        // Ciclo en curso: Proporción (Usando diferencia de días calendario para precisión exacta)
        // totalDays es la duración del periodo (normalmente 365 o 366)
        const totalDays = differenceInCalendarDays(dEnd, dStart) + 1;
        // elapsedDays es el tiempo transcurrido hasta hoy inclusive
        const elapsedDays = differenceInCalendarDays(today, dStart) + 1;

        const ratio = Math.min(1, Math.max(0, elapsedDays / totalDays));
        return (h.DiasOtorgados || 0) * ratio;
    };

    const formatValue = (val: number) => {
        if (!showProportional) return Math.round(val);
        return Number.isInteger(val) ? val.toString() : val.toFixed(2);
    };

    const { newRequest, setNewRequest, handleInputChange, resetForm } = useVacationForm({
        initialEmployeeId: (canManageVacations && activeTab === 'team_vacations' && selectedEmployeeId) ? String(selectedEmployeeId) : '',
        onDaysCalculated: setCalculatedDays
    });

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

            if (reqsRes.ok) {
                setRequests(await reqsRes.json());
            }

            // Fetch balance
            const targetEmpleadoId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
            if (targetEmpleadoId && activeTab !== 'approvals') {
                const [balRes, histRes, reqRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/vacations/balance/${targetEmpleadoId}`, { headers }),
                    fetch(`${API_BASE_URL}/vacations/history/${targetEmpleadoId}`, { headers }),
                    fetch(reqUrl, { headers })
                ]);

                if (balRes.ok) {
                    const balData = await balRes.json();
                    console.log('[DEBUG] Balance received:', balData);
                    setBalance(balData);
                    if (balData.Anio) setExtraValue(balData.DiasAjuste || 0);
                } else {
                    setBalance(null);
                }

                if (histRes.ok) {
                    const histData = await histRes.json();
                    console.log('[DEBUG] History received:', histData);
                    setHistory(histData);

                    // Set default selected year to the latest one if not set
                    if (histData.length > 0 && !selectedYear) {
                        const maxAnio = Math.max(...histData.map((h: any) => h.Anio));
                        setSelectedYear(maxAnio);
                    }
                } else {
                    setHistory([]);
                }

                if (reqRes.ok) {
                    const reqData = await reqRes.json();
                    console.log('[DEBUG] Requests received:', reqData);
                    setRequests(reqData);
                }
            } else {
                // If no targetEmpleadoId or activeTab is 'approvals', only fetch requests
                const reqsRes = await fetch(reqUrl, { headers });
                if (reqsRes.ok) {
                    const reqData = await reqsRes.json();
                    console.log('[DEBUG] Requests received (approvals/no target):', reqData);
                    setRequests(reqData);
                }
                setBalance(null);
                setHistory([]);
            }

            // Fetch Manager Employee List
            if (isManager && employees.length === 0) {
                const empRes = await fetch(`${API_BASE_URL}/employees`, { headers });
                if (empRes.ok) {
                    const emps = await empRes.json();
                    const activeEmps = emps.filter((e: any) => e.Activo);
                    setEmployees(activeEmps);
                    if (activeEmps.length > 0 && !selectedEmployeeId) {
                        setSelectedEmployeeId(activeEmps[0].EmpleadoId);
                    }
                }
            }
        } catch (e) {
            console.error("fetchData Error:", e);
            addNotification('Error', 'No se pudo cargar la información de vacaciones.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Solo mostramos el loader principal al cambiar de pestaña o carga inicial.
        // Al cambiar de empleado, lo hacemos de forma silenciosa para evitar parpadeo.
        fetchData(activeTab !== 'team_vacations' || !selectedEmployeeId);
    }, [activeTab, selectedEmployeeId]);

    const openCreateModal = () => {
        resetForm();
        setNewRequest(prev => ({
            ...prev,
            empleadoId: (isManager && activeTab === 'team_vacations' && selectedEmployeeId) ? String(selectedEmployeeId) : ''
        }));
        setIsRequestModalOpen(true);
    };

    const handleCreateRequest = async () => {
        // Validar que los días solicitados calculados no sean cero
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
                    diasSolicitados: calculatedDays, // Usar los días calculados
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
        } catch (e) {
            addNotification('Error', 'Revisa la conexión.', 'error');
        }
    };

    const handleApproveReject = async (id: number, estatus: 'Aprobado' | 'Rechazado') => {
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE_URL}/vacations/approve/${id}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ estatus })
            });

            if (res.ok) {
                addNotification('Éxito', `Solicitud procesada.`, 'success');
                fetchData();
            } else {
                const data = await res.json();
                addNotification('Error', data.message || 'Error al procesar.', 'error');
            }
        } catch (e) {
            addNotification('Error', 'Debe conectarse al servidor.', 'error');
        }
    };

    // Lógica para redimensionar el panel lateral
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Calculamos el nuevo ancho basado en el movimiento del mouse
            const newWidth = e.clientX - (sidebarRef.current?.getBoundingClientRect().left || 0);
            if (newWidth > 200 && newWidth < 600) {
                setSidebarWidth(newWidth);
            }
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
            <p className="text-slate-500 max-w-sm text-center mt-2">
                Aún no hay registros en esta sección.
            </p>
        </div>
    );

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

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center bg-white rounded-xl shadow-sm border border-slate-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--theme-500]"></div>
                </div>
            ) : (
                <div className="flex-1 min-h-0">
                    {(activeTab === 'my_vacations' || activeTab === 'team_vacations') && (
                        <div className="flex flex-row gap-0 items-stretch h-full overflow-hidden">
                            {/* Panel lateral de selección de empleado (Solo en Gestión de Equipo) */}
                            {activeTab === 'team_vacations' && (
                                <>
                                    <div
                                        ref={sidebarRef}
                                        style={{ width: sidebarWidth }}
                                        className="flex-shrink-0 hidden md:flex flex-col h-full"
                                    >
                                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                                            <div className="p-2 border-b border-slate-100 bg-slate-50 flex flex-col gap-1.5">
                                                <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                                                    <Users size={14} className="text-[--theme-500]" />
                                                    Directorio de Plantilla
                                                </h3>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                                        <Search size={12} className="text-slate-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar empleado..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-[--theme-500] focus:border-[--theme-500] transition-colors"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                                                {filteredEmployees.map(emp => (
                                                    <button
                                                        key={emp.EmpleadoId}
                                                        onClick={() => setSelectedEmployeeId(emp.EmpleadoId)}
                                                        className={`w-full text-left p-2 rounded-xl transition-all duration-200 focus:outline-none border shadow-sm group ${selectedEmployeeId === emp.EmpleadoId ? 'bg-[--theme-50] border-[--theme-400] ring-1 ring-[--theme-400] shadow-md' : 'bg-white border-slate-100 hover:border-[--theme-200] hover:bg-slate-50 hover:shadow-md'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-0.5 gap-2">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <div className={`font-semibold text-sm truncate ${selectedEmployeeId === emp.EmpleadoId ? 'text-[--theme-800]' : 'text-slate-700 group-hover:text-[--theme-700]'}`}>
                                                                    {emp.NombreCompleto}
                                                                </div>
                                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Tooltip text="Ver Ficha">
                                                                        <span
                                                                            onClick={(e) => { e.stopPropagation(); setViewingEmployeeId(emp.EmpleadoId); }}
                                                                            className="p-1 rounded-md text-slate-400 hover:text-[--theme-600] hover:bg-slate-100 cursor-pointer block"
                                                                        >
                                                                            <Contact size={14} />
                                                                        </span>
                                                                    </Tooltip>
                                                                </div>
                                                            </div>
                                                            <div className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${emp.SaldoVacacionesRestantes > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'} ${selectedEmployeeId === emp.EmpleadoId && emp.SaldoVacacionesRestantes > 0 ? 'ring-1 ring-emerald-300' : ''}`} title="Días Restantes">
                                                                <CalendarDays size={10} />
                                                                {emp.SaldoVacacionesRestantes || 0}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 opacity-80 group-hover:opacity-100 tracking-tight">
                                                            <span className={`px-1 py-0.5 rounded border ${selectedEmployeeId === emp.EmpleadoId ? 'bg-[--theme-100] text-[--theme-700] border-[--theme-200]' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{emp.CodRef}</span>
                                                            <span className="truncate">{emp.PuestoNombre || 'Sin Puesto'}</span>
                                                        </div>
                                                    </button>
                                                ))}
                                                {employees.length === 0 && (
                                                    <div className="p-4 text-center text-slate-400 text-sm italic">
                                                        No se encontraron coincidencias.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Barra de arrastre con Tooltip centrado y animación de estirado completo */}
                                    <div
                                        onMouseDown={() => setIsResizing(true)}
                                        className={`w-4 flex items-center justify-center group cursor-col-resize self-stretch transition-colors relative ${isResizing ? 'bg-[--theme-100]' : 'hover:bg-slate-50'}`}
                                        title=""
                                    >
                                        <Tooltip text="Arrastrar para redimensionar" triggerClassName="flex items-center justify-center h-16 w-full relative z-20">
                                            <div className="w-full h-full opacity-0" />
                                        </Tooltip>
                                        <div className={`absolute w-0.5 rounded-full transition-all duration-300 z-10 ${isResizing ? 'bg-[--theme-500] h-full' : 'h-12 bg-slate-300 group-hover:bg-[--theme-400]'}`} />
                                    </div>
                                </>
                            )}

                            {/* Panel principal (Balances e Historial) */}
                            <div className="flex-1 min-w-0 h-full overflow-y-auto custom-scrollbar px-1 space-y-4">
                                {/* Cálculo de Dashboard Dinámico o Acumulado */}
                                {(() => {
                                    const maxAnio = history.length > 0 ? Math.max(...history.map(h => h.Anio)) : 0;
                                    const now = new Date();


                                    const currentYear = selectedYear || maxAnio;
                                    const isCumulative = currentYear === maxAnio;
                                    let displayData: any = null;

                                    if (history.length > 0) {
                                        // Siempre calculamos el acumulado hasta el año seleccionado
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
                                                // Metadatos del periodo (usar los del año seleccionado)
                                                ...(curr.Anio === currentYear ? {
                                                    FechaInicioPeriodo: curr.FechaInicio,
                                                    FechaFinPeriodo: curr.FechaFin,
                                                    SaldoId: curr.SaldoId
                                                } : {})
                                            };
                                        }, { ...history[0], DiasOtorgados: 0, DiasDisfrutados: 0, DiasPagados: 0, DiasAjuste: 0 });

                                        // Recalcular restantes del acumulado
                                        displayData.DiasRestantes = (displayData.DiasOtorgados || 0)
                                            - ((displayData.DiasDisfrutados || 0) + (displayData.DiasPagados || 0) + (displayData.DiasAjuste || 0));
                                    } else if (balance) {
                                        // Fallback al balance si no hay historial aún
                                        const propOtorgados = getProportionalValue(balance);
                                        displayData = {
                                            ...balance,
                                            DiasOtorgados: propOtorgados,
                                            DiasRestantes: propOtorgados - ((balance.DiasDisfrutados || 0) + (balance.DiasPagados || 0) + (balance.DiasAjuste || 0))
                                        };
                                    }


                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="bg-white p-3.5 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center relative group">
                                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                                                    {displayData?.FechaInicioPeriodo && displayData?.FechaFinPeriodo ? (
                                                        <>{currentYear === maxAnio ? 'Total Acumulado' : `Saldo al ${currentYear}`}<br /><span className="text-[10px] lowercase italic font-normal text-slate-400">{format(new Date(displayData.FechaInicioPeriodo), 'dd MMM yy')} - {format(new Date(displayData.FechaFinPeriodo), 'dd MMM yy')}</span></>
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
                                                <span className="text-3xl font-bold text-blue-600 mt-0.5">{formatValue((displayData?.DiasDisfrutados || 0) + (displayData?.DiasPagados || 0) + (displayData?.DiasAjuste || 0))}</span>
                                                <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                                                    <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200 flex items-center gap-1 uppercase tracking-tight">
                                                        <Umbrella size={10} /> {formatValue(displayData?.DiasDisfrutados || 0)} DISFRUTADOS
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
                                                        onClick={() => {
                                                            setExtraValue(displayData?.DiasAjuste || 0);
                                                            setExtraordinaryModal({ saldoId: displayData?.SaldoId || 0, currentValue: displayData?.DiasAjuste || 0 });
                                                        }}
                                                        className="absolute top-2 right-2 p-1 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all"
                                                        title="Ajuste de Consumo"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="bg-gradient-to-br from-[--theme-500] to-[--theme-700] p-3.5 rounded-xl shadow-sm text-white flex flex-col items-center justify-center relative overflow-hidden">
                                                <div className="absolute -right-4 -top-4 opacity-10">
                                                    <Palmtree size={100} />
                                                </div>
                                                <span className="text-xs font-semibold text-[--theme-100] uppercase tracking-wider relative z-10">{isCumulative ? 'Saldo Acumulado' : 'Saldo al Periodo'}</span>
                                                <span className="text-4xl font-bold mt-0.5 relative z-10">{formatValue(displayData?.DiasRestantes ?? 0)}</span>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Historial Anual (Línea de Tiempo) */}
                                {history.length > 0 || balance ? (
                                    <div className="space-y-2 pt-1">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                                    <History size={16} />
                                                </div>
                                                <h3 className="text-base font-bold text-slate-800">Histórico</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Tooltip text={showProportional ? "Ver Días Totales" : "Ver Días Devengados (Proporcional)"}>
                                                    <button
                                                        onClick={() => setShowProportional(!showProportional)}
                                                        className={`p-2 rounded-lg transition-all border flex items-center gap-2 text-xs font-bold leading-none ${showProportional
                                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-md'
                                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'}`}
                                                    >
                                                        <Zap size={14} className={showProportional ? 'animate-pulse' : ''} />
                                                        {showProportional ? 'VISTA DEVENGADA' : 'DÍAS DEVENGADOS'}
                                                    </button>
                                                </Tooltip>
                                                {canManageVacations && (
                                                    <Tooltip text="Recalcular Saldos desde Prenómina">
                                                        <button
                                                            onClick={async () => {
                                                                const targetId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
                                                                if (!targetId) return;
                                                                setIsRecalculating(true);
                                                                try {
                                                                    const token = getToken();
                                                                    await fetch(`${API_BASE_URL}/vacations/recalculate/${targetId}`, {
                                                                        method: 'POST',
                                                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify({ year: new Date().getFullYear() })
                                                                    });
                                                                    await fetchData(false);
                                                                    addNotification('Éxito', 'Saldos recalculados.', 'success');
                                                                } catch { addNotification('Error', 'Error al recalcular.', 'error'); }
                                                                finally { setIsRecalculating(false); }
                                                            }}
                                                            className="p-2 bg-white text-slate-400 border border-slate-200 rounded-lg hover:border-[--theme-300] hover:bg-[--theme-50] hover:text-[--theme-700] transition-all disabled:opacity-50"
                                                            disabled={isRecalculating}
                                                        >
                                                            <RefreshCw size={14} className={isRecalculating ? 'animate-spin' : ''} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                        <div className="relative pt-4 pb-2">
                                            {/* Línea conectora base */}
                                            <div className="absolute top-[2rem] left-0 right-0 h-1 bg-slate-200 z-0" />

                                            <div className="flex flex-nowrap overflow-x-auto gap-6 custom-scrollbar px-2 pb-4 relative z-10">
                                                {/* Nodo de Ingreso */}
                                                {(() => {
                                                    const selectedEmp = employees.find(e => e.EmpleadoId === selectedEmployeeId);
                                                    const fechaIngreso = selectedEmp?.FechaIngreso || (user as any)?.FechaIngreso;
                                                    if (!fechaIngreso) return null;
                                                    const dIngreso = new Date(fechaIngreso);
                                                    return (
                                                        <div className="min-w-[120px] flex flex-col items-center group relative z-10">
                                                            <div className="w-6 h-6 rounded-full border-4 border-slate-200 bg-slate-50 mb-3" />
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-400">PUNTO DE</span>
                                                                <span className="text-xs font-semibold text-slate-500 uppercase">INGRESO</span>
                                                                <span className="text-[10px] font-medium text-slate-400">{format(dIngreso, 'dd/MM/yy')}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                {(() => {
                                                    const displayHistory = history.length > 0 ? [...history].reverse() : (balance ? [balance] : []);
                                                    return displayHistory.map((h: any) => {
                                                        const now = new Date();
                                                        const startDate = h.FechaInicio ? new Date(h.FechaInicio) : null;
                                                        const endDate = h.FechaFin ? new Date(h.FechaFin) : null;
                                                        const isCurrent = startDate && endDate && now >= startDate && now <= endDate;

                                                        const propOtorgados = getProportionalValue(h);
                                                        const totalConsumed = (h.DiasDisfrutados || 0) + (h.DiasPagados || 0) + (h.DiasAjuste || 0);
                                                        const effective = propOtorgados;
                                                        const percentage = effective > 0 ? (totalConsumed / effective) * 100 : 0;
                                                        const displayRestantes = effective - totalConsumed;

                                                        return (
                                                            <div
                                                                key={h.Anio}
                                                                className="min-w-[160px] max-w-[160px] flex flex-col items-center group relative"
                                                            >
                                                                {/* Nodo */}
                                                                <div className={`w-6 h-6 rounded-full border-4 shadow-sm mb-3 transition-all duration-300 z-10 ${isCurrent ? 'border-[--theme-500] bg-white scale-125' : 'border-slate-300 bg-white group-hover:border-[--theme-400]'}`}>
                                                                    <div className={`w-full h-full rounded-full transition-colors ${isCurrent ? 'bg-[--theme-100]' : 'bg-transparent group-hover:bg-[--theme-50]'}`} />
                                                                </div>

                                                                <div className="flex flex-col items-center mb-3 text-center">
                                                                    <span className={`text-base font-semibold transition-colors ${isCurrent ? 'text-[--theme-600]' : 'text-slate-700'}`}>
                                                                        Aniv. {h.Anio}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                                                        Ciclo {startDate ? format(startDate, 'yyyy') : h.Anio}
                                                                    </span>
                                                                    <span className="text-[9px] text-slate-400 font-medium opacity-70">
                                                                        {startDate && endDate ? (
                                                                            <>{format(startDate, 'dd/MM/yy')} - {format(endDate, 'dd/MM/yy')}</>
                                                                        ) : '---'}
                                                                    </span>
                                                                </div>

                                                                {/* Tarjeta interactiva (click = seleccionar periodo) */}
                                                                <button
                                                                    onClick={() => setSelectedYear(h.Anio)}
                                                                    onDoubleClick={async () => {
                                                                        const targetId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
                                                                        if (!targetId) return;
                                                                        const token = getToken();
                                                                        const res = await fetch(`${API_BASE_URL}/vacations/details/${targetId}/${h.Anio}`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                        if (res.ok) setDetailModal({ year: h.Anio, data: await res.json() });
                                                                    }}
                                                                    className={`w-full text-left bg-white rounded-xl p-3 border shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md relative overflow-hidden cursor-pointer ${selectedYear === h.Anio ? 'border-[--theme-500] ring-1 ring-[--theme-500] bg-[--theme-50]/30' : 'border-slate-200'}`}
                                                                >
                                                                    <div className="flex justify-between items-center text-xs mb-2 text-slate-500">
                                                                        <span>Usados</span>
                                                                        <span className="font-bold text-slate-700">{formatValue(totalConsumed)} <span className="text-slate-400 font-normal">/ {formatValue(effective)}</span></span>
                                                                    </div>

                                                                    {/* Progress Bar */}
                                                                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2 shadow-inner" title={`${percentage.toFixed(0)}% consumido`}>
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-1000 ${percentage >= 100 ? 'bg-amber-500' : 'bg-[--theme-500]'}`}
                                                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                                                        />
                                                                    </div>

                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Restan</span>
                                                                        <span className={`text-sm font-bold ${displayRestantes > 0 ? 'text-[--theme-600]' : (displayRestantes < 0 ? 'text-rose-500' : 'text-slate-400')}`}>
                                                                            {formatValue(displayRestantes)}
                                                                        </span>
                                                                    </div>
                                                                    {(h.DiasPagados > 0 || h.DiasAjuste !== 0) && (
                                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                                            {h.DiasPagados > 0 && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 px-1 py-0.5 rounded font-bold flex items-center gap-1"><CreditCard size={8} /> {formatValue(h.DiasPagados)} PAGADOS</span>}
                                                                            {h.DiasAjuste !== 0 && (
                                                                                <span
                                                                                    className={`text-[9px] px-1 py-0.5 rounded font-bold flex items-center gap-1 border ${h.DiasAjuste > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}
                                                                                    title="Ajuste de consumo de vacaciones"
                                                                                >
                                                                                    <Zap size={8} /> AJUSTE {h.DiasAjuste > 0 ? '+' : ''}{formatValue(h.DiasAjuste)}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <ChevronRight size={12} className="text-slate-400" />
                                                                    </div>
                                                                </button>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
                                        <div className="p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
                                            <Clock size={48} />
                                        </div>
                                        <p className="text-slate-500 font-medium">No hay historial de periodos de vacaciones disponibles.</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                    <h2 className="text-base font-bold text-slate-800">Historial de Solicitudes</h2>
                                </div>

                                {requests.length === 0 ? renderEmptyState() : (
                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                                                    <th className="px-5 py-2 font-semibold">Fechas</th>
                                                    <th className="px-5 py-2 font-semibold text-center">Días</th>
                                                    <th className="px-5 py-2 font-semibold">Comentarios</th>
                                                    <th className="px-5 py-2 font-semibold">Alta</th>
                                                    <th className="px-5 py-2 font-semibold">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {requests.map(req => (
                                                    <tr key={req.SolicitudId} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="font-medium text-slate-800">
                                                                {format(new Date(req.FechaInicio), 'dd MMM yyyy', { locale: es })} - {format(new Date(req.FechaFin), 'dd MMM yyyy', { locale: es })}
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 text-center font-semibold text-slate-700">{req.DiasSolicitados}</td>
                                                        <td className="px-5 py-3 text-slate-600 text-xs">{req.Comentarios || '-'}</td>
                                                        <td className="px-5 py-3 text-slate-500 text-xs">{format(new Date(req.FechaSolicitud), 'dd MMM, HH:mm')}</td>
                                                        <td className="px-5 py-3">
                                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-max ${getStatusStyle(req.Estatus)}`}>
                                                                {req.Estatus === 'Aprobado' && <CheckCircle2 size={14} />}
                                                                {req.Estatus === 'Rechazado' && <XCircle size={14} />}
                                                                {req.Estatus === 'Pendiente' && <Clock size={14} />}
                                                                {req.Estatus}
                                                            </span>
                                                            {req.Firmas && req.Firmas.length > 0 && (
                                                                <div className="flex gap-1.5 mt-2">
                                                                    {req.Firmas.map((f: any, idx: number) => (
                                                                        <div key={idx} title={`${f.RolAprobador}: ${f.EstatusFirma}`}
                                                                            className={`w-2.5 h-2.5 rounded-full ${f.EstatusFirma === 'Aprobado' ? 'bg-emerald-500' : f.EstatusFirma === 'Rechazado' ? 'bg-rose-500' : 'bg-slate-300'} border border-white shadow-sm`} />
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'approvals' && (
                        <div className="space-y-6 h-full overflow-y-auto custom-scrollbar p-1">
                            {requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 bg-white rounded-xl border border-slate-200">
                                    <div className="p-4 bg-slate-50 rounded-full text-slate-300 mb-4">
                                        <Clock size={48} />
                                    </div>
                                    <p className="text-slate-500 font-medium">No hay solicitudes pendientes de autorización.</p>
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                                                <th className="px-6 py-3 font-semibold">Empleado</th>
                                                <th className="px-6 py-3 font-semibold">Fechas Solicitadas</th>
                                                <th className="px-6 py-3 font-semibold text-center">Días</th>
                                                <th className="px-6 py-3 font-semibold">Estado</th>
                                                <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {requests.map(req => (
                                                <tr key={req.SolicitudId} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-slate-800">{req.NombreCompleto}</div>
                                                        <div className="text-xs text-slate-500">Cod: {req.CodRef}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-700">
                                                            {format(new Date(req.FechaInicio), 'dd MMM yyyy', { locale: es })} al {format(new Date(req.FechaFin), 'dd MMM yyyy', { locale: es })}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]" title={req.Comentarios}>
                                                            {req.Comentarios}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-700">{req.DiasSolicitados}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-max ${getStatusStyle(req.Estatus)}`}>
                                                            {req.Estatus}
                                                        </span>
                                                        {req.Firmas && req.Firmas.length > 0 && (
                                                            <div className="flex gap-1.5 mt-2">
                                                                {req.Firmas.map((f: any, idx: number) => (
                                                                    <div key={idx} title={`${f.RolAprobador}: ${f.EstatusFirma}`}
                                                                        className={`w-2.5 h-2.5 rounded-full ${f.EstatusFirma === 'Aprobado' ? 'bg-emerald-500' : f.EstatusFirma === 'Rechazado' ? 'bg-rose-500' : 'bg-slate-300'} border border-white shadow-sm`} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {req.Estatus === 'Pendiente' ? (
                                                            <>
                                                                <button onClick={() => handleApproveReject(req.SolicitudId, 'Aprobado')} className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-sm font-medium transition-colors shadow-sm">
                                                                    Aprobar
                                                                </button>
                                                                <button onClick={() => handleApproveReject(req.SolicitudId, 'Rechazado')} className="px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded text-sm font-medium transition-colors">
                                                                    Rechazar
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="text-slate-400 text-sm">Resuelta</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Nueva Solicitud */}
            <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Nueva Solicitud de Vacaciones">
                <div className="space-y-4 pt-2">
                    {isManager && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Solicitar a nombre de (Empleado)</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all"
                                value={newRequest.empleadoId}
                                onChange={(e) => setNewRequest({ ...newRequest, empleadoId: e.target.value })}
                            >
                                <option value="">Selecciona un empleado...</option>
                                {employees.map(emp => (
                                    <option key={emp.EmpleadoId} value={emp.EmpleadoId}>{emp.NombreCompleto} ({emp.CodRef})</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Inicio</label>
                            <input
                                type="date"
                                name="fechaInicio"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all"
                                value={newRequest.fechaInicio}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha de Fin</label>
                            <input
                                type="date"
                                name="fechaFin"
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all"
                                value={newRequest.fechaFin}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Días Solicitados (Hábiles)</label>
                        <input
                            type="number"
                            name="diasSolicitados"
                            min="1"
                            readOnly
                            className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all cursor-not-allowed"
                            value={newRequest.diasSolicitados}
                        />
                        <p className="text-xs text-slate-500 mt-1">Calculados automáticamente excluyendo fines de semana.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Comentarios</label>
                        <textarea
                            name="comentarios"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-[--theme-500] focus:border-transparent transition-all min-h-[80px]"
                            value={newRequest.comentarios}
                            onChange={handleInputChange}
                            placeholder="Motivo o detalle adicional..."
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setIsRequestModalOpen(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleCreateRequest}>Enviar Solicitud</Button>
                    </div>
                </div>
            </Modal>

            {viewingEmployeeId && (
                <EmployeeProfileModal
                    employeeId={viewingEmployeeId as any}
                    onClose={() => setViewingEmployeeId(null)}
                    getToken={getToken}
                    user={user}
                />
            )}

            {/* Modal de detalle por año */}
            {detailModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDetailModal(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">Detalle Vacaciones - Aniversario {detailModal.year}</h3>
                                {detailModal.data.periodo && (
                                    <p className="text-sm text-slate-400 font-medium">
                                        Periodo: {format(new Date(detailModal.data.periodo.inicio), 'dd/MM/yyyy')} al {format(new Date(detailModal.data.periodo.fin), 'dd/MM/yyyy')}
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setDetailModal(null)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-4">
                            {/* Prenómina */}
                            {detailModal.data.prenomina?.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <History size={12} /> Registros en Nómina
                                    </h4>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {detailModal.data.prenomina.map((p: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg group hover:bg-white hover:border-slate-200 transition-all">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-700 font-bold">
                                                        {format(new Date(p.Fecha), 'eeee, dd MMMM', { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{p.Tipo}</span>
                                                </div>
                                                <span className="text-sm font-black text-slate-800 bg-white border border-slate-200 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm">{p.Dias}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Ajustes Manuales Detallados */}
                            {detailModal.data.ajustes?.length > 0 && (
                                <div>
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 mt-2 flex items-center gap-2">
                                        <SlidersHorizontal size={12} /> Ajustes/Saldos Iniciales
                                    </h4>
                                    <div className="grid grid-cols-1 gap-1.5">
                                        {detailModal.data.ajustes.map((a: any, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 bg-indigo-50/30 border border-indigo-100/50 rounded-lg group">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-700 font-bold">
                                                        {format(new Date(a.Fecha), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                    <span className="text-[10px] text-indigo-500 font-semibold italic">{a.Descripcion || 'Sin descripción'}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-indigo-600 bg-white border border-indigo-100 w-8 h-8 flex items-center justify-center rounded-lg shadow-sm">{a.Dias}</span>
                                                    {canManageVacations && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm('¿Eliminar este ajuste?')) return;
                                                                const token = getToken();
                                                                const res = await fetch(`${API_BASE_URL}/vacations/adjustment/detail/${a.DetalleId}`, {
                                                                    method: 'DELETE',
                                                                    headers: { 'Authorization': `Bearer ${token}` }
                                                                });
                                                                if (res.ok) {
                                                                    // Refresh modal and main data
                                                                    const targetId = activeTab === 'team_vacations' ? selectedEmployeeId : user?.EmpleadoId;
                                                                    const refreshRes = await fetch(`${API_BASE_URL}/vacations/details/${targetId}/${detailModal.year}`, { headers: { 'Authorization': `Bearer ${token}` } });
                                                                    if (refreshRes.ok) setDetailModal({ ...detailModal, data: await refreshRes.json() });
                                                                    fetchData(false);
                                                                }
                                                            }}
                                                            className="p-1 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Solicitudes */}
                            {detailModal.data.solicitudes?.length > 0 && (
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📝 Solicitudes de Vacaciones</h4>
                                    <div className="space-y-1.5">
                                        {detailModal.data.solicitudes.map((s: any, i: number) => (
                                            <div key={i} className={`px-3 py-2 rounded-lg border ${s.Estatus === 'Aprobado' ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-slate-700 font-medium">
                                                        {format(new Date(s.FechaInicio), 'dd MMM', { locale: es })} – {format(new Date(s.FechaFin), 'dd MMM yyyy', { locale: es })}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${s.Tipo === 'Pagada' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{s.Tipo}</span>
                                                        <span className="text-sm font-bold text-slate-700">{s.Dias} día{s.Dias !== 1 ? 's' : ''}</span>
                                                    </div>
                                                </div>
                                                {s.Comentarios && <p className="text-xs text-slate-400 mt-0.5 truncate">{s.Comentarios}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Vacío */}
                            {(!detailModal.data.prenomina?.length && !detailModal.data.solicitudes?.length && !detailModal.data.ajustes?.length) && (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
                                    <AlertCircle size={32} className="opacity-30" />
                                    <p className="text-sm text-center">No hay registros de consumo para el <br /><b>Aniversario {detailModal.year}</b></p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Modal para Ajuste Extraordinario (Directo a DiasAjuste) */}
            {extraordinaryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Zap size={18} className="text-indigo-500" />
                                Ajuste Extraordinario
                            </h3>
                            <button onClick={() => setExtraordinaryModal(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                                <XIcon size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500">
                            Ajusta los días **Consumidos** manualmente. Un valor positivo **resta** del balance disponible.
                        </p>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Días totales de ajuste</label>
                            <input
                                type="number"
                                step="0.5"
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={extraValue}
                                onChange={(e) => setExtraValue(parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setExtraordinaryModal(null)}
                                className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    const token = getToken();
                                    const res = await fetch(`${API_BASE_URL}/vacations/balance/adjustment/${extraordinaryModal.saldoId}`, {
                                        method: 'PUT',
                                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ DiasAjuste: extraValue })
                                    });
                                    if (res.ok) {
                                        addNotification('Éxito', 'Ajuste extraordinario actualizado.', 'success');
                                        setExtraordinaryModal(null);
                                        fetchData();
                                    } else {
                                        addNotification('Error', 'No se pudo actualizar el ajuste.', 'error');
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-lg"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Versión para depuración */}
            <div className="fixed bottom-2 right-2 text-[10px] text-slate-300 pointer-events-none">
                UI: Antigravity-V2 | {new Date().toLocaleTimeString()}
            </div>
        </div>
    );
};
