import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// ¡FIX IMPORTACIONES! Se AÑADEN extensiones .tsx/.ts OTRA VEZ
import { useAuth } from '../auth/AuthContext.tsx';
import { useNotification } from '../../context/NotificationContext.tsx';
import { API_BASE_URL } from '../../config/api.ts';
// ¡FIX! Se añade startOfWeek a la importación
import { format, startOfWeek, endOfWeek, addDays, subDays, getDay, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, isToday as isTodayDateFns, isWithinInterval, getDay as getDayOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
// ¡ICONO REVERTIDO! Volvemos a CalendarCheck
import { Loader2, Briefcase, Building, Cake, GripVertical, Contact, InfoIcon as Info, Sun, Moon, Sunset, Coffee, RotateCw, CalendarCheck, X } from 'lucide-react'; // Quitamos ClipboardEdit
import { AttendanceToolbar } from './AttendanceToolbar.tsx';
import { ScheduleCell } from './ScheduleCell.tsx';
import { EmployeeProfileModal } from './EmployeeProfileModal.tsx';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip.tsx';
import { themes, statusColorPalette } from '../../config/theme.ts';
import ReactDOM from 'react-dom';


// --- Constantes y Claves ---
const COLUMN_WIDTH_STORAGE_KEY = 'schedule_employee_column_width';
// ... (mismas constantes) ...
const MIN_COLUMN_WIDTH = 240;
const MAX_COLUMN_WIDTH = 10000;
const EMPLOYEE_CONTENT_MIN_WIDTH = 220;
const EMPLOYEE_CONTENT_MAX_WIDTH = 500;
const DEFAULT_COLUMN_WIDTH = 384;

// --- Helpers Visuales ---
// ... (getTurnoIcon y determineTurnoFromTime sin cambios) ...
const getTurnoIcon = (turno: 'M' | 'V' | 'N' | string | null | undefined, size = 14) => {
// ... (código sin cambios) ...
    switch (turno) {
        case 'M': return <Sun size={size} className="text-amber-500 shrink-0" title="Matutino" />;
        case 'V': return <Sunset size={size} className="text-orange-500 shrink-0" title="Vespertino" />;
        case 'N': return <Moon size={size} className="text-indigo-500 shrink-0" title="Nocturno" />;
        default: return null;
    }
};
const determineTurnoFromTime = (horaEntrada: string): 'M' | 'V' | 'N' | null => {
// ... (código sin cambios) ...
    if (!horaEntrada || horaEntrada === '00:00') return null;
    try {
        const hour = parseInt(horaEntrada.split(':')[0], 10);
        if (hour >= 5 && hour < 12) return 'M';
        if (hour >= 12 && hour < 20) return 'V';
        if ((hour >= 20 && hour <= 23) || (hour >= 0 && hour < 5)) return 'N';
    } catch { return null; }
    return null;
};

// --- Mini Visualizador Semanal (Para el Modal) ---
const MiniWeekView = ({ details, colorUI }: { details: any[], colorUI: string }) => {
    // ... (código sin cambios) ...
    const colorKey = colorUI || 'slate';
    const theme = statusColorPalette[colorKey as keyof typeof statusColorPalette] || statusColorPalette.slate;
    const days = ["L", "M", "X", "J", "V", "S", "D"];

    return (
        <div className="flex space-x-0.5" title="Visualización semanal (L-D)">
            {days.map((dayLabel, index) => {
                const diaSemana = index + 1;
                const detail = details?.find(d => d.DiaSemana === diaSemana);
                const isLaboral = detail?.EsDiaLaboral || false;
                const bgColor = isLaboral ? (theme?.main || theme?.textDark || 'bg-blue-500') : 'bg-slate-200';
                return (
                    <span
                        key={index}
                        className={`w-4 h-4 rounded-sm flex items-center justify-center text-[10px] font-bold ${isLaboral ? 'text-white' : 'text-slate-400'} ${bgColor}`}
                    >
                        {dayLabel}
                    </span>
                );
            })}
        </div>
    );
};

// --- ¡NUEVO HELPER! Generador de Resumen Semanal ---
const generateScheduleSummary = (details: any[]): string => {
    if (!details || details.length === 0) return 'No definido';

    const daysOfWeek = ["L", "M", "X", "J", "V", "S", "D"];
    let summary = '';
    let startDay = -1;
    let currentPattern = '';

    for (let i = 0; i < 7; i++) {
        const diaSemana = i + 1;
        const detail = details.find(d => d.DiaSemana === diaSemana);
        let dayPattern: string;

        if (!detail || !detail.EsDiaLaboral) {
            dayPattern = 'Descanso';
        } else {
            const entrada = detail.HoraEntrada?.substring(0, 5) || '--:--';
            const salida = detail.HoraSalida?.substring(0, 5) || '--:--';
            const tieneComida = detail.TieneComida; // Asumiendo que 'TieneComida' viene del SP
            dayPattern = `${entrada}-${salida}${tieneComida ? ' ☕' : ''}`;
        }

        if (startDay === -1) { // Iniciando un nuevo grupo
            startDay = i;
            currentPattern = dayPattern;
        } else if (dayPattern !== currentPattern) { // El patrón cambió, cerrar grupo anterior
            const endDay = i - 1;
            if (startDay === endDay) {
                summary += `${daysOfWeek[startDay]}: ${currentPattern}, `;
            } else {
                summary += `${daysOfWeek[startDay]}-${daysOfWeek[endDay]}: ${currentPattern}, `;
            }
            startDay = i;
            currentPattern = dayPattern;
        }
        // Si es el último día, cerrar el grupo actual
        if (i === 6) {
             if (startDay === i) {
                summary += `${daysOfWeek[i]}: ${currentPattern}`;
            } else {
                summary += `${daysOfWeek[startDay]}-${daysOfWeek[i]}: ${currentPattern}`;
            }
        }
    }
     // Limpiar coma final si existe y simplificar si todos son descanso
     summary = summary.trim().replace(/, $/, '');
     if (summary === 'L-D: Descanso') return 'Descanso Total';

    return summary;
};


// --- COMPONENTE MEJORADO: Modal para Asignar Horario Fijo ---
const AssignFixedScheduleModal = ({
    // ... (props sin cambios) ...
    isOpen,
    onClose,
    employeeName,
    fixedSchedules,
    onAssign,
    targetWeekLabel
}: {
    isOpen: boolean,
    onClose: () => void,
    employeeName: string,
    fixedSchedules: any[],
    onAssign: (horarioId: number) => void,
    targetWeekLabel: string
}) => {
    // ... (refs y estados sin cambios) ...
    const modalRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // ... (useEffect para posicionar sin cambios) ...
    useEffect(() => {
        if (isOpen) {
            setPosition({
                top: window.innerHeight / 2 - 200,
                left: window.innerWidth / 2 - 200,
            });
        }
    }, [isOpen]);

     // ... (useEffect para cerrar al hacer clic fuera sin cambios) ...
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);


    if (!isOpen) return null;

    // ... (renderizado del modal) ...
    return ReactDOM.createPortal(
        <div
            ref={modalRef}
            className="fixed bg-white rounded-lg shadow-xl border p-4 w-[400px] animate-scale-in z-[100]"
            style={position}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <button onClick={onClose} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600">
                <X size={18} />
            </button>
            <h3 className="text-base font-semibold text-slate-800 mb-1">Asignar Horario Fijo</h3>
            <p className="text-sm text-slate-600 mb-1">Para: <span className="font-medium">{employeeName}</span></p>
            <p className="text-sm font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block mb-4">{targetWeekLabel}</p>
            <p className="text-sm text-slate-600 mb-2">Selecciona el horario a aplicar:</p>

            {/* --- INICIO: DISEÑO DE LISTA CON RESUMEN DETALLADO --- */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {fixedSchedules.length > 0 ? (
                    fixedSchedules.map(horario => {
                        const colorKey = horario?.ColorUI || 'slate';
                        const themePalette = statusColorPalette || {};
                        const theme = themePalette[colorKey as keyof typeof themePalette] || themePalette.slate || { main: 'bg-blue-500' };
                        // ¡NUEVO! Generar resumen
                        const scheduleSummary = generateScheduleSummary(horario?.Turnos || []);

                        return (
                            <button
                                key={horario.HorarioId}
                                onClick={() => onAssign(horario.HorarioId)}
                                className="w-full text-left p-3 rounded-lg flex items-start gap-3 transition-colors border border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 ring-offset-1 ring-[--theme-500]" // items-start
                            >
                                <span
                                    className="w-2 h-4 mt-1 rounded-full shrink-0" // Más pequeño y redondo
                                    style={{ backgroundColor: theme?.main || '#64748b' }}
                                ></span>

                                <div className="flex-1 min-w-0">
                                    {/* Nombre y Abreviatura */}
                                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight" title={horario.Nombre}>
                                        {horario.Nombre}
                                        <span className="ml-2 text-xs font-normal text-slate-500">({horario.Abreviatura || 'N/A'})</span>
                                    </p>
                                    {/* Resumen Detallado */}
                                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                                        {scheduleSummary}
                                    </p>
                                </div>
                                {/* Mini Semana (Opcional, ahora con el resumen es menos necesaria) */}
                                <div className="flex-shrink-0 mt-0.5">
                                    <MiniWeekView details={horario?.Turnos || []} colorUI={colorKey} />
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <p className="text-sm text-slate-500 text-center p-4 bg-slate-50 rounded-md">No hay horarios fijos definidos.</p>
                )}
            </div>
             {/* --- FIN: DISEÑO DE LISTA CON RESUMEN DETALLADO --- */}
        </div>,
        document.body
    );
};


// --- COMPONENTE PRINCIPAL: SchedulePage ---
export const SchedulePage = () => {
    // ... (hooks y estados sin cambios) ...
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<any[]>([]);
    const [scheduleCatalog, setScheduleCatalog] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignFixedModalInfo, setAssignFixedModalInfo] = useState<{
        employeeId: number,
        employeeName: string,
        weekStartDate: Date
    } | null>(null);
    const [openCellId, setOpenCellId] = useState<string | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState(() => user?.Departamentos?.length === 1 ? String(user.Departamentos[0].DepartamentoId) : 'all');
    const [selectedPayrollGroup, setSelectedPayrollGroup] = useState(() => user?.GruposNomina?.length === 1 ? String(user.GruposNomina[0].GrupoNominaId) : 'all');
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'week' | 'fortnight' | 'month'>('week');
    const canRead = can('horarios.read');
    const canAssign = can('horarios.assign');
    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try {
            const savedWidth = localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
            return savedWidth ? Math.max(MIN_COLUMN_WIDTH, Math.min(parseInt(savedWidth, 10), MAX_COLUMN_WIDTH)) : DEFAULT_COLUMN_WIDTH;
        } catch {
            return DEFAULT_COLUMN_WIDTH;
        }
    });

    // ... (useMemo para dateRange, handleDatePrev, handleDateNext sin cambios) ...
    const { dateRange, rangeLabel } = useMemo(() => {
    // ... (código sin cambios) ...
        let start, end;
        let label = '';
        switch(viewMode) {
            case 'fortnight':
                const dayOfMonth = currentDate.getDate();
                if (dayOfMonth <= 15) {
                    start = startOfMonth(currentDate);
                    end = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
                } else {
                    start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16);
                    end = endOfMonth(currentDate);
                }
                label = `Quincena del ${format(start, 'd')} al ${format(end, 'd \'de\' MMMM, yyyy', { locale: es })}`;
                break;
            case 'month':
                start = startOfMonth(currentDate);
                end = endOfMonth(currentDate);
                label = format(start, 'MMMM yyyy', { locale: es });
                break;
            case 'week':
            default:
                start = startOfWeek(currentDate, { weekStartsOn: 1 });
                end = endOfWeek(currentDate, { weekStartsOn: 1 });
                label = `${format(start, 'd')} - ${format(end, 'd \'de\' MMMM, yyyy', { locale: es })}`;
                break;
        }
        const range = [];
        let day = start;
        while(day <= end) {
            range.push(day);
            day = addDays(day, 1);
        }
        return { dateRange: range, rangeLabel: label };
    }, [currentDate, viewMode]);
    const handleDatePrev = useCallback(() => {
    // ... (código sin cambios) ...
        setCurrentDate(prevDate => {
            switch(viewMode) {
                case 'fortnight':
                    const day = prevDate.getDate();
                    if (day <= 15) return new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 16);
                    return new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
                case 'month': return subMonths(prevDate, 1);
                default: return subWeeks(prevDate, 1);
            }
        });
    }, [viewMode]);
    const handleDateNext = useCallback(() => {
    // ... (código sin cambios) ...
        setCurrentDate(prevDate => {
            switch(viewMode) {
                case 'fortnight':
                    const day = prevDate.getDate();
                    if (day <= 15) return new Date(prevDate.getFullYear(), prevDate.getMonth(), 16);
                    return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
                case 'month': return addMonths(prevDate, 1);
                default: return addWeeks(prevDate, 1);
            }
        });
    }, [viewMode]);

    // --- Lógica de Carga de Datos (fetchData - Sin cambios) ---
    const fetchData = useCallback(async () => {
    // ... (código sin cambios) ...
        if (!canRead) {
            setError('No tienes permiso para ver esta sección.');
            setIsLoading(false);
            return;
        }
        if (!user || dateRange.length === 0) return;

        const token = getToken();
        if (!token) { setError("Sesión inválida."); setIsLoading(false); return; }

        setIsLoading(true);
        setError(null);
        const headers = { 'Authorization': `Bearer ${token}` };
        const startDate = format(dateRange[0], 'yyyy-MM-dd');
        const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

        try {
            const [assignmentsRes, schedulesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/schedules/assignments?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${API_BASE_URL}/schedules`, { headers }) // Llama al SP modificado que trae 'Turnos'
            ]);

            if (!assignmentsRes.ok) throw new Error(`Error ${assignmentsRes.status} al cargar asignaciones.`);
            if (!schedulesRes.ok) throw new Error(`Error ${schedulesRes.status} al cargar catálogo de horarios.`);

            const assignmentsData = await assignmentsRes.json();
            const catalogData = await schedulesRes.json();

            setScheduleCatalog(catalogData);
            setEmployees(assignmentsData);

        } catch (err: any) { setError(err.message); }
        finally { setIsLoading(false); }
    }, [dateRange, user, getToken, canRead]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Lógica de Guardado (handleBulkScheduleChange - Sin cambios) ---
    const handleBulkScheduleChange = async (updates: {
        empleadoId: number,
        fecha: Date,
        tipoAsignacion: 'H' | 'T' | 'D' | null,
        horarioId?: number | null,
        detalleId?: number | null
    }[]) => {
    // ... (código sin cambios) ...
        if (!canAssign) {
            addNotification('Acceso Denegado', 'No tienes permiso para asignar horarios.', 'error');
            return;
        }
        const token = getToken();
        if (!token || updates.length === 0) return;

        console.log("Enviando updates a la API:", updates);

        try {
            const res = await fetch(`${API_BASE_URL}/schedules/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'El servidor rechazó la actualización.');
            }
            addNotification('Guardado', `${updates.length} asignacion(es) guardada(s).`, 'success');
            fetchData();

        } catch (err: any) {
            addNotification('Error al Guardar', `No se pudieron guardar los cambios: ${err.message}`, 'error');
        }
    };

    // --- Lógica Asignar Horario Fijo a Semana (handleAssignFixedToWeek - Sin cambios) ---
    const handleAssignFixedToWeek = (horarioId: number) => {
    // ... (código sin cambios) ...
        if (!assignFixedModalInfo) return;
        const { employeeId, weekStartDate } = assignFixedModalInfo;

        console.log(`Asignando HorarioId ${horarioId} a EmpleadoId ${employeeId} para la semana que inicia ${format(weekStartDate, 'yyyy-MM-dd')}`);

        const updates = [];
        for (let i = 0; i < 7; i++) {
            updates.push({
                empleadoId: employeeId,
                fecha: addDays(weekStartDate, i),
                tipoAsignacion: 'H' as 'H',
                horarioId: horarioId,
                detalleId: null
            });
        }

        handleBulkScheduleChange(updates);
        setAssignFixedModalInfo(null); // Cerrar modal
    };

    // --- Función Unificada (handleCellAction - Sin cambios) ---
    const handleCellAction = (
        employeeId: number,
        targetDay: Date,
        payload: any,
        applyToWeek: boolean
    ) => {
    // ... (código sin cambios) ...
        if (applyToWeek && payload.tipoAsignacion === 'H' && payload.horarioId) {
             const weekStartDate = startOfWeek(targetDay, { weekStartsOn: 1 });
             // Encontrar el nombre del empleado para el modal
             const employee = employees.find(emp => emp.EmpleadoId === employeeId);
             // Abrir el modal ANTES de asignar
             setAssignFixedModalInfo({
                 employeeId,
                 employeeName: employee?.NombreCompleto || 'Empleado',
                 weekStartDate
             });
             // La asignación ahora ocurre CUANDO se selecciona algo en el modal,
             // así que ya no llamamos a handleAssignFixedToWeek aquí directamente.
             // La llamada a handleAssignFixedToWeek se hará desde el `onAssign` del modal.
        } else {
            // Asignación de día individual (rotativo, descanso, default)
            handleBulkScheduleChange([{
                empleadoId: employeeId,
                fecha: targetDay,
                tipoAsignacion: payload.tipoAsignacion,
                horarioId: payload.horarioId, // Será null para T y D
                detalleId: payload.detalleId // Será null para H y D
            }]);
        }
    };


    const handleToggleOpen = (cellId: string | null) => {
    // ... (código sin cambios) ...
        setOpenCellId(prev => (prev === cellId ? null : cellId));
    };

    // ... (filteredEmployees y handleResizeMouseDown sin cambios) ...
    const filteredEmployees = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word);
        return employees.filter(emp => {
            const departmentMatch = selectedDepartment === 'all' || String(emp.departamento_id) === selectedDepartment;
            const payrollGroupMatch = selectedPayrollGroup === 'all' || String(emp.grupo_nomina_id) === selectedPayrollGroup;
            if (!departmentMatch || !payrollGroupMatch) return false;
            if (searchWords.length === 0) return true;
            const targetText = ((emp?.NombreCompleto || '') + ' ' + (emp?.CodRef || '')).toLowerCase();
            return searchWords.every(word => targetText.includes(word));
        });
    }, [employees, searchTerm, selectedDepartment, selectedPayrollGroup]);
    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // ... (código sin cambios) ...
        e.preventDefault();
        document.body.classList.add('select-none');
        const startX = e.clientX;
        const startWidth = employeeColumnWidth;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            const clampedWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(newWidth, MAX_COLUMN_WIDTH));
            setEmployeeColumnWidth(clampedWidth);
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            document.body.classList.remove('select-none');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            const finalWidth = startWidth + (upEvent.clientX - startX);
            const clampedFinalWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(finalWidth, MAX_COLUMN_WIDTH));
            localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, clampedFinalWidth.toString());
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    };
    const isBirthdayInPeriod = (birthDateStr: string, period: Date[]): boolean => {
    // ... (código sin cambios) ...
        if (!birthDateStr || period.length === 0) return false;
        try {
            const birthDate = new Date(birthDateStr);
            const today = new Date();
            // Asegurarnos que usamos UTC para evitar problemas de zona horaria
            const birthDateThisYear = new Date(Date.UTC(today.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate()));

            return isWithinInterval(birthDateThisYear, {
                start: period[0],
                end: period[period.length - 1]
            });
        } catch (e) {
            return false;
        }
    };

    // --- Renderizado de Contenido ---
    const renderContent = () => {
        // ... (isLoading y error sin cambios) ...
        if (isLoading) { return <div className="text-center p-16 text-slate-500 flex items-center justify-center gap-2"> <Loader2 className="animate-spin" /> Cargando... </div>; }
        if (error) { return <div className="p-16 text-center"> <p className="font-semibold text-red-600">Error al Cargar</p> <p className="text-slate-500 text-sm mt-1">{error}</p> </div>; }
        return (
            <div className="overflow-auto relative flex-1">
                <table className="text-sm text-center border-collapse table-fixed">
                    {/* ... (thead sin cambios) ... */}
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50">
                            {/* Columna Empleado */}
                            <th className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm" style={{ width: `${employeeColumnWidth}px` }}>
                                <div className="flex justify-between items-center h-full">
                                    <span>Empleado</span>
                                    <div onMouseDown={handleResizeMouseDown} className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize group flex items-center justify-center">
                                        <GripVertical className="h-5 text-slate-300 group-hover:text-[--theme-500] transition-colors" />
                                    </div>
                                </div>
                            </th>
                            {/* Columna Fija para Botón Semanal */}
                            <th className="sticky left-[var(--employee-col-width)] bg-slate-50 z-30 shadow-sm w-12 p-0">
                                {/* Encabezado vacío */}
                            </th>
                            {/* Columnas de Días */}
                            {dateRange.map(day => (
                                <th key={day.toISOString()} className={`px-1 py-2 font-semibold text-slate-600 min-w-[${viewMode === 'week' ? '6rem' : '4rem'}] ${isTodayDateFns(day) ? 'bg-sky-100' : 'bg-slate-50'}`}>
                                    <span className="capitalize text-base">{format(day, 'eee', { locale: es })}</span>
                                    <span className="block text-xl font-bold text-slate-800">{format(day, 'dd')}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => {
                            // ... (lógica para defaultSchedule y currentWeekStartForButton sin cambios) ...
                            const defaultSchedule = scheduleCatalog.find(h => h.HorarioId === emp.HorarioDefaultId);
                            // ¡FIX! Asegurar que dateRange[0] existe antes de usarlo
                             const currentWeekStartForButton = startOfWeek(dateRange.length > 0 ? dateRange[0] : currentDate, { weekStartsOn: 1 });


                            return (
                                <tr key={emp.EmpleadoId} className="group">
                                    {/* Celda Empleado (sin cambios) */}
                                    <td className="p-2 text-left sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm align-top" style={{ '--employee-col-width': `${employeeColumnWidth}px` } as React.CSSProperties}>
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-slate-800 truncate" title={emp?.NombreCompleto}>{emp?.NombreCompleto}</p>
                                                        {defaultSchedule && (
                                                            <Tooltip text={`Horario Predeterminado: ${defaultSchedule.Nombre}`}>
                                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    {defaultSchedule.Abreviatura || defaultSchedule.HorarioId}
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                                        <Tooltip text="Ver Ficha de Empleado">
                                                            <button onClick={() => setViewingEmployeeId(emp.EmpleadoId)} className="p-1 rounded-md text-slate-400 hover:text-[--theme-500] hover:bg-slate-200">
                                                                <Contact size={18}/>
                                                            </button>
                                                        </Tooltip>
                                                        {isBirthdayInPeriod(emp.FechaNacimiento, dateRange) && (
                                                            <Tooltip text="Cumpleaños en este periodo">
                                                                <Cake size={18} className="text-pink-400 shrink-0" />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                    <Tooltip text={`ID: ${emp?.CodRef}`}> <p className="font-mono col-span-1 truncate">ID: {emp?.CodRef}</p> </Tooltip>
                                                    <Tooltip text={emp?.puesto_descripcion || 'No asignado'}> <p className="col-span-1 flex items-center gap-1.5 truncate"> <Briefcase size={12} className="text-slate-400 shrink-0"/> <span className="truncate">{emp?.puesto_descripcion || 'No asignado'}</span> </p> </Tooltip>
                                                    <Tooltip text={emp?.departamento_nombre || 'No asignado'}> <p className="col-span-1 flex items-center gap-1.5 truncate"> <Building size={12} className="text-slate-400 shrink-0"/> <span className="truncate">{emp?.departamento_nombre || 'No asignado'}</span> </p> </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Celda Fija para Botón Semanal (sin cambios) */}
                                    <td className="sticky left-[var(--employee-col-width)] bg-white group-hover:bg-slate-50 z-10 shadow-sm align-middle p-0">
                                         <div className="flex items-center justify-center h-full w-12">
                                             {canAssign && (
                                                 <Tooltip text="Asignar Horario Fijo a Semana">
                                                     <button
                                                         onClick={() => setAssignFixedModalInfo({
                                                             employeeId: emp.EmpleadoId,
                                                             employeeName: emp.NombreCompleto || 'Empleado',
                                                             weekStartDate: currentWeekStartForButton
                                                         })}
                                                         className="p-2 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-colors"
                                                     >
                                                         {/* ¡ICONO REVERTIDO! */}
                                                         <CalendarCheck size={20}/>
                                                     </button>
                                                 </Tooltip>
                                             )}
                                         </div>
                                    </td>

                                    {/* Celdas de Días (ScheduleCell) (sin cambios en props) */}
                                    {dateRange.map((day, dayIndex) => {
                                        // ... (lógica para cellId y scheduleData sin cambios) ...
                                        const cellId = `${emp.EmpleadoId}-${dayIndex}`;
                                        const scheduleData = emp?.HorariosAsignados?.find(
                                            (h: any) => h?.Fecha === format(day, 'yyyy-MM-dd')
                                        );
                                        return (
                                            <ScheduleCell
                                                key={cellId}
                                                cellId={cellId}
                                                day={day}
                                                isOpen={openCellId === cellId}
                                                onToggleOpen={handleToggleOpen}
                                                scheduleData={scheduleData}
                                                horarioDefaultId={emp.HorarioDefaultId}
                                                // Pasa la función unificada
                                                onScheduleChange={({ payload, applyToWeek }: { payload: any, applyToWeek: boolean }) =>
                                                    handleCellAction(emp.EmpleadoId, day, payload, applyToWeek)
                                                }
                                                scheduleCatalog={scheduleCatalog}
                                                isToday={isTodayDateFns(day)}
                                                canAssign={canAssign}
                                                viewMode={viewMode}
                                            />
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

     // ... (fixedSchedules y assignModalWeekLabel sin cambios) ...
     const fixedSchedules = useMemo(() => scheduleCatalog.filter(h => !h.EsRotativo), [scheduleCatalog]);
     const assignModalWeekLabel = useMemo(() => {
         if (!assignFixedModalInfo) return '';
         const start = assignFixedModalInfo.weekStartDate;
         const end = addDays(start, 6);
          return `Semana: ${format(start, 'd MMM', { locale: es })} - ${format(end, 'd MMM, yyyy', { locale: es })}`;
     }, [assignFixedModalInfo]);


    // --- Renderizado Principal (sin cambios) ---
    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center gap-2">
                 <h1 className="text-3xl font-bold text-slate-800">Programador de Horarios</h1>
                 <Tooltip text="Asigna horarios temporales a los empleados para días específicos o semanas completas.">
                     <InfoIcon />
                 </Tooltip>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                 <AttendanceToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedDepartment={selectedDepartment}
                    setSelectedDepartment={setSelectedDepartment}
                    selectedPayrollGroup={selectedPayrollGroup}
                    setSelectedPayrollGroup={setSelectedPayrollGroup}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    rangeLabel={rangeLabel}
                    handleDatePrev={handleDatePrev}
                    handleDateNext={handleDateNext}
                    user={user}
                />

                <style>{`:root { --employee-col-width: ${employeeColumnWidth}px; }`}</style>

                {renderContent()}
            </div>

            {/* --- Modales (sin cambios) --- */}
            {viewingEmployeeId && (
                <EmployeeProfileModal
                    employeeId={viewingEmployeeId}
                    onClose={() => setViewingEmployeeId(null)}
                    getToken={getToken}
                    user={user}
                />
            )}

            <AssignFixedScheduleModal
                isOpen={!!assignFixedModalInfo}
                onClose={() => setAssignFixedModalInfo(null)}
                employeeName={assignFixedModalInfo?.employeeName || ''}
                fixedSchedules={fixedSchedules}
                onAssign={handleAssignFixedToWeek} // Solo pasa el ID
                targetWeekLabel={assignModalWeekLabel} // Pasa el label calculado
            />

        </div>
    );
};

