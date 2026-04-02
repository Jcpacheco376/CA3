import React, { useMemo, useState, useEffect } from 'react';
import {
    CalendarDays,
    User,
    FileText,
    Calculator,
    AlertCircle,
    Search,
    UserCheck,
    Link2Off,
    Palmtree
} from 'lucide-react';
import { Modal, Button } from '../../components/ui/Modal';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../../config/api';
import { getAvailableVacationDays, VacationMode } from '../../types/vacations';

interface VacationRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    isManager: boolean;
    employees: any[];
    newRequest: any;
    setNewRequest: (req: any) => void;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleCreateRequest: () => Promise<void>;
    vacationMode?: VacationMode;
    isSelfRequest?: boolean;
    calendarEvents?: any[];
}

export const VacationRequestModal: React.FC<VacationRequestModalProps> = ({
    isOpen,
    onClose,
    isManager,
    employees,
    newRequest,
    setNewRequest,
    handleInputChange,
    handleCreateRequest,
    vacationMode = 'FIN',
    isSelfRequest = false,
    calendarEvents = []
}) => {
    const { getToken, user } = useAuth();

    // UI Local States for Employee Search
    const [empleadoSearch, setEmpleadoSearch] = useState('');
    const [showEmpleadoDropdown, setShowEmpleadoDropdown] = useState(false);

    // Available Days Fetching
    const [availableDays, setAvailableDays] = useState<number | null>(null);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);

    // Calendar events are now received as prop from parent (VacationsPage)
    // which fetches them once and passes them both to DateRangePicker dots and this modal.

    // ── Preview del periodo (calculado en backend, igual que el SP real) ────────
    const [preview, setPreview] = useState<{
        summary: {
            DiasNaturales: number;
            DiasSolicitados: number;
            DiasDescanso: number;
            DiasFeriados: number;
            DiasSinHorario: number;
            TieneDiasSinHorario: boolean;
            TieneTraslape: boolean;
            EsRetroactivo: boolean;
        };
        days: Array<{ Fecha: string; TipoDia: string }>;
    } | null>(null);

    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [restDays, setRestDays] = useState<string[]>([]); // fechas de descanso para el datepicker
    const [dynamicRestDays, setDynamicRestDays] = useState<string[]>([]);
    const [dynamicHolidays, setDynamicHolidays] = useState<any[]>([]); // feriados calculados desde el backend
    const [currentDatePickerMonth, setCurrentDatePickerMonth] = useState<Date>(new Date());

    // Fetch balance when employee changes
    useEffect(() => {
        const fetchAvailable = async () => {
            const empId = newRequest.empleadoId || (!isManager ? user?.EmpleadoId : null);
            if (!empId) {
                setAvailableDays(null);
                return;
            }
            try {
                setIsLoadingBalance(true);

                // Intentar encontrar al empleado en la lista local primero
                let emp = employees.find(e => String(e.EmpleadoId) === String(empId));

                // Si no está o no tiene el sumario, cargarlo
                if (!emp || !emp.VacacionesSummary) {
                    const token = getToken();
                    const res = await fetch(`${API_BASE_URL}/employees/${empId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        emp = await res.json();
                    }
                }

                if (emp) {
                    const saldo = getAvailableVacationDays(emp, vacationMode);
                    setAvailableDays(Math.round(saldo * 100) / 100);
                } else {
                    setAvailableDays(null);
                }
            } catch (e) {
                console.error("Error fetching balance:", e);
                setAvailableDays(null);
            } finally {
                setIsLoadingBalance(false);
            }
        };

        if (isOpen) {
            fetchAvailable();
        }
    }, [newRequest.empleadoId, isManager, user?.EmpleadoId, isOpen, getToken, employees, vacationMode]);

    // Fetch dynamic rest days for the current calendar visible month
    useEffect(() => {
        const empId = newRequest.empleadoId || (!isManager ? user?.EmpleadoId : null);
        if (!isOpen || !empId) {
            setDynamicRestDays([]);
            return;
        }

        const fetchCalendarSchedule = async () => {
            // Buscamos un rango un poco más amplio, desde el inicio del mes pasado hasta el fin del mes siguiente
            // Esto asegura que al ver días superpuestos de otros meses en el calendario, también se marquen correctamente.
            const start = new Date(currentDatePickerMonth.getFullYear(), currentDatePickerMonth.getMonth() - 1, 1).toISOString().substring(0, 10);
            const end = new Date(currentDatePickerMonth.getFullYear(), currentDatePickerMonth.getMonth() + 2, 0).toISOString().substring(0, 10);

            try {
                const token = getToken();
                const res = await fetch(`${API_BASE_URL}/employees/${empId}/calendar-schedule?start=${start}&end=${end}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Separar descansos y feriados
                    const rests = data
                        .filter((d: any) => d.TipoDia === 'DESCANSO' || d.TipoDia === 'SIN_HORARIO')
                        .map((d: any) => typeof d.Fecha === 'string' ? d.Fecha.substring(0, 10) : d.Fecha);
                    const holidays = data
                        .filter((d: any) => d.TipoDia === 'FERIADO')
                        .map((d: any) => ({
                            Fecha: typeof d.Fecha === 'string' ? d.Fecha.substring(0, 10) : d.Fecha,
                            Nombre: 'Día feriado',
                            TipoEventoId: 'DIA_FERIADO'
                        }));
                    setDynamicRestDays(rests);
                    setDynamicHolidays(holidays);
                }
            } catch (err) {
                console.error("Error fetching calendar schedule:", err);
            }
        };
        fetchCalendarSchedule();
    }, [newRequest.empleadoId, getToken, isOpen, isManager, user?.EmpleadoId, currentDatePickerMonth]);

    // Cleanup state when opening/closing
    useEffect(() => {
        if (!isOpen) {
            setEmpleadoSearch('');
            setShowEmpleadoDropdown(false);
        }
    }, [isOpen]);

    const isInvalidDates = newRequest.fechaInicio && newRequest.fechaFin && new Date(newRequest.fechaInicio) > new Date(newRequest.fechaFin);

    const handleRangeChange = (start: Date, end: Date) => {
        setNewRequest((prev: any) => ({
            ...prev,
            fechaInicio: format(start, 'yyyy-MM-dd'),
            fechaFin: format(end, 'yyyy-MM-dd')
        }));
    };

    const customRange = (newRequest.fechaInicio && newRequest.fechaFin && !isInvalidDates) ? {
        start: parseISO(newRequest.fechaInicio),
        end: parseISO(newRequest.fechaFin)
    } : undefined;

    const rangeLabel = customRange
        ? `${format(customRange.start, 'dd MMM yyyy', { locale: es })} - ${format(customRange.end, 'dd MMM yyyy', { locale: es })}`
        : 'Seleccionar periodo de fechas...';

    const matchWords = (str: string, search: string) => {
        if (!str) return false;
        const searchWords = search.toLowerCase().trim().split(/\s+/);
        const targetStr = str.toLowerCase();
        return searchWords.every(word => targetStr.includes(word));
    };

    // Obtenemos al empleado ya seleccionado de la lista local en memoria (solo para la etiqueta)
    const linkedEmployeeName = useMemo(() => {
        if (!newRequest.empleadoId) return null;
        const emp = employees.find(e => String(e.EmpleadoId) === String(newRequest.empleadoId));
        return emp ? emp.NombreCompleto : `Empleado ID#${newRequest.empleadoId}`;
    }, [newRequest.empleadoId, employees]);

    // ── Llamada al endpoint de preview — misma lógica que el SP real, nunca hardcodeado ──
    useEffect(() => {
        const empId = newRequest.empleadoId || (!isManager ? user?.EmpleadoId : null);
        if (!isOpen || !empId || !newRequest.fechaInicio || !newRequest.fechaFin || isInvalidDates) {
            setPreview(null);
            setRestDays([]);
            return;
        }
        const fetchPreview = async () => {
            setIsLoadingPreview(true);
            try {
                const token = getToken();
                const params = new URLSearchParams({ fechaInicio: newRequest.fechaInicio, fechaFin: newRequest.fechaFin });
                const res = await fetch(`${API_BASE_URL}/vacations/preview/${empId}?${params}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setPreview(data);

                    // Extraer los días que son descanso o sin horario para marcarlos visualmente
                    if (data.days && Array.isArray(data.days)) {
                        const dr = data.days
                            .filter((d: any) => d.TipoDia === 'DESCANSO' || d.TipoDia === 'SIN_HORARIO')
                            .map((d: any) => d.Fecha);
                        setRestDays(dr);
                    } else {
                        setRestDays([]);
                    }
                } else {
                    setPreview(null);
                    setRestDays([]);
                }
            } catch {
                setPreview(null);
                setRestDays([]);
            } finally {
                setIsLoadingPreview(false);
            }
        };
        fetchPreview();
    }, [newRequest.empleadoId, newRequest.fechaInicio, newRequest.fechaFin, isOpen, isManager, user?.EmpleadoId]);

    const isScheduleRotativo = !!preview?.summary?.TieneDiasSinHorario;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                        <CalendarDays size={20} />
                    </div>
                    <span>Nueva Solicitud de Vacaciones</span>
                </div>
            }
            size="lg" // Modal ligeramente mas grande para acomodar los dos bloques de calculadora
        >
            <div className="space-y-6 pt-2">

                {/* 1. Selección de Empleado (Solo Managers) */}
                {isManager ? (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 relative overflow-visible">
                        <div className="absolute -right-4 -top-4 opacity-[0.03]">
                            <User size={100} />
                        </div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-200 uppercase tracking-widest pb-2 relative z-10">
                            <User size={14} /> Seleccionar Empleado
                        </h4>

                        <div className="relative z-10">
                            {newRequest.empleadoId ? (
                                <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl transition-all shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-200/50 flex items-center justify-center shrink-0">
                                            <UserCheck size={20} className="text-indigo-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-tight leading-none mb-1">Empleado Seleccionado</p>
                                            <p className="text-sm font-bold text-slate-800 truncate">
                                                {linkedEmployeeName}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Botón de quitar VINCULO solo si no es SelfRequest */}
                                    {!isSelfRequest && (
                                        <button
                                            type="button"
                                            onClick={() => { setNewRequest((prev: any) => ({ ...prev, empleadoId: null })); setEmpleadoSearch(''); }}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0 ml-2"
                                            title="Cambiar empleado"
                                        >
                                            <Link2Off size={18} />
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="relative group">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-indigo-500" />
                                    <input
                                        type="text"
                                        placeholder="Escribe el nombre del empleado para buscar..."
                                        value={empleadoSearch}
                                        onChange={e => { setEmpleadoSearch(e.target.value); setShowEmpleadoDropdown(true); }}
                                        onFocus={() => setShowEmpleadoDropdown(true)}
                                        onBlur={() => setTimeout(() => setShowEmpleadoDropdown(false), 200)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (empleadoSearch.trim().length > 0) {
                                                    const filtered = employees.filter(emp =>
                                                        matchWords(emp.NombreCompleto, empleadoSearch) ||
                                                        matchWords(emp.CodRef, empleadoSearch)
                                                    ).slice(0, 8);
                                                    if (filtered.length > 0) {
                                                        setNewRequest((prev: any) => ({ ...prev, empleadoId: String(filtered[0].EmpleadoId) }));
                                                        setEmpleadoSearch('');
                                                        setShowEmpleadoDropdown(false);
                                                    }
                                                }
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white transition-all shadow-sm"
                                        autoComplete="off"
                                    />
                                    {showEmpleadoDropdown && empleadoSearch.trim().length > 0 && (() => {
                                        const filtered = employees.filter(e =>
                                            matchWords(e.NombreCompleto, empleadoSearch) ||
                                            matchWords(e.CodRef, empleadoSearch)
                                        ).slice(0, 8);
                                        return filtered.length > 0 ? (
                                            <ul className="absolute z-[200] mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                                {filtered.map(emp => (
                                                    <li
                                                        key={emp.EmpleadoId}
                                                        onMouseDown={() => {
                                                            setNewRequest((prev: any) => ({ ...prev, empleadoId: String(emp.EmpleadoId) }));
                                                            setEmpleadoSearch('');
                                                            setShowEmpleadoDropdown(false);
                                                        }}
                                                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                                                            <span className="text-xs font-bold text-indigo-600">{emp.NombreCompleto?.charAt(0) || '?'}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-slate-700 truncate">{emp.NombreCompleto}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium tracking-wide">{(emp.CodRef || 'Sin código')} • {emp.DepartamentoNombre || 'Sin departamento'}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="absolute z-[200] mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center text-sm text-slate-500">
                                                No se encontraron resultados para "{empleadoSearch}"
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Vista bloqueada para el empleado (Mis Vacaciones) */
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3 relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 opacity-[0.03]">
                            <User size={100} />
                        </div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-200 uppercase tracking-widest pb-2 relative z-10">
                            <User size={14} /> Tu Solicitud
                        </h4>
                        <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm relative z-10">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <UserCheck size={20} className="text-slate-500" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight leading-none mb-1">Nombre Completo</p>
                                <p className="text-sm font-bold text-slate-800 truncate">
                                    {linkedEmployeeName || user?.NombreCompleto}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. Rango de Fechas y Días Calculados */}
                <div className={`space-y-4 transition-opacity duration-300 ${(isManager && !newRequest.empleadoId) ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-200 uppercase tracking-widest pb-2">
                        <CalendarDays size={14} /> Fechas y Días
                    </h4>

                    <div className="w-full">
                        <DateRangePicker
                            currentDate={new Date()}
                            onDateChange={() => { }}
                            viewMode="custom"
                            rangeLabel={rangeLabel}
                            customRange={customRange}
                            onRangeChange={handleRangeChange}
                            onMonthChange={(date: Date) => setCurrentDatePickerMonth(date)}
                            events={[...calendarEvents, ...dynamicHolidays]}
                            baseSchedule={[...dynamicRestDays, ...restDays]}
                            minDate={new Date()}
                            className={`w-full py-2.5 px-3 justify-start bg-slate-50 hover:bg-white focus:ring-2 focus:ring-indigo-500/20 ${isInvalidDates ? 'ring-2 ring-rose-500 bg-rose-50 border-rose-300' : 'border-slate-200'}`}
                        />
                    </div>

                    {/* Alerta de validación de fechas */}
                    {isInvalidDates && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>La fecha final no puede ser anterior a la fecha inicial.</span>
                        </div>
                    )}

                    {/* Alerta de fecha retroactiva */}
                    {!!preview?.summary?.EsRetroactivo && !isInvalidDates && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>No se pueden solicitar vacaciones con fecha anterior a hoy.</span>
                        </div>
                    )}

                    {/* Alerta de traslape */}
                    {!!preview?.summary?.TieneTraslape && !isInvalidDates && (
                        <div className="flex items-start gap-2 p-3 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>El periodo seleccionado coincide con otra solicitud activa.</span>
                        </div>
                    )}

                    {/* Aviso de horario rotativo / sin horario */}
                    {isScheduleRotativo && !isInvalidDates && !preview?.summary?.EsRetroactivo && !preview?.summary?.TieneTraslape && (
                        <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200">
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
                            <div>
                                <p className="font-bold mb-0.5">Horario no resuelto</p>
                                <p>Este empleado tiene horario rotativo o sin horario base asignado. La solicitud se creará con estatus <span className="font-bold text-indigo-700">Pendiente de Horario</span> y no podrá aprobarse hasta que se asigne un horario para el periodo.</p>
                            </div>
                        </div>
                    )}

                    {/* Indicadores Dinámicos */}
                    <div className="grid grid-cols-2 gap-4">

                        {/* Días a Consumir — Desglose Compacto */}
                        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/30 border border-indigo-100/50 p-4 rounded-xl flex flex-col justify-center relative overflow-hidden group col-span-2 sm:col-span-1 min-h-[140px]">
                            <div className="absolute -right-2 -bottom-2 opacity-5 scale-110 group-hover:scale-125 transition-transform">
                                <Calculator size={80} />
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className="p-1 px-2 bg-white rounded flex items-center gap-1.5 shadow-sm text-indigo-500 shrink-0">
                                    <Calculator size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Desglose</span>
                                </div>
                            </div>

                            {/* Número principal: días efectivos */}
                            <div className="relative z-10 flex items-baseline gap-1 mb-2">
                                {isLoadingPreview ? (
                                    <div className="animate-pulse w-16 h-10 bg-indigo-200/50 rounded-lg" />
                                ) : preview !== null ? (
                                    <>
                                        <span className="text-4xl font-black text-indigo-700 leading-none tracking-tight">
                                            {preview.summary.DiasSolicitados}
                                        </span>
                                        <span className="text-xs font-bold text-indigo-400">días efectivos</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl font-black text-indigo-300 leading-none —"></span>
                                        <span className="text-[10px] font-semibold text-indigo-200 ml-1">selecciona periodo</span>
                                    </>
                                )}
                            </div>

                            {/* Fila compacta de detalles */}
                            {preview !== null && (
                                <div className="relative z-10 flex flex-wrap gap-1.5 mt-auto">
                                    <span className="px-1.5 py-0.5 bg-white/60 text-slate-500 rounded text-[10px] font-medium border border-slate-100">
                                        Total: <span className="font-bold text-slate-700">{preview.summary.DiasNaturales}d</span>
                                    </span>
                                    {preview.summary.DiasDescanso > 0 && (
                                        <span className="px-1.5 py-0.5 bg-slate-100/50 text-slate-400 rounded text-[10px] font-medium border border-slate-200/50">
                                            Descanso: <span className="font-bold">-{preview.summary.DiasDescanso}d</span>
                                        </span>
                                    )}
                                    {preview.summary.DiasFeriados > 0 && (
                                        <span className="px-1.5 py-0.5 bg-rose-50 text-rose-500 rounded text-[10px] font-medium border border-rose-100">
                                            Festivos: <span className="font-bold">-{preview.summary.DiasFeriados}d</span>
                                        </span>
                                    )}
                                    {!!preview.summary.TieneDiasSinHorario && (
                                        <div className="w-full mt-1 flex items-center gap-1 text-[9px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                            <AlertCircle size={10} />
                                            {preview.summary.DiasSinHorario}d sin horario (Pte.)
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Días Disponibles */}
                        <div className="bg-emerald-50 border border-emerald-100/50 p-4 rounded-xl flex flex-col justify-center relative overflow-hidden group">
                            <div className="absolute -right-2 -bottom-2 opacity-5 scale-110 group-hover:scale-125 transition-transform">
                                <Palmtree size={80} />
                            </div>
                            <div className="flex items-center gap-2 mb-2 relative z-10">
                                <div className="p-1.5 bg-white rounded flex items-center justify-center shadow-sm text-emerald-500 shrink-0">
                                    <Palmtree size={14} />
                                </div>
                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Saldo Disponible</span>
                            </div>
                            <div className="relative z-10 flex flex-col min-h-[40px] justify-center">
                                {isLoadingBalance ? (
                                    <div className="animate-pulse w-1/3 h-8 bg-emerald-200/50 rounded" />
                                ) : (
                                    <>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-emerald-700 leading-none">
                                                {availableDays !== null ? availableDays : '-'}
                                            </span>
                                            {availableDays !== null && <span className="text-sm font-bold text-emerald-500">días</span>}
                                        </div>
                                        {preview !== null && availableDays !== null && preview.summary.DiasSolicitados > 0 && (
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <span className="text-[10px] font-medium text-emerald-500">Quedarían:</span>
                                                <span className={`text-sm font-black leading-none ${(availableDays - preview.summary.DiasSolicitados) < 0 ? 'text-rose-600' : 'text-emerald-600'
                                                    }`}>
                                                    {availableDays - preview.summary.DiasSolicitados}
                                                </span>
                                                <span className="text-[10px] font-medium text-emerald-400">días</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* 3. Motivo/Comentarios Adicionales */}
                <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-xs font-bold text-slate-400 border-b border-slate-200 uppercase tracking-widest pb-2">
                        <FileText size={14} /> Detalles Adicionales
                    </h4>

                    <textarea
                        name="comentarios"
                        value={newRequest.comentarios || ''}
                        onChange={handleInputChange}
                        placeholder="Escribe aquí un motivo o comentario opcional para esta solicitud (ej. Viaje familiar, Trámite personal...)"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all resize-none min-h-[80px]"
                    />
                </div>

                {/* Footer de Acciones */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <Button variant="secondary" onClick={onClose} className="px-5">
                        Cancelar
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleCreateRequest}
                        disabled={
                            isInvalidDates
                            || newRequest.diasNaturales <= 0
                            || (isManager && !newRequest.empleadoId)
                            || (preview !== null && preview.summary.DiasSolicitados <= 0)
                            || preview?.summary?.EsRetroactivo
                            || preview?.summary?.TieneTraslape
                        }
                        className="px-6 shadow-sm shadow-indigo-200"
                    >
                        Enviar Solicitud
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
