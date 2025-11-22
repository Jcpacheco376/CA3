// src/features/attendance/AttendancePage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import { format, startOfWeek, endOfWeek, addDays, subDays, getDay, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, isToday as isTodayDateFns, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, ClipboardCheck, Briefcase, Building, Cake, GripVertical, Contact, Tag, MapPin } from 'lucide-react';
import { AttendanceCell } from './AttendanceCell';
import { Button, Modal } from '../../components/ui/Modal';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { AttendanceToolbar, FilterConfig } from './AttendanceToolbar';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableSkeleton } from '../../components/ui/TableSkeleton';

// ... (Helpers: isRestDay, isBirthdayInPeriod, getHorarioTooltip, ConfirmationModal se mantienen igual) ...
const isRestDay = (horario: string, date: Date): boolean => {
    if (!horario || horario.length !== 7) return false;
    const dayOfWeek = getDay(date);
    const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return horario.charAt(index) === '1';
};
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
    } catch (e) { return false; }
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
const ConfirmationModal = ({ confirmation, setConfirmation }: any) => {
    if (!confirmation.isOpen) return null;
    const footer = (
        <>
            <Button variant="secondary" onClick={() => setConfirmation({ isOpen: false })}>Cancelar</Button>
            <Button onClick={() => { confirmation.onConfirm(); setConfirmation({ isOpen: false }); }}>Aprobar</Button>
        </>
    );
    return (
        <Modal isOpen={confirmation.isOpen} onClose={() => setConfirmation({ isOpen: false })} title={confirmation.title} footer={footer} size="lg">
            <p className="text-slate-600">{confirmation.message}</p>
        </Modal>
    );
};

const COLUMN_WIDTH_STORAGE_KEY = 'attendance_employee_column_width';
const EMPLOYEE_CONTENT_MIN_WIDTH = 360;
const EMPLOYEE_CONTENT_MAX_WIDTH = 500;
const MIN_COLUMN_WIDTH = EMPLOYEE_CONTENT_MIN_WIDTH + 16; // 376
const MAX_COLUMN_WIDTH = EMPLOYEE_CONTENT_MAX_WIDTH + 250; // 516
const DEFAULT_COLUMN_WIDTH = 384;
const ROW_HEIGHT_ESTIMATE = 72;

const FILTERS_KEY = 'app_attendance_filters';

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

export const AttendancePage = () => {
    const { getToken, user, can } = useAuth(); // 'user' ahora tiene Puestos y Establecimientos
    const { addNotification } = useNotification();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<any[]>([]);
    const [scheduleCatalog, setScheduleCatalog] = useState<any[]>([]);
    const [statusCatalog, setStatusCatalog] = useState<AttendanceStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dragInfo, setDragInfo] = useState<{ EmpleadoId: number, dayIndex: number, status: AttendanceStatusCode } | null>(null);
    const [draggedCells, setDraggedCells] = useState<string[]>([]);
    const [confirmation, setConfirmation] = useState<any>({ isOpen: false });
    const [openCellId, setOpenCellId] = useState<string | null>(null);

    const [filters, setFilters] = useState(() => loadInitialFilters(user));

    // const [selectedDepts, setSelectedDepts] = useState<number[]>(() =>
    //     user?.Departamentos?.length === 1 ? [user.Departamentos[0].DepartamentoId] : []
    // );
    // const [selectedGroups, setSelectedGroups] = useState<number[]>(() =>
    //     user?.GruposNomina?.length === 1 ? [user.GruposNomina[0].GrupoNominaId] : []
    // );
    // const [selectedPuestos, setSelectedPuestos] = useState<number[]>(() =>
    //     user?.Puestos?.length === 1 ? [user.Puestos[0].PuestoId] : []
    // );
    // const [selectedEstabs, setSelectedEstabs] = useState<number[]>(() =>
    //     user?.Establecimientos?.length === 1 ? [user.Establecimientos[0].EstablecimientoId] : []
    // );

    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);
    const [viewMode, setViewMode] = useState<'week' | 'fortnight' | 'month'>('week');

    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try {
            const savedWidth = localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
            return savedWidth ? Math.max(MIN_COLUMN_WIDTH, Math.min(parseInt(savedWidth, 10), MAX_COLUMN_WIDTH)) : DEFAULT_COLUMN_WIDTH;
        } catch {
            return DEFAULT_COLUMN_WIDTH;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
        } catch (e) {
            console.error("Error al guardar filtros en localStorage", e);
        }
    }, [filters]);
    const { dateRange, rangeLabel } = useMemo(() => {
        // ... (lógica de dateRange sin cambios)
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

    const filteredEmployees = useMemo(() => {
        if (searchTerm === '') return employees;
        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word);

        return employees.filter(emp => {
            const targetText = (emp.NombreCompleto + ' ' + emp.EmpleadoId).toLowerCase();
            return searchWords.every(word => targetText.includes(word));
        });
    }, [employees, searchTerm]);

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredEmployees.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        overscan: 15, // Mantenemos el overscan agresivo
    });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;
    // --- FIN Virtualización ---

    const handleDatePrev = () => {
        setCurrentDate(prevDate => {
            switch (viewMode) {
                case 'fortnight':
                    const day = prevDate.getDate();
                    if (day <= 15) {
                        return new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 16);
                    } else {
                        return new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
                    }
                case 'month':
                    return subMonths(prevDate, 1);
                default:
                    return subWeeks(prevDate, 1);
            }
        });
    };
    const handleDateNext = () => {
        setCurrentDate(prevDate => {
            switch (viewMode) {
                case 'fortnight':
                    const day = prevDate.getDate();
                    if (day <= 15) {
                        return new Date(prevDate.getFullYear(), prevDate.getMonth(), 16);
                    } else {
                        return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1);
                    }
                case 'month':
                    return addMonths(prevDate, 1);
                default:
                    return addWeeks(prevDate, 1);
            }
        });
    };
    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
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
    // --- FIN Virtualización ---

    const fetchData = useCallback(async () => {
        if (!user || dateRange.length === 0) return;
        const token = getToken();
        if (!token) { setError("Sesión inválida."); setIsLoading(false); return; }

        setIsLoading(true);
        setError(null);

        // 1. Preparar Headers y Body
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json' // Necesario para POST
        };

        // Body para obtener datos (con filtros)
        const dataBody = JSON.stringify({
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'),
            filters: {
                departamentos: filters.depts,
                gruposNomina: filters.groups,
                puestos: filters.puestos,
                establecimientos: filters.estabs
            }
        });

        // Body para procesar el rango (sin filtros, ya que el SP usa el UsuarioId)
        const ensureBody = JSON.stringify({
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd')
        });

        try {

            if (!can('reportesAsistencia.read')) {
                throw new Error("No tienes permiso para ver este módulo.");
            }

            if (can('reportesAsistencia.assign')) {
                const ensureRes = await fetch(`${API_BASE_URL}/attendance/ensure-range`, { 
                    method: 'POST',
                    headers, 
                    body: ensureBody 
                });

                if (!ensureRes.ok) {
                    const errData = await ensureRes.json();
                    console.warn("No se pudo procesar el rango:", errData.message);
                    addNotification("Aviso de Procesamiento", "No se pudieron calcular las nuevas checadas. " + (errData.message || ''), "error");
                }
            }

            // if (!ensureRes.ok) {
            //     const errData = await ensureRes.json();
            //     throw new Error(errData.message || `Error ${ensureRes.status} al procesar el rango.`);
            // }

            const employeesPromise = fetch(`${API_BASE_URL}/attendance/data-by-range`, {
                method: 'POST',
                headers,
                body: dataBody
            });
            
            if (!can('catalogo.estatusAsistencia.read')) {
                throw new Error("No tienes permiso para ver el catálogo de estatus. La página no puede cargar.");
            }

            const statusesPromise = fetch(`${API_BASE_URL}/catalogs/attendance-statuses`, { headers });

            const schedulesPromise = can('horarios.read')
                ? fetch(`${API_BASE_URL}/schedules`, { headers })
                : Promise.resolve(null); // Si no tiene permiso, devolvemos null

            const [employeesRes, statusesRes, schedulesRes] = await Promise.all([
                employeesPromise,
                statusesPromise,
                schedulesPromise
            ]);

            // // 3. Ejecutar Promesas (ahora que sabemos que los datos están procesados)
            // const [employeesRes, schedulesRes, statusesRes] = await Promise.all([
            //     // Llamamos a data-by-range
            //     fetch(`${API_BASE_URL}/attendance/data-by-range`, { 
            //         method: 'POST',
            //         headers, 
            //         body: dataBody 
            //     }),
            //     // Y a los catálogos
            //     fetch(`${API_BASE_URL}/schedules`, { headers }),
            //     fetch(`${API_BASE_URL}/catalogs/attendance-statuses`, { headers })
            // ]);

            // Manejo de errores de las peticiones
            if (!employeesRes.ok) {
                const errData = await employeesRes.json();
                throw new Error(errData.message || `Error ${employeesRes.status} al cargar datos de asistencia.`);
            }
            // if (!schedulesRes.ok) throw new Error(`Error ${schedulesRes.status} al cargar catálogo de horarios.`);
            if (!statusesRes.ok) throw new Error(`Error ${statusesRes.status} al cargar catálogo de estatus.`);

            const employeesData = await employeesRes.json();
            // const catalogData = await schedulesRes.json();
            const statusesData = await statusesRes.json();

            setEmployees(employeesData);
            // setScheduleCatalog(catalogData);
            setStatusCatalog(statusesData);

            if (schedulesRes) {
                if (schedulesRes.ok) {
                    setScheduleCatalog(await schedulesRes.json());
                } else {
                    // No es un error fatal, solo un aviso
                    console.warn("No se pudo cargar el catálogo de horarios, los tooltips pueden estar limitados.");
                    setScheduleCatalog([]);
                }
            } else {
                setScheduleCatalog([]); // Si no tiene permiso, lo dejamos vacío
            }

        } catch (err: any) {
            console.error("Error en fetchData:", err);
            setError(err.message);
            setEmployees([]); // Limpiar empleados en caso de error
        } finally {
            setIsLoading(false);
        }
    }, [
        dateRange, user, getToken,
        filters, can // Dependencia de filtros
    ]);

    useEffect(() => {
        fetchData();
    }, [fetchData]); // El useEffect no cambia, pero el 'fetchData' del que depende sí

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (event.target instanceof Element && !event.target.closest('.status-cell-wrapper')) {
                setOpenCellId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBulkStatusChange = useCallback(async (updates: { empleadoId: number, fecha: Date, estatus: string, comentarios?: string }[]) => {
        const token = getToken();
        if (!token || updates.length === 0) return;

        const originalEmployees = employees;

        setEmployees(prevEmployees => {
            const updatesMap = new Map<number, { fecha: string; estatus: string; comentarios?: string }[]>();
            updates.forEach(u => {
                const dateStr = format(u.fecha, 'yyyy-MM-dd');
                if (!updatesMap.has(u.empleadoId)) {
                    updatesMap.set(u.empleadoId, []);
                }
                updatesMap.get(u.empleadoId)!.push({ fecha: dateStr, estatus: u.estatus, comentarios: u.comentarios });
            });

            return prevEmployees.map(emp => {
                if (!updatesMap.has(emp.EmpleadoId)) {
                    return emp;
                }

                const empUpdates = updatesMap.get(emp.EmpleadoId)!;
                const newFichasSemana = [...emp.FichasSemana];
                let fichasChanged = false;

                empUpdates.forEach(update => {
                    const recordIndex = newFichasSemana.findIndex(f => f.Fecha.substring(0, 10) === update.fecha);

                    if (recordIndex > -1) {
                        const newFicha = {
                            ...newFichasSemana[recordIndex],
                            EstatusSupervisorAbrev: update.estatus
                        };
                        if (update.comentarios !== undefined) {
                            newFicha.Comentarios = update.comentarios;
                        }
                        if (newFichasSemana[recordIndex] !== newFicha) {
                            newFichasSemana[recordIndex] = newFicha;
                            fichasChanged = true;
                        }
                    } else {
                        newFichasSemana.push({
                            Fecha: new Date(update.fecha).toISOString(),
                            EstatusSupervisorAbrev: update.estatus,
                            Comentarios: update.comentarios,
                            EstatusChecadorAbrev: null,
                            EstatusAutorizacion: 'Pendiente'
                        });
                        fichasChanged = true;
                    }
                });

                if (!fichasChanged) {
                    return emp;
                }

                return { ...emp, FichasSemana: newFichasSemana };
            });
        });

        try {
            await Promise.all(updates.map(({ empleadoId, fecha, estatus, comentarios }) =>
                fetch(`${API_BASE_URL}/attendance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        empleadoId,
                        fecha: format(fecha, 'yyyy-MM-dd'),
                        estatusSupervisor: estatus,
                        comentarios
                    }),
                })
            ));
        } catch (err: any) {
            addNotification('Error al Guardar', 'Algunos cambios no se pudieron guardar. Reintentando...', 'error');
            setEmployees(originalEmployees);
        }
    }, [employees, getToken, addNotification]);

    const handleStatusChange = useCallback((empleadoId: number, fecha: Date, newStatus: AttendanceStatusCode, newComment?: string) => {
        handleBulkStatusChange([{
            empleadoId,
            fecha,
            estatus: newStatus,
            comentarios: newComment
        }]);
        setOpenCellId(null);
    }, [handleBulkStatusChange]);

    const handleQuickApprove = (employee: any) => {
        setConfirmation({
            isOpen: true,
            title: 'Aprobar Semana',
            message: `¿Estás seguro de que quieres aceptar todas las sugerencias del checador para ${employee.NombreCompleto}? Los cambios que ya hayas hecho manualmente no se verán afectados.`,
            onConfirm: () => executeQuickApprove(employee),
        });
    };

    const executeQuickApprove = async (employee: any) => {
        const token = getToken();
        if (!token) return;

        const originalEmployees = JSON.parse(JSON.stringify(employees));
        setEmployees(prevEmployees =>
            prevEmployees.map(emp => {
                if (emp.EmpleadoId === employee.EmpleadoId) {
                    const newFichasSemana = emp.FichasSemana.map((ficha: any) => {
                        if (ficha.EstatusChecadorAbrev && !ficha.EstatusSupervisorAbrev) {
                            return { ...ficha, EstatusSupervisorAbrev: ficha.EstatusChecadorAbrev };
                        }
                        return ficha;
                    });
                    return { ...emp, FichasSemana: newFichasSemana };
                }
                return emp;
            })
        );

        try {
            await fetch(`${API_BASE_URL}/attendance/approve-week`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ empleadoId: employee.EmpleadoId, weekStartDate: format(dateRange[0], 'yyyy-MM-dd') }),
            });
            addNotification('Semana Aprobada', `Se aceptaron las sugerencias para ${employee.NombreCompleto}`, 'success');
        } catch (e) {
            addNotification('Error', 'No se pudo aprobar la semana.', 'error');
            setEmployees(originalEmployees);
        }
    };

    const handleToggleOpen = useCallback((cellId: string) => {
        setOpenCellId(prev => (prev === cellId ? null : cellId));
    }, []);

    const handleDragStart = useCallback((EmpleadoId: number, dayIndex: number, status: AttendanceStatusCode) => {
        setOpenCellId(null);
        setDragInfo({ EmpleadoId, dayIndex, status });
    }, []);

    const handleDragEnter = useCallback((targetEmpleadoId: number, targetDayIndex: number) => {
        if (!dragInfo) return;
        const newDraggedCells: string[] = [];
        const empIds = filteredEmployees.map(e => e.EmpleadoId);
        const startEmpIndex = empIds.indexOf(dragInfo.EmpleadoId);
        const endEmpIndex = empIds.indexOf(targetEmpleadoId);
        const startDayIndex = dragInfo.dayIndex;
        const endDayIndex = targetDayIndex;
        for (let i = Math.min(startEmpIndex, endEmpIndex); i <= Math.max(startEmpIndex, endEmpIndex); i++) {
            for (let j = Math.min(startDayIndex, endDayIndex); j <= Math.max(startDayIndex, endDayIndex); j++) {
                newDraggedCells.push(`${empIds[i]}-${j}`);
            }
        }
        setDraggedCells(newDraggedCells);
    }, [dragInfo, filteredEmployees]);

    const handleDragEnd = () => {
        if (!dragInfo || draggedCells.length === 0) {
            setDragInfo(null);
            setDraggedCells([]);
            return;
        }
        const startCellId = `${dragInfo.EmpleadoId}-${dragInfo.dayIndex}`;
        if (draggedCells.length === 1 && draggedCells[0] === startCellId) {
            setDragInfo(null);
            setDraggedCells([]);
            return;
        }
        const updates = draggedCells
            .map(cellId => {
                const [empleadoIdStr, dayIndexStr] = cellId.split('-');
                const empleadoId = parseInt(empleadoIdStr, 10);
                const dayIndex = parseInt(dayIndexStr, 10);
                const employee = employees.find(e => e.EmpleadoId === empleadoId);
                if (!employee || isRestDay(employee.horario, dateRange[dayIndex])) return null;
                const ficha = employee.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === format(dateRange[dayIndex], 'yyyy-MM-dd'));
                if (ficha?.EstatusAutorizacion === 'Autorizado') return null;
                return { empleadoId, fecha: dateRange[dayIndex], estatus: dragInfo.status };
            })
            .filter(Boolean) as { empleadoId: number, fecha: Date, estatus: string }[];

        if (updates.length > 0) {
            handleBulkStatusChange(updates);
            addNotification('Actualización Exitosa', `${updates.length} fichas actualizadas.`, 'success');
        }
        setDragInfo(null);
        setDraggedCells([]);
    };

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
                    pageType="attendance"
                />
            );
        }
        if (error) {
            return <div className="p-16 text-center"> <p className="font-semibold text-red-600">Error al Cargar</p> <p className="text-slate-500 text-sm mt-1">{error}</p> </div>;
        }
        const canAssign = can('reportesAsistencia.assign');
        const canApprove = can('reportesAsistencia.approve');
        return (
            <div
                ref={tableContainerRef}
                className="overflow-auto relative flex-1"
                onMouseUp={handleDragEnd}
            >
                <table className="text-sm text-center border-collapse table-fixed">
                    <thead
                        className="sticky top-0 z-20"
                        style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
                    >
                        <tr className="bg-slate-50">
                            <th
                                className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm"
                                style={{
                                    width: `${employeeColumnWidth}px`,
                                    willChange: 'transform',
                                    transform: 'translate3d(0, 0, 0)'
                                }}
                            >
                                <div className="flex justify-between items-center h-full">
                                    <span>Empleado</span>
                                    <div onMouseDown={handleResizeMouseDown} className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize group flex items-center justify-center">
                                        <GripVertical className="h-5 text-slate-300 group-hover:text-[--theme-500] transition-colors" />
                                    </div>
                                </div>
                            </th>

                            {dateRange.map(day => (
                                <th key={day.toISOString()} className={`px-1 py-2 font-semibold text-slate-600 min-w-[${viewMode === 'week' ? '6rem' : '4rem'}] ${isTodayDateFns(day) ? 'bg-sky-100' : 'bg-slate-50'}`}>
                                    <span className="capitalize text-base">{format(day, 'eee', { locale: es })}</span>
                                    <span className="block text-xl font-bold text-slate-800">{format(day, 'dd')}</span>
                                </th>
                            ))}
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
                            const defaultSchedule = scheduleCatalog.find(h => h.HorarioId === emp.horario);
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
                            const workingDays = dateRange.filter(day => !isRestDay(emp.horario, day));
                            const completedDays = workingDays.filter(day => {
                                const formattedDay = format(day, 'yyyy-MM-dd');
                                const ficha = emp.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === formattedDay);
                                return ficha && ficha.EstatusSupervisorAbrev;
                            }).length;
                            const progress = workingDays.length > 0 ? (completedDays / workingDays.length) * 100 : 0;

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
                                            willChange: 'transform',
                                            transform: 'translate3d(0, 0, 0)'
                                        }}
                                    >
                                        <div
                                            className="w-full"
                                            style={{
                                                width: `${employeeColumnWidth - 16}px`,
                                                minWidth: `${EMPLOYEE_CONTENT_MIN_WIDTH}px`,
                                                maxWidth: `${EMPLOYEE_CONTENT_MAX_WIDTH}px`
                                            }}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-semibold text-slate-800 truncate" title={emp.NombreCompleto}>{emp.NombreCompleto}</p>
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
                                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                                            <Tooltip text="Ver Ficha de Empleado">
                                                                <button onClick={() => setViewingEmployeeId(emp.EmpleadoId)} className="p-1 rounded-md text-slate-400 hover:text-[--theme-500] hover:bg-slate-200">
                                                                    <Contact size={18} />
                                                                </button>
                                                            </Tooltip>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                        <Tooltip text={`ID: ${emp.CodRef}`}>
                                                            <p className="font-mono col-span-1 truncate">ID: {emp.CodRef}</p>
                                                        </Tooltip>
                                                        <Tooltip text={emp.puesto_descripcion || 'No asignado'}>
                                                            <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                                <Briefcase size={12} className="text-slate-400 shrink-0" />
                                                                <span className="truncate">{emp.puesto_descripcion || 'No asignado'}</span>
                                                            </p>
                                                        </Tooltip>
                                                        <Tooltip text={emp.departamento_nombre || 'No asignado'}>
                                                            <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                                <Building size={12} className="text-slate-400 shrink-0" />
                                                                <span className="truncate">{emp.departamento_nombre || 'No asignado'}</span>
                                                            </p>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                                {canApprove && (
                                                    <Tooltip text="Aprobar sugerencias para la semana">
                                                        <button onClick={() => handleQuickApprove(emp)} className="p-1 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-100 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                            <ClipboardCheck size={20} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                                                <div
                                                    className={`h-1.5 rounded-full transition-all duration-200 ${progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                   
                                    {dateRange.map((day, dayIndex) => {
                                        const formattedDay = format(day, 'yyyy-MM-dd');
                                        const ficha = emp.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === formattedDay);
                                        const cellId = `${emp.EmpleadoId}-${dayIndex}`;
                                        
                                        return (
                                            <AttendanceCell
                                                key={cellId}
                                                cellId={cellId}
                                                isToday={isTodayDateFns(day)}
                                                isOpen={openCellId === cellId}
                                                onToggleOpen={handleToggleOpen}
                                                ficha={ficha}
                                                viewMode={viewMode}
                                                isRestDay={isRestDay(emp.horario, day)}
                                                onStatusChange={(newStatus, newComment) => handleStatusChange(emp.EmpleadoId, day, newStatus, newComment)}
                                                canAssign={canAssign}
                                                onDragStart={(status: AttendanceStatusCode) => handleDragStart(emp.EmpleadoId, dayIndex, status)}
                                                onDragEnter={() => handleDragEnter(emp.EmpleadoId, dayIndex)}
                                                isBeingDragged={draggedCells.includes(cellId)}
                                                isAnyCellOpen={openCellId !== null}
                                                statusCatalog={statusCatalog}
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

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-800">Registro de Asistencia</h1>
                <Tooltip text="Valida la asistencia, registra incidencias y usa las herramientas de llenado rápido para agilizar la captura.">
                    <InfoIcon />
                </Tooltip>
            </header>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                {/* --- MODIFICACIÓN: Pasando la nueva prop a la Toolbar --- */}
                <AttendanceToolbar
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterConfigurations={filterConfigurations} // <-- PROP NUEVA
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
            <ConfirmationModal confirmation={confirmation} setConfirmation={setConfirmation} />
            {viewingEmployeeId && (
                <EmployeeProfileModal
                    employeeId={viewingEmployeeId as any}
                    onClose={() => setViewingEmployeeId(null)}
                    getToken={getToken}
                    user={user}
                />
            )}
        </div>
    );
};