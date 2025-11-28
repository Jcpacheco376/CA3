// src/features/attendance/SchedulePage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import {
    format, startOfWeek, endOfWeek, addDays, subDays, getDay, addMonths, subMonths,
    addWeeks, subWeeks, startOfMonth, endOfMonth, isToday as isTodayDateFns,
    isWithinInterval, getDay as getDayOfWeek, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Loader2, Briefcase, Building, Cake, GripVertical, Contact, InfoIcon as Info,
    Sun, Moon, Sunset, Coffee, RotateCw, X, CalendarCheck, Tag, MapPin, AlertTriangle
} from 'lucide-react';
import { AttendanceToolbar, FilterConfig } from './AttendanceToolbar';
import { ScheduleCell } from './ScheduleCell';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { AssignFixedScheduleModal } from './AssignFixedScheduleModal';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { themes, statusColorPalette } from '../../config/theme';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableSkeleton } from '../../components/ui/TableSkeleton';

// ... (Helpers: getTurnoIcon, determineTurnoFromTime, isBirthdayInPeriod, getHorarioTooltip se mantienen igual) ...
//const getTurnoIcon = (turno: 'M' | 'V' | 'N' | string | null | undefined, size = 14) => { /* ... sin cambios ... */ };
//const determineTurnoFromTime = (horaEntrada: string): 'M' | 'V' | 'N' | null => { /* ... sin cambios ... */ };


const isBirthdayInPeriod = (birthDateStr: string, period: Date[]): boolean => {
    if (!birthDateStr || period.length === 0) return false;
    try {
        const parts = birthDateStr.substring(0, 10).split('-');
        const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

        const today = new Date();
        const birthDateThisYear = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());

        return isWithinInterval(birthDateThisYear, {
            start: period[0],
            end: period[period.length - 1]
        });
    } catch (e) {
        return false;
    }
};
const getHorarioTooltip = (horario: any) => {
    if (!horario) return "Sin horario base";
    const firstDay = horario.Turnos?.find((t: any) => t.EsDiaLaboral);
    let details = `Horario Base: ${horario.Nombre} `;
    if (firstDay) {
        details += ` | Inicia: ${firstDay.HoraEntrada || '--:--'} - ${firstDay.HoraSalida || '--:--'}`;
    }
    return details;
};

const COLUMN_WIDTH_STORAGE_KEY = 'schedule_employee_column_width';
const EMPLOYEE_CONTENT_MIN_WIDTH = 360;
const EMPLOYEE_CONTENT_MAX_WIDTH = 500;
const MIN_COLUMN_WIDTH = EMPLOYEE_CONTENT_MIN_WIDTH + 16; // 376
const MAX_COLUMN_WIDTH = EMPLOYEE_CONTENT_MAX_WIDTH + 250; // 516
const DEFAULT_COLUMN_WIDTH = 384;
const ROW_HEIGHT_ESTIMATE = 72;


const FILTERS_KEY = 'app_schedule_filters';

const loadInitialFilters = (user: any) => {
    try {
        const saved = localStorage.getItem(FILTERS_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error("Error al leer filtros de localStorage", e);
    }

    // Si no hay nada guardado, aplicamos los defaults del usuario
    return {
        depts: user?.Departamentos?.length === 1 ? [user.Departamentos[0].DepartamentoId] : [],
        groups: user?.GruposNomina?.length === 1 ? [user.GruposNomina[0].GrupoNominaId] : [],
        puestos: user?.Puestos?.length === 1 ? [user.Puestos[0].PuestoId] : [],
        estabs: user?.Establecimientos?.length === 1 ? [user.Establecimientos[0].EstablecimientoId] : []
    };
};

export const SchedulePage = () => {
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<any[]>([]);
    const [scheduleCatalog, setScheduleCatalog] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignFixedModalInfo, setAssignFixedModalInfo] = useState<{ employeeId: number, employeeName: string } | null>(null);
    const [openCellId, setOpenCellId] = useState<string | null>(null);
    const [showOnlyPending, setShowOnlyPending] = useState(false);

    const [filters, setFilters] = useState(() => loadInitialFilters(user));

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

    const [activeWeekStartDate, setActiveWeekStartDate] = useState<Date | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimerRef = useRef<number | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
        } catch (e) {
            console.error("Error al guardar filtros en localStorage", e);
        }
    }, [filters]);

    const { dateRange, rangeLabel } = useMemo(() => {
        let start, end;
        let label = '';
        switch (viewMode) {
            case 'fortnight':
                const dayOfMonth = currentDate.getDate();
                if (dayOfMonth <= 15) {
                    start = startOfMonth(currentDate);
                    end = new Date(currentDate.getFullYear(), currentDate.getMonth(), 15);
                } else {
                    start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 16);
                    end = endOfMonth(currentDate);
                }
                label = `${format(start, 'd')} - ${format(end, 'd \'de\' MMMM, yyyy', { locale: es })}`;
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
        while (day <= end) {
            range.push(day);
            day = addDays(day, 1);
        }
        return { dateRange: range, rangeLabel: label };
    }, [currentDate, viewMode]);

    const updateActiveWeek = useCallback(() => {
        if (!scrollContainerRef.current || dateRange.length === 0) return;
        const { scrollLeft, clientWidth, scrollWidth } = scrollContainerRef.current;
        let startOfActiveWeek: Date | null = null;
        const scrollEndTolerance = 5;
        if (scrollLeft <= 0) {
            startOfActiveWeek = startOfWeek(dateRange[0], { weekStartsOn: 1 });
        } else if (scrollLeft + clientWidth >= scrollWidth - scrollEndTolerance) {
            startOfActiveWeek = startOfWeek(dateRange[dateRange.length - 1], { weekStartsOn: 1 });
        } else {
            const cellWidth = viewMode === 'week' ? 96 : 64;
            const detectionPoint = scrollLeft + (clientWidth * 0.3);
            let dayIndex = Math.floor(detectionPoint / cellWidth);
            dayIndex = Math.max(0, Math.min(dayIndex, dateRange.length - 1));
            const activeDay = dateRange[dayIndex];
            if (activeDay) {
                startOfActiveWeek = startOfWeek(activeDay, { weekStartsOn: 1 });
            }
        }
        if (startOfActiveWeek) {
            setActiveWeekStartDate(currentActiveWeek => {
                if (!currentActiveWeek || !isSameDay(currentActiveWeek, startOfActiveWeek!)) {
                    return startOfActiveWeek;
                }
                return currentActiveWeek;
            });
        }
    }, [dateRange, viewMode]);

    useEffect(() => {
        const scrollContainer = scrollContainerRef.current;
        const handleScroll = () => {
            if (scrollTimerRef.current) {
                cancelAnimationFrame(scrollTimerRef.current);
            }
            scrollTimerRef.current = requestAnimationFrame(updateActiveWeek);
        };
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
            updateActiveWeek();
        }
        return () => {
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', handleScroll);
            }
            if (scrollTimerRef.current) {
                cancelAnimationFrame(scrollTimerRef.current);
            }
        };
    }, [updateActiveWeek]);

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = 0;
        }
        if (dateRange.length > 0) {
            const firstWeekStart = startOfWeek(dateRange[0], { weekStartsOn: 1 });
            setActiveWeekStartDate(firstWeekStart);
        }
    }, [dateRange]);

    const handleDatePrev = useCallback(() => {
        setCurrentDate(prevDate => {
            switch (viewMode) {
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
        setCurrentDate(prevDate => {
            switch (viewMode) {
                case 'fortnight':
                    const day = prevDate.getDate();
                    if (day <= 15) return new Date(prevDate.getFullYear(), prevDate.getMonth(), 16);
                    return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
                case 'month': return addMonths(prevDate, 1);
                default: return addWeeks(prevDate, 1);
            }
        });
    }, [viewMode]);


    const fetchData = useCallback(async () => {
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

        // 1. Preparar Headers y Body
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        const body = JSON.stringify({
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'),
            filters: {
                departamentos: filters.depts,
                gruposNomina: filters.groups,
                puestos: filters.puestos,
                establecimientos: filters.estabs
            }
        });

        try {

            const [assignmentsRes, schedulesRes] = await Promise.all([

                fetch(`${API_BASE_URL}/schedules/assignments`, {
                    method: 'POST',
                    headers,
                    body
                }),

                fetch(`${API_BASE_URL}/schedules`, { headers })
            ]);

            if (!assignmentsRes.ok) {
                const errData = await assignmentsRes.json();
                throw new Error(errData.message || `Error ${assignmentsRes.status} al cargar asignaciones.`);
            }
            if (!schedulesRes.ok) throw new Error(`Error ${schedulesRes.status} al cargar catálogo de horarios.`);

            const assignmentsData = await assignmentsRes.json();
            const catalogData = await schedulesRes.json();

            setScheduleCatalog(catalogData);
            setEmployees(assignmentsData);

        } catch (err: any) {
            console.error("Error en fetchData:", err);
            setError(err.message);
            setEmployees([]); // Limpiar en caso de error
        }
        finally { setIsLoading(false); }
    }, [
        dateRange, user, getToken, canRead, filters
    ]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ... (El resto de funciones: handleBulkScheduleChange, handleAssignFixedToWeek, etc. se mantienen 100% igual) ...
    const handleBulkScheduleChange = async (updates: {
        empleadoId: number,
        fecha: Date,
        tipoAsignacion: 'H' | 'T' | 'D' | null,
        horarioId?: number | null,
        detalleId?: number | null
    }[]) => {
        if (!canAssign) {
            addNotification('Acceso Denegado', 'No tienes permiso para asignar horarios.', 'error');
            return;
        }
        const token = getToken();
        if (!token || updates.length === 0) return;

        const originalEmployees = employees;

        const updatesByEmployee = new Map<number, any[]>();
        for (const update of updates) {
            if (!updatesByEmployee.has(update.empleadoId)) {
                updatesByEmployee.set(update.empleadoId, []);
            }
            updatesByEmployee.get(update.empleadoId)!.push(update);
        }

        setEmployees(prevEmployees => {
            return prevEmployees.map(emp => {
                if (!updatesByEmployee.has(emp.EmpleadoId)) {
                    return emp;
                }

                const empUpdates = updatesByEmployee.get(emp.EmpleadoId)!;
                const newHorariosAsignados = [...emp.HorariosAsignados];

                for (const update of empUpdates) {
                    const fechaStr = format(update.fecha, 'yyyy-MM-dd');
                    const recordIndex = newHorariosAsignados.findIndex(h => h.Fecha === fechaStr);

                    let newAsignacion = null;
                    if (update.tipoAsignacion) {
                        newAsignacion = {
                            Fecha: fechaStr,
                            TipoAsignacion: update.tipoAsignacion,
                            HorarioIdAplicable: update.tipoAsignacion === 'H' ? update.horarioId : null,
                            HorarioDetalleIdAplicable: update.tipoAsignacion === 'T' ? update.detalleId : null,
                            EstatusConflictivo: null
                        };
                    }

                    if (recordIndex > -1) {
                        if (newAsignacion) {
                            newHorariosAsignados[recordIndex] = newAsignacion;
                        } else {
                            newHorariosAsignados.splice(recordIndex, 1);
                        }
                    } else if (newAsignacion) {
                        newHorariosAsignados.push(newAsignacion);
                    }
                }

                return { ...emp, HorariosAsignados: newHorariosAsignados };
            });
        });

        try {
            const res = await fetch(`${API_BASE_URL}/schedules/assignments`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates),
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'El servidor rechazó la actualización.');
            }
            addNotification('Guardado', `${updates.length} asignacion(es) guardada(s).`, 'success');
        } catch (err: any) {
            addNotification('Error al Guardar', `No se pudieron guardar los cambios: ${err.message}`, 'error');
            setEmployees(originalEmployees);
        }
    };
    const handleAssignFixedToWeek = (horarioId: number | null) => {
        if (!assignFixedModalInfo || !activeWeekStartDate) {
            addNotification('Error', 'No se ha seleccionado una semana activa.', 'error');
            return;
        }

        const { employeeId } = assignFixedModalInfo;
        const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(activeWeekStartDate, i));

        let updates;

        if (horarioId === null) {
            updates = weekDays.map(day => ({
                empleadoId: employeeId,
                fecha: day,
                tipoAsignacion: null,
                horarioId: null,
                detalleId: null
            }));
        } else {
            updates = weekDays.map(day => ({
                empleadoId: employeeId,
                fecha: day,
                tipoAsignacion: 'H' as 'H',
                horarioId: horarioId,
                detalleId: null
            }));
        }

        handleBulkScheduleChange(updates);
        setAssignFixedModalInfo(null);
    };
    const handleToggleOpen = (cellId: string | null) => {
        setOpenCellId(prev => (prev === cellId ? null : cellId));
    };
    const getActiveWeekLabel = () => {
        if (!activeWeekStartDate) return "Cargando semana...";
        const endDate = endOfWeek(activeWeekStartDate, { weekStartsOn: 1 });
        return `Semana del ${format(activeWeekStartDate, 'd MMM')} al ${format(endDate, 'd MMM, yyyy', { locale: es })}`;
    };

    // Pre-compute rotativo status for all horarios (cache)
    const rotatvivoCache = useMemo(() => {
        const cache = new Map<number, boolean>();
        scheduleCatalog.forEach(horario => {
            cache.set(horario.HorarioId, horario.EsRotativo === true);
        });
        return cache;
    }, [scheduleCatalog]);

    // Pre-compute which employees have pending assignments for instant filtering
    const pendingEmployeeIds = useMemo(() => {
        const pendingIds = new Set<number>();

        employees.forEach(emp => {
            if (!emp.HorarioDefaultId) return;

            const isRotativo = rotatvivoCache.get(emp.HorarioDefaultId);
            if (!isRotativo) return;

            // Check if has pending assignments in the period
            const hasPending = dateRange.some(day => {
                const fechaStr = format(day, 'yyyy-MM-dd');
                const assignment = emp.HorariosAsignados?.find((h: any) => h.Fecha === fechaStr);
                return !assignment || !assignment.TipoAsignacion;
            });

            if (hasPending) {
                pendingIds.add(emp.EmpleadoId);
            }
        });

        return pendingIds;
    }, [employees, dateRange, rotatvivoCache]);

    const filteredEmployees = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word);

        return employees.filter(emp => {
            // Filtro de búsqueda
            if (searchWords.length > 0) {
                const targetText = ((emp?.NombreCompleto || '') + ' ' + (emp?.CodRef || '')).toLowerCase();
                if (!searchWords.every(word => targetText.includes(word))) {
                    return false;
                }
            }

            // Filtro de pendientes: instant Set lookup instead of nested loops
            if (showOnlyPending) {
                return pendingEmployeeIds.has(emp.EmpleadoId);
            }

            return true;
        });
    }, [employees, searchTerm, showOnlyPending, pendingEmployeeIds]);

    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        document.body.classList.add('select-none', 'cursor-col-resize');
        
        const startX = e.clientX;
        const startWidth = employeeColumnWidth;
        let rAFId: number | null = null;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            // Cancel previous RAF if still pending to batch updates
            if (rAFId !== null) {
                cancelAnimationFrame(rAFId);
            }
            
            // Schedule state update in next animation frame (throttles to ~60fps max)
            rAFId = requestAnimationFrame(() => {
                const newWidth = startWidth + (moveEvent.clientX - startX);
                const clampedWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(newWidth, MAX_COLUMN_WIDTH));
                
                // Update state with RAF throttling - no competing updates, just smart batching
                setEmployeeColumnWidth(clampedWidth);
                rAFId = null;
            });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            // Cleanup RAF
            if (rAFId !== null) {
                cancelAnimationFrame(rAFId);
                rAFId = null;
            }
            
            document.body.classList.remove('select-none', 'cursor-col-resize');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            
            // Calculate and save final width
            const finalWidth = startWidth + (upEvent.clientX - startX);
            const clampedFinalWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(finalWidth, MAX_COLUMN_WIDTH));
            
            setEmployeeColumnWidth(clampedFinalWidth);
            localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, clampedFinalWidth.toString());
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    // --- Sección de Virtualización (Sin cambios) ---
    const rowVirtualizer = useVirtualizer({
        count: filteredEmployees.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        overscan: 15,
    });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;
    // --- FIN Virtualización ---


    const filterConfigurations: FilterConfig[] = useMemo(() => {
        const filtersConfig: FilterConfig[] = [
            {
                id: 'departamentos',
                title: 'Departamentos',
                icon: <Building />,
                options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [],
                selectedValues: filters.depts,
                onChange: (depts) => setFilters(f => ({ ...f, depts: depts as number[] })),
                isActive: user?.activeFilters?.departamentos ?? false,
            },
            {
                id: 'gruposNomina',
                title: 'Grupos Nómina',
                icon: <Briefcase />,
                options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [],
                selectedValues: filters.groups,
                onChange: (groups) => setFilters(f => ({ ...f, groups: groups as number[] })),
                isActive: user?.activeFilters?.gruposNomina ?? false,
            },
            {
                id: 'puestos',
                title: 'Puestos',
                icon: <Tag />,
                options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [],
                selectedValues: filters.puestos,
                onChange: (puestos) => setFilters(f => ({ ...f, puestos: puestos as number[] })),
                isActive: user?.activeFilters?.puestos ?? false,
            },
            {
                id: 'establecimientos',
                title: 'Establecimientos',
                icon: <MapPin />,
                options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [],
                selectedValues: filters.estabs,
                onChange: (estabs) => setFilters(f => ({ ...f, estabs: estabs as number[] })),
                isActive: user?.activeFilters?.establecimientos ?? false,
            }
        ];
        return filtersConfig.filter(f => f.isActive && f.options.length > 0);
    }, [user, filters]); // Ahora solo depende de 'user' y 'filters'


    const renderContent = () => {
        if (isLoading) {
            return (
                <TableSkeleton
                    employeeColumnWidth={employeeColumnWidth}
                    dateRange={dateRange}
                    viewMode={viewMode}
                    pageType="schedule"
                />
            );
        }
        if (error) { return <div className="p-16 text-center"> <p className="font-semibold text-red-600">Error al Cargar</p> <p className="text-slate-500 text-sm mt-1">{error}</p> </div>; }
        return (
            <div ref={scrollContainerRef} className="overflow-auto relative flex-1 animate-content-fade-in">
                <table className="text-sm text-center border-collapse table-fixed">
                    <thead
                        className="sticky top-0 z-20"
                        style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
                    >
                        <tr className="bg-slate-50">
                            <th
                                className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm group relative"
                                style={{
                                    width: `${employeeColumnWidth}px`,
                                    willChange: 'width'
                                }}
                            >
                                <div className="flex items-center gap-3 flex-1 min-w-0 pr-8">
                                    <span>Empleado</span>
                                    <div className="ml-auto">
                                        <Tooltip text={showOnlyPending ? "Mostrando solo pendientes • Click para ver todos" : "Ver solo asignaciones pendientes"}>
                                            <button
                                                onClick={() => setShowOnlyPending(!showOnlyPending)}
                                                className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${showOnlyPending
                                                        ? 'text-amber-600 bg-amber-50'
                                                        : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                                                    }`}
                                            >
                                                <AlertTriangle size={18} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                                <div 
                                    onMouseDown={handleResizeMouseDown} 
                                    className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize group flex items-center justify-center"
                                >
                                    <GripVertical className="h-5 text-slate-300 group-hover:text-[--theme-500] transition-colors" />
                                </div>
                            </th>

                            {dateRange.map((day, dayIndex) => {
                                const isMonday = getDayOfWeek(day) === 1;
                                const startOfWeekForDay = startOfWeek(day, { weekStartsOn: 1 });
                                const isActiveWeek = activeWeekStartDate && isSameDay(startOfWeekForDay, activeWeekStartDate);
                                const isFirstDay = dayIndex === 0;
                                let thClasses = `px-1 py-2 font-semibold text-slate-600 min-w-[${viewMode === 'week' ? '6rem' : '4rem'}] transition-colors duration-150 relative `;
                                if (isTodayDateFns(day)) {
                                    thClasses += 'bg-sky-100';
                                } else if (isActiveWeek) {
                                    thClasses += 'bg-slate-100';
                                } else {
                                    thClasses += 'bg-slate-50';
                                }
                                if (isMonday && !isFirstDay) {
                                    thClasses += ' border-l-2 border-slate-300';
                                }
                                return (
                                    <th key={day.toISOString()} className={thClasses}>
                                        <span className="capitalize text-base">{format(day, 'eee', { locale: es })}</span>
                                        <span className="block text-xl font-bold text-slate-800">{format(day, 'dd')}</span>
                                        {isActiveWeek && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[--theme-500]"></div>}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                        className="animate-content-fade-in"
                    >

                        {paddingTop > 0 && (
                            <tr style={{ height: `${paddingTop}px`, border: 'none' }}>
                                <td colSpan={dateRange.length + 1} style={{ padding: 0, border: 'none' }}></td>
                            </tr>
                        )}

                        {virtualRows.map((virtualRow) => {
                            const emp = filteredEmployees[virtualRow.index];
                            const defaultSchedule = scheduleCatalog.find(h => h.HorarioId === emp.HorarioDefaultId);
                            const horarioTooltipText = getHorarioTooltip(defaultSchedule);
                            let birthdayTooltip = "Cumpleaños en este periodo";
                            if (emp.FechaNacimiento) {
                                try {
                                    const parts = emp.FechaNacimiento.substring(0, 10).split('-');
                                    const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                    const formattedBirthDate = format(birthDate, "d 'de' MMMM", { locale: es });
                                    birthdayTooltip = `Cumpleaños: ${formattedBirthDate}`;
                                } catch (e) { /* se queda el texto default */ }
                            }

                            return (
                                <tr
                                    key={emp.EmpleadoId}
                                    className="group"
                                    style={{ height: `${virtualRow.size}px` }}
                                >
                                    <td
                                        className="p-2 text-left sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm align-top border-b border-slate-100"
                                        style={{
                                            width: `${employeeColumnWidth}px`,
                                            willChange: 'width'
                                        }}
                                    >
                                        <div 
                                            className="w-full"
                                            style={{
                                                minWidth: `${EMPLOYEE_CONTENT_MIN_WIDTH}px`,
                                                maxWidth: `${EMPLOYEE_CONTENT_MAX_WIDTH}px`
                                            }}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-slate-800 truncate" title={emp?.NombreCompleto}>{emp?.NombreCompleto}</p>
                                                        {defaultSchedule && (
                                                            <Tooltip text={horarioTooltipText}>
                                                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    {defaultSchedule.Abreviatura || defaultSchedule.HorarioId}
                                                                </span>
                                                            </Tooltip>
                                                        )}
                                                        {isBirthdayInPeriod(emp.FechaNacimiento, dateRange) && (
                                                            <Tooltip text={birthdayTooltip}>
                                                                <Cake size={18} className="text-pink-400 shrink-0" />
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Tooltip text="Ver Ficha de Empleado">
                                                                <button onClick={() => setViewingEmployeeId(emp.EmpleadoId)} className="p-1 rounded-md text-slate-400 hover:text-[--theme-500] hover:bg-slate-200">
                                                                    <Contact size={18} />
                                                                </button>
                                                            </Tooltip>
                                                            {canAssign && (
                                                                <Tooltip text={activeWeekStartDate ? `Asignar a la semana del ${format(activeWeekStartDate, 'd MMM', { locale: es })}` : "Asignar horario"}>
                                                                    <button
                                                                        onClick={() => setAssignFixedModalInfo({ employeeId: emp.EmpleadoId, employeeName: emp.NombreCompleto || 'Empleado' })}
                                                                        className="p-1 rounded-md text-slate-500 hover:text-[--theme-600] hover:bg-slate-200 transition-colors"
                                                                    >
                                                                        <CalendarCheck size={20} />
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                    <Tooltip text={`ID: ${emp?.CodRef}`}>
                                                        <p className="font-mono col-span-1 truncate">ID: {emp?.CodRef}</p>
                                                    </Tooltip>
                                                    <Tooltip text={emp?.puesto_descripcion || 'No asignado'}>
                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{emp?.puesto_descripcion || 'No asignado'}</span>
                                                        </p>
                                                    </Tooltip>
                                                    <Tooltip text={emp?.departamento_nombre || 'No asignado'}>
                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                            <Building size={12} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{emp?.departamento_nombre || 'No asignado'}</span>
                                                        </p>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    {dateRange.map((day, dayIndex) => {
                                        const cellId = `${emp.EmpleadoId}-${dayIndex}`;
                                        const scheduleData = emp?.HorariosAsignados?.find(
                                            (h: any) => h.Fecha === format(day, 'yyyy-MM-dd')
                                        );
                                        const isMonday = getDayOfWeek(day) === 1;
                                        const isFirstDay = dayIndex === 0;
                                        let tdClasses = "align-top border-b border-slate-100";
                                        if (isMonday && !isFirstDay) {
                                            tdClasses += ' border-l-2 border-slate-300';
                                        }

                                        const horarioDefault = scheduleCatalog.find(h => h.HorarioId === emp.HorarioDefaultId);
                                        const isRotativoEmployee = horarioDefault?.EsRotativo === true;

                                        return (
                                            <ScheduleCell
                                                key={cellId}
                                                cellId={cellId}
                                                day={day}
                                                isOpen={openCellId === cellId}
                                                onToggleOpen={handleToggleOpen}
                                                scheduleData={scheduleData}
                                                horarioDefaultId={emp.HorarioDefaultId}
                                                onScheduleChange={({ tipoAsignacion, horarioId, detalleId }: any) => handleBulkScheduleChange([{
                                                    empleadoId: emp.EmpleadoId,
                                                    fecha: day,
                                                    tipoAsignacion: tipoAsignacion,
                                                    horarioId: horarioId,
                                                    detalleId: detalleId
                                                }])}
                                                scheduleCatalog={scheduleCatalog}
                                                isToday={isTodayDateFns(day)}
                                                canAssign={canAssign}
                                                viewMode={viewMode}
                                                className={tdClasses}
                                                isRotativoEmployee={isRotativoEmployee}
                                            />
                                        );
                                    })}
                                </tr>
                            );
                        })}

                        {paddingBottom > 0 && (
                            <tr style={{ height: `${paddingBottom}px`, border: 'none' }}>
                                <td colSpan={dateRange.length + 1} style={{ padding: 0, border: 'none' }}></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    const fixedSchedules = useMemo(() => scheduleCatalog.filter(h => !h.EsRotativo), [scheduleCatalog]);

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-800">Programador de Horarios</h1>
                <Tooltip text="Asigna horarios temporales a los empleados para días específicos o semanas completas.">
                    <InfoIcon />
                </Tooltip>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                {/* --- MODIFICACIÓN: Pasando la nueva prop a la Toolbar --- */}
                <AttendanceToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterConfigurations={filterConfigurations}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    rangeLabel={rangeLabel}
                    handleDatePrev={handleDatePrev}
                    handleDateNext={handleDateNext}
                    currentDate={currentDate}
                    onDateChange={setCurrentDate}
                />

                {renderContent()}
            </div>

            {viewingEmployeeId && (
                <EmployeeProfileModal
                    employeeId={viewingEmployeeId as any}
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
                onAssign={handleAssignFixedToWeek}
                targetWeekLabel={activeWeekStartDate ? getActiveWeekLabel() : "Asignar a semana..."}
            />

        </div>
    );
};