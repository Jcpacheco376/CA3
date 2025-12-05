// src/features/attendance/AttendancePage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import { 
    format, isToday as isTodayDateFns, getDay as getDayOfWeek, isSameDay, isWithinInterval,
    startOfWeek, endOfWeek 
} from 'date-fns';
import { es } from 'date-fns/locale';
import { 
    Loader2, ClipboardCheck, Briefcase, Building, Cake, GripVertical, 
    Contact, CalendarOff, ListTodo, Tag, MapPin, AlertTriangle 
} from 'lucide-react';
import { AttendanceCell } from './AttendanceCell';
import { Button, Modal } from '../../components/ui/Modal';
import { AttendanceStatus, AttendanceStatusCode } from '../../types';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip'; 
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { AttendanceToolbar, FilterConfig } from './AttendanceToolbar';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TableSkeleton } from '../../components/ui/TableSkeleton';
import { canAssignStatusToDate } from '../../utils/attendanceValidation';
// IMPORTACIÓN DEL HOOK COMPARTIDO
import { useSharedAttendance } from '../../hooks/useSharedAttendance';

// ... (Helpers sin cambios) ...
const isRestDay = (horario: string, date: Date): boolean => {
    if (!horario || horario.length !== 7) return false;
    const dayOfWeek = getDayOfWeek(date);
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

// ... (Constantes) ...
const COLUMN_WIDTH_STORAGE_KEY = 'attendance_employee_column_width';
const EMPLOYEE_CONTENT_MIN_WIDTH = 360;
const EMPLOYEE_CONTENT_MAX_WIDTH = 500;
const MIN_COLUMN_WIDTH = EMPLOYEE_CONTENT_MIN_WIDTH + 16; 
const MAX_COLUMN_WIDTH = EMPLOYEE_CONTENT_MAX_WIDTH + 250;
const DEFAULT_COLUMN_WIDTH = 384;
const ROW_HEIGHT_ESTIMATE = 72;

export const AttendancePage = () => {
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    
    const { 
        filters, setFilters, 
        viewMode, setViewMode, 
        currentDate, setCurrentDate, 
        dateRange, rangeLabel, 
        handleDatePrev, handleDateNext 
    } = useSharedAttendance(user);

    const [employees, setEmployees] = useState<any[]>([]);
    const [scheduleCatalog, setScheduleCatalog] = useState<any[]>([]);
    const [statusCatalog, setStatusCatalog] = useState<AttendanceStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyNoSchedule, setShowOnlyNoSchedule] = useState(false);
    const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
    
    // Drag & Drop
    const [dragInfo, setDragInfo] = useState<{ EmpleadoId: number, dayIndex: number, status: AttendanceStatusCode } | null>(null);
    const [draggedCells, setDraggedCells] = useState<string[]>([]);
    
    const [confirmation, setConfirmation] = useState<any>({ isOpen: false });
    const [openCellId, setOpenCellId] = useState<string | null>(null);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);
    
    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try {
            const savedWidth = localStorage.getItem(COLUMN_WIDTH_STORAGE_KEY);
            return savedWidth ? Math.max(MIN_COLUMN_WIDTH, Math.min(parseInt(savedWidth, 10), MAX_COLUMN_WIDTH)) : DEFAULT_COLUMN_WIDTH;
        } catch { return DEFAULT_COLUMN_WIDTH; }
    });

    // ... (Filtrado de Empleados sin cambios) ...
    const filteredEmployees = useMemo(() => {
        let filtered = employees;
        if (searchTerm) {
            const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word);
            filtered = filtered.filter(emp => {
                const targetText = (emp.NombreCompleto + ' ' + emp.EmpleadoId + ' ' + emp.CodRef).toLowerCase();
                return searchWords.every(word => targetText.includes(word));
            });
        }
        if (showOnlyNoSchedule) {
            filtered = filtered.filter(emp => emp.FichasSemana.some((f: any) => f.Estado === 'SIN_HORARIO'));
        }
        if (showOnlyIncomplete) {
            filtered = filtered.filter(emp => {
                const workingDays = dateRange.filter(day => !isRestDay(emp.horario, day));
                const completedDays = workingDays.filter(day => {
                    const f = emp.FichasSemana.find((x: any) => x.Fecha.substring(0, 10) === format(day, 'yyyy-MM-dd'));
                    return f && f.EstatusManualAbrev;
                }).length;
                if (workingDays.length === 0) return false;
                return (completedDays / workingDays.length) * 100 < 100;
            });
        }
        return filtered;
    }, [employees, searchTerm, showOnlyNoSchedule, showOnlyIncomplete, dateRange]);

    // ... (Virtualización y Resize sin cambios) ...
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rowVirtualizer = useVirtualizer({
        count: filteredEmployees.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => ROW_HEIGHT_ESTIMATE,
        overscan: 15,
    });
    const virtualRows = rowVirtualizer.getVirtualItems();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
    const paddingBottom = virtualRows.length > 0 ? rowVirtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end : 0;

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
            localStorage.setItem(COLUMN_WIDTH_STORAGE_KEY, Math.max(MIN_COLUMN_WIDTH, Math.min(finalWidth, MAX_COLUMN_WIDTH)).toString());
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    // ... (Carga de Datos sin cambios) ...
    const fetchData = useCallback(async () => {
        if (!user || dateRange.length === 0) return;
        const token = getToken();
        if (!token) { setError("Sesión inválida."); setIsLoading(false); return; }

        setIsLoading(true);
        setError(null);
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
        const dataBody = JSON.stringify({
            startDate: format(dateRange[0], 'yyyy-MM-dd'),
            endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd'),
            filters: { departamentos: filters.depts, gruposNomina: filters.groups, puestos: filters.puestos, establecimientos: filters.estabs }
        });

        try {
            if (!can('reportesAsistencia.read')) throw new Error("No tienes permiso para ver este módulo.");
            const [employeesRes, statusesRes, schedulesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/attendance/data-by-range`, { method: 'POST', headers, body: dataBody }),
                fetch(`${API_BASE_URL}/catalogs/attendance-statuses`, { headers }),
                can('horarios.read') ? fetch(`${API_BASE_URL}/schedules`, { headers }) : Promise.resolve(null)
            ]);

            if (!employeesRes.ok) throw new Error((await employeesRes.json()).message || `Error ${employeesRes.status}`);
            if (!statusesRes.ok) throw new Error(`Error ${statusesRes.status}`);

            setEmployees(await employeesRes.json());
            setStatusCatalog(await statusesRes.json());
            if (schedulesRes && schedulesRes.ok) setScheduleCatalog(await schedulesRes.json());
        } catch (err: any) {
            setError(err.message);
            setEmployees([]);
        } finally { setIsLoading(false); }
    }, [dateRange, user, getToken, filters, can]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (event.target instanceof Element && !event.target.closest('.status-cell-wrapper')) {
                setOpenCellId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // --- MODIFICADO: Aceptar 'estatus' como string | null ---
    const handleBulkStatusChange = useCallback(async (updates: { empleadoId: number, fecha: Date, estatus: string | null, comentarios?: string }[]) => {
        const token = getToken();
        if (!token || updates.length === 0) return;
        const originalEmployees = employees;

        setEmployees(prevEmployees => {
            const updatesMap = new Map<number, { fecha: string; estatus: string | null; comentarios?: string }[]>();
            updates.forEach(u => {
                if (!updatesMap.has(u.empleadoId)) updatesMap.set(u.empleadoId, []);
                updatesMap.get(u.empleadoId)!.push({ fecha: format(u.fecha, 'yyyy-MM-dd'), estatus: u.estatus, comentarios: u.comentarios });
            });
            return prevEmployees.map(emp => {
                if (!updatesMap.has(emp.EmpleadoId)) return emp;
                const empUpdates = updatesMap.get(emp.EmpleadoId)!;
                const newFichasSemana = [...emp.FichasSemana];
                empUpdates.forEach(update => {
                    const idx = newFichasSemana.findIndex(f => f.Fecha.substring(0, 10) === update.fecha);
                    
                    // Si el estatus es NULL (Deshacer), volvemos a BORRADOR y limpiamos manual
                    if (update.estatus === null) {
                         if (idx > -1) {
                            newFichasSemana[idx] = { 
                                ...newFichasSemana[idx], 
                                EstatusManualAbrev: null,
                                Comentarios: null,
                                Estado: 'BORRADOR' // Reversión visual optimista
                            };
                         }
                    } else {
                        // Asignación normal
                        if (idx > -1) {
                            newFichasSemana[idx] = { 
                                ...newFichasSemana[idx], 
                                EstatusManualAbrev: update.estatus,
                                Comentarios: update.comentarios ?? newFichasSemana[idx].Comentarios,
                                Estado: 'VALIDADO'
                            };
                        } else {
                            newFichasSemana.push({
                                Fecha: new Date(update.fecha).toISOString(),
                                EstatusManualAbrev: update.estatus,
                                Comentarios: update.comentarios,
                                EstatusChecadorAbrev: null,
                                Estado: 'VALIDADO'
                            });
                        }
                    }
                });
                return { ...emp, FichasSemana: newFichasSemana };
            });
        });

        try {
            await Promise.all(updates.map(u => fetch(`${API_BASE_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                // Enviamos estatusManual como null si es deshacer
                body: JSON.stringify({ empleadoId: u.empleadoId, fecha: format(u.fecha, 'yyyy-MM-dd'), estatusManual: u.estatus, comentarios: u.comentarios })
            })));
        } catch (err) {
            addNotification('Error', 'Fallaron algunos cambios.', 'error');
            setEmployees(originalEmployees);
        }
    }, [employees, getToken, addNotification]);

    // --- MODIFICADO: Aceptar 'newStatus' como AttendanceStatusCode (string) | null ---
    const handleStatusChange = useCallback((empleadoId: number, fecha: Date, newStatus: AttendanceStatusCode | null, newComment?: string) => {
        handleBulkStatusChange([{ empleadoId, fecha, estatus: newStatus, comentarios: newComment }]);
        setOpenCellId(null);
    }, [handleBulkStatusChange]);

    const handleQuickApprove = (employee: any) => {
        setConfirmation({
            isOpen: true,
            title: 'Aprobar Semana',
            message: `¿Aceptar sugerencias para ${employee.NombreCompleto}?`,
            onConfirm: () => executeQuickApprove(employee),
        });
    };

    const executeQuickApprove = async (employee: any) => {
        const token = getToken();
        if (!token) return;
        
        setEmployees(prev => prev.map(emp => {
            if (emp.EmpleadoId === employee.EmpleadoId) {
                const newFichas = emp.FichasSemana.map((f: any) => {
                    const isSafe = f.Estado !== 'EN_PROCESO' && f.Estado !== 'BLOQUEADO' && f.Estado !== 'SIN_HORARIO';
                    if (f.EstatusChecadorAbrev && !f.EstatusManualAbrev && isSafe) {
                        return { ...f, EstatusManualAbrev: f.EstatusChecadorAbrev, Estado: 'VALIDADO' };
                    }
                    return f;
                });
                return { ...emp, FichasSemana: newFichas };
            }
            return emp;
        }));

        try {
            await fetch(`${API_BASE_URL}/attendance/approve-week`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ empleadoId: employee.EmpleadoId, weekStartDate: format(dateRange[0], 'yyyy-MM-dd') }),
            });
            addNotification('Semana Aprobada', `Sugerencias aceptadas para ${employee.NombreCompleto}`, 'success');
        } catch (e) {
            addNotification('Error', 'No se pudo aprobar la semana.', 'error');
            // Recargar datos originales si falla
             fetchData();
        }
    };

    // --- Drag & Drop ---
    const dragDataRef = useRef({ dragInfo, draggedCells, employees, statusCatalog, dateRange });
    useEffect(() => {
        dragDataRef.current = { dragInfo, draggedCells, employees, statusCatalog, dateRange };
    }, [dragInfo, draggedCells, employees, statusCatalog, dateRange]);

    const handleGlobalMouseUp = useCallback(() => {
        const { dragInfo, draggedCells, employees, statusCatalog, dateRange } = dragDataRef.current;
        window.removeEventListener('mouseup', handleGlobalMouseUp);

        if (!dragInfo) return;

        if (draggedCells.length > 0) {
            const draggedStatusConfig = statusCatalog.find(s => s.Abreviatura === dragInfo.status);
            const updates = draggedCells.map(cellId => {
                const [empIdStr, dayIdxStr] = cellId.split('-');
                const empleadoId = parseInt(empIdStr, 10);
                const dayIndex = parseInt(dayIdxStr, 10);
                const employee = employees.find(e => e.EmpleadoId === empleadoId);
                
                if (!employee || isRestDay(employee.horario, dateRange[dayIndex])) return null;
                const ficha = employee.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === format(dateRange[dayIndex], 'yyyy-MM-dd'));
                if (ficha?.Estado === 'BLOQUEADO' || ficha?.Estado === 'EN_PROCESO' || ficha?.Estado === 'SIN_HORARIO') return null; 
                if (draggedStatusConfig && !canAssignStatusToDate(draggedStatusConfig, dateRange[dayIndex])) return null;
                
                return { empleadoId, fecha: dateRange[dayIndex], estatus: dragInfo.status };
            }).filter(Boolean) as any[];

            if (updates.length > 0) {
                saveUpdatesRef.current(updates);
            }
        }
        setDragInfo(null);
        setDraggedCells([]);
    }, []);

    const saveUpdatesRef = useRef(handleBulkStatusChange);
    useEffect(() => { saveUpdatesRef.current = handleBulkStatusChange; }, [handleBulkStatusChange]);

    const handleDragStart = useCallback((EmpleadoId: number, dayIndex: number, status: AttendanceStatusCode) => {
        setOpenCellId(null);
        setDragInfo({ EmpleadoId, dayIndex, status });
        window.addEventListener('mouseup', handleGlobalMouseUp);
    }, [handleGlobalMouseUp]);

    useEffect(() => { return () => window.removeEventListener('mouseup', handleGlobalMouseUp); }, [handleGlobalMouseUp]);

    const handleDragEnter = useCallback((targetEmpleadoId: number, targetDayIndex: number) => {
        if (!dragInfo) return;
        const newDraggedCells: string[] = [];
        const empIds = filteredEmployees.map(e => e.EmpleadoId);
        const startEmpIdx = empIds.indexOf(dragInfo.EmpleadoId);
        const endEmpIdx = empIds.indexOf(targetEmpleadoId);
        for (let i = Math.min(startEmpIdx, endEmpIdx); i <= Math.max(startEmpIdx, endEmpIdx); i++) {
            for (let j = Math.min(dragInfo.dayIndex, targetDayIndex); j <= Math.max(dragInfo.dayIndex, targetDayIndex); j++) {
                newDraggedCells.push(`${empIds[i]}-${j}`);
            }
        }
        setDraggedCells(newDraggedCells);
    }, [dragInfo, filteredEmployees]);

    const filterConfigurations: FilterConfig[] = useMemo(() => [
        { id: 'departamentos', title: 'Departamentos', icon: <Building />, options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [], selectedValues: filters.depts, onChange: (v) => setFilters(f => ({ ...f, depts: v as number[] })), isActive: user?.activeFilters?.departamentos ?? false },
        { id: 'gruposNomina', title: 'Grupos Nómina', icon: <Briefcase />, options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [], selectedValues: filters.groups, onChange: (v) => setFilters(f => ({ ...f, groups: v as number[] })), isActive: user?.activeFilters?.gruposNomina ?? false },
        { id: 'puestos', title: 'Puestos', icon: <Tag />, options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [], selectedValues: filters.puestos, onChange: (v) => setFilters(f => ({ ...f, puestos: v as number[] })), isActive: user?.activeFilters?.puestos ?? false },
        { id: 'establecimientos', title: 'Establecimientos', icon: <MapPin />, options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [], selectedValues: filters.estabs, onChange: (v) => setFilters(f => ({ ...f, estabs: v as number[] })), isActive: user?.activeFilters?.establecimientos ?? false }
    ].filter(f => f.isActive && f.options.length > 0), [user, filters]);

    const renderContent = () => {
        if (isLoading) return <TableSkeleton employeeColumnWidth={employeeColumnWidth} dateRange={dateRange} viewMode={viewMode} pageType="attendance" />;
        if (error) return <div className="p-16 text-center text-red-600"><p>Error al cargar: {error}</p></div>;
        const canAssign = can('reportesAsistencia.assign');
        const canApprove = can('reportesAsistencia.approve');

        return (
            <div ref={tableContainerRef} className="overflow-auto relative flex-1 animate-content-fade-in">
                <table className="text-sm text-center border-collapse table-fixed">
                    <thead className="sticky top-0 z-20" style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}>
                        <tr className="bg-slate-50">
                            {/* --- COLUMNA EMPLEADO --- */}
                            <th className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm group relative" style={{ width: `${employeeColumnWidth}px` }}>
                                <div className="flex items-center gap-3 flex-1 min-w-0 pr-8 h-full">
                                    <span>Empleado</span>
                                    {/* Botones de filtro rápido */}
                                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100" style={{ opacity: (showOnlyNoSchedule || showOnlyIncomplete) ? 1 : undefined }}>
                                        <Tooltip text={showOnlyNoSchedule ? "Mostrando sin horario • Click para ver todos" : "Filtrar empleados sin horario asignado"}>
                                            <button onClick={() => setShowOnlyNoSchedule(!showOnlyNoSchedule)} className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${showOnlyNoSchedule ? 'text-amber-600 bg-amber-50 ring-1 ring-amber-200' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}>
                                                <CalendarOff size={16} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip text={showOnlyIncomplete ? "Mostrando incompletos • Click para ver todos" : "Filtrar asignaciones pendientes"}>
                                            <button onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)} className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${showOnlyIncomplete ? 'text-sky-600 bg-sky-50 ring-1 ring-sky-200' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}>
                                                <ListTodo size={16} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                    <div onMouseDown={handleResizeMouseDown} className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize group flex items-center justify-center"><GripVertical className="h-5 text-slate-300 group-hover:text-[--theme-500] transition-colors" /></div>
                                </div>
                            </th>
                            
                            {dateRange.map(day => (
                                <th key={day.toISOString()} className={`px-1 py-2 font-semibold text-slate-600 ${isTodayDateFns(day) ? 'bg-sky-100' : 'bg-slate-50'}`}>
                                    <span className="capitalize text-base">{format(day, 'eee', { locale: es })}</span>
                                    <span className="block text-xl font-bold text-slate-800">{format(day, 'dd')}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="animate-content-fade-in">
                        {paddingTop > 0 && <tr><td colSpan={dateRange.length + 1} style={{ padding: 0, border: 'none', height: `${paddingTop}px` }}></td></tr>}
                        {virtualRows.map((virtualRow) => {
                            const emp = filteredEmployees[virtualRow.index];
                            const defaultSchedule = scheduleCatalog.find(h => h.HorarioId === emp.horario);
                            const workingDays = dateRange.filter(day => !isRestDay(emp.horario, day));
                            const completedDays = workingDays.filter(day => {
                                const f = emp.FichasSemana.find((x: any) => x.Fecha.substring(0, 10) === format(day, 'yyyy-MM-dd'));
                                return f && f.EstatusManualAbrev;
                            }).length;
                            const progress = workingDays.length > 0 ? (completedDays / workingDays.length) * 100 : 0;

                            let birthdayTooltip = "Cumpleaños en este periodo";
                            if (emp.FechaNacimiento) {
                                try {
                                    const parts = emp.FechaNacimiento.substring(0, 10).split('-');
                                    const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                                    const formattedBirthDate = format(birthDate, "d 'de' MMMM", { locale: es });
                                    birthdayTooltip = `Cumpleaños: ${formattedBirthDate}`;
                                } catch (e) { /* fallback */ }
                            }

                            return (
                                <tr key={emp.EmpleadoId} className="group" style={{ height: `${virtualRow.size}px` }}>
                                    <td className="p-2 text-left sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm align-top border-b border-slate-100" style={{ width: `${employeeColumnWidth}px` }}>
                                        <div className="w-full" style={{ minWidth: `${EMPLOYEE_CONTENT_MIN_WIDTH}px`, maxWidth: `${EMPLOYEE_CONTENT_MAX_WIDTH}px` }}>
                                            <div className="flex items-start justify-between w-full">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Tooltip text={emp.NombreCompleto}>
                                                                <p className="font-semibold text-slate-800 truncate">{emp.NombreCompleto}</p>
                                                            </Tooltip>
                                                            {defaultSchedule && <Tooltip text={getHorarioTooltip(defaultSchedule)}><span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{defaultSchedule.Abreviatura || defaultSchedule.HorarioId}</span></Tooltip>}
                                                            {isBirthdayInPeriod(emp.FechaNacimiento, dateRange) && (
                                                                <Tooltip text={birthdayTooltip}>
                                                                    <Cake size={18} className="text-pink-400 shrink-0" />
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                                            <Tooltip text="Ver Ficha"><button onClick={() => setViewingEmployeeId(emp.EmpleadoId)} className="p-1 rounded-md text-slate-400 hover:text-[--theme-500] hover:bg-slate-200"><Contact size={18} /></button></Tooltip>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                        <Tooltip text={`ID: ${emp.CodRef}`}><p className="font-mono col-span-1 truncate">ID: {emp.CodRef}</p></Tooltip>
                                                        <Tooltip text={emp.puesto_descripcion || 'No asignado'}><p className="col-span-1 flex items-center gap-1.5 truncate"><Briefcase size={12} className="text-slate-400" /> {emp.puesto_descripcion || 'No asignado'}</p></Tooltip>
                                                        <Tooltip text={emp.departamento_nombre || 'No asignado'}><p className="col-span-1 flex items-center gap-1.5 truncate"><Building size={12} className="text-slate-400" /> {emp.departamento_nombre || 'No asignado'}</p></Tooltip>
                                                    </div>
                                                </div>
                                                {canApprove && <Tooltip text="Aprobar sugerencias"><button onClick={() => handleQuickApprove(emp)} className="p-1 rounded-md text-slate-400 hover:text-green-600 hover:bg-green-100 opacity-0 group-hover:opacity-100 ml-2"><ClipboardCheck size={20} /></button></Tooltip>}
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2"><div className={`h-1.5 rounded-full transition-all duration-200 ${progress === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${progress}%` }}></div></div>
                                        </div>
                                    </td>
                                    {dateRange.map((day, i) => {
                                        const cellId = `${emp.EmpleadoId}-${i}`;
                                        const ficha = emp.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === format(day, 'yyyy-MM-dd'));
                                        return (
                                            <AttendanceCell 
                                                key={cellId} cellId={cellId} isToday={isTodayDateFns(day)} isOpen={openCellId === cellId} 
                                                onToggleOpen={() => setOpenCellId(prev => prev === cellId ? null : cellId)} 
                                                ficha={ficha} viewMode={viewMode} isRestDay={isRestDay(emp.horario, day)} 
                                                onStatusChange={(s, c) => handleStatusChange(emp.EmpleadoId, day, s, c)} 
                                                canAssign={canAssign} 
                                                onDragStart={(s) => handleDragStart(emp.EmpleadoId, i, s)} 
                                                onDragEnter={() => handleDragEnter(emp.EmpleadoId, i)} 
                                                isBeingDragged={draggedCells.includes(cellId)} isAnyCellOpen={openCellId !== null} 
                                                statusCatalog={statusCatalog} fecha={day} 
                                            />
                                        );
                                    })}
                                </tr>
                            );
                        })}
                        {paddingBottom > 0 && <tr><td colSpan={dateRange.length + 1} style={{ height: `${paddingBottom}px` }}></td></tr>}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center gap-2"><h1 className="text-3xl font-bld text-slate-800">Registro de Asistencia</h1><Tooltip text="Gestión de asistencia"><InfoIcon /></Tooltip></header>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                <AttendanceToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterConfigurations={filterConfigurations} viewMode={viewMode} setViewMode={setViewMode} rangeLabel={rangeLabel} handleDatePrev={handleDatePrev} handleDateNext={handleDateNext} currentDate={currentDate} onDateChange={setCurrentDate} />
                {renderContent()}
            </div>
            <ConfirmationModal confirmation={confirmation} setConfirmation={setConfirmation} />
            {viewingEmployeeId && <EmployeeProfileModal employeeId={viewingEmployeeId as any} onClose={() => setViewingEmployeeId(null)} getToken={getToken} user={user} />}
        </div>
    );
};