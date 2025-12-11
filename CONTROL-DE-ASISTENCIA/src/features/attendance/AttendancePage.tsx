// src/features/attendance/AttendancePage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import {
    format, isToday as isTodayDateFns, getDay as getDayOfWeek, isSameDay, isWithinInterval,
    startOfWeek, endOfWeek, addDays, subMonths, subWeeks, addMonths, addWeeks, startOfMonth, endOfMonth,
    isAfter, startOfToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    Loader2, ClipboardCheck, Briefcase, Building, Cake, GripVertical,
    Contact, CalendarOff, ListTodo, Tag, MapPin, AlertTriangle, RotateCcw
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
import { useSharedAttendance } from '../../hooks/useSharedAttendance';

// --- Helpers ---
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

// Helper para parsear fecha segura desde string YYYY-MM-DD
const safeDate = (dateString: string) => {
    const parts = dateString.substring(0, 10).split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
};

const ConfirmationModal = ({ confirmation, setConfirmation }: any) => {
    if (!confirmation.isOpen) return null;
    const footer = (
        <>
            <Button variant="secondary" onClick={() => setConfirmation({ isOpen: false })}>Cancelar</Button>
            <Button onClick={() => { confirmation.onConfirm(); setConfirmation({ isOpen: false }); }}>
                {confirmation.confirmText || 'Confirmar'}
            </Button>
        </>
    );
    return (
        <Modal isOpen={confirmation.isOpen} onClose={() => setConfirmation({ isOpen: false })} title={confirmation.title} footer={footer} size="lg">
            <p className="text-slate-600 whitespace-pre-line">{confirmation.message}</p>
        </Modal>
    );
};

// --- Constantes ---
const COLUMN_WIDTH_STORAGE_KEY = 'attendance_employee_column_width';
const EMPLOYEE_CONTENT_MIN_WIDTH = 360;
const EMPLOYEE_CONTENT_MAX_WIDTH = 500;
const MIN_COLUMN_WIDTH = EMPLOYEE_CONTENT_MIN_WIDTH + 16;
const MAX_COLUMN_WIDTH = EMPLOYEE_CONTENT_MAX_WIDTH + 250;
const DEFAULT_COLUMN_WIDTH = 384;
const ROW_HEIGHT_ESTIMATE = 77;

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
            filtered = filtered.filter(emp =>
                emp.FichasSemana.some((f: any) => f.Estado === 'SIN_HORARIO')
            );
        }

        if (showOnlyIncomplete) {
            filtered = filtered.filter(emp => {
                // Usamos la misma lógica "robusta" que en el render para filtrar
                const today = startOfToday();

                // 1. Días validables: Pasados o Hoy + No Descanso + Con Horario
                const validatableDays = dateRange.filter(day => {
                    if (isAfter(day, today)) return false; // Ignorar futuros
                    if (isRestDay(emp.horario, day)) return false;

                    // Buscar si tiene ficha con problema de horario
                    const ficha = emp.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === format(day, 'yyyy-MM-dd'));
                    if (ficha?.Estado === 'SIN_HORARIO') return false;

                    return true;
                });

                if (validatableDays.length === 0) return false;

                // 2. Días completados
                const completedCount = validatableDays.filter(day => {
                    const ficha = emp.FichasSemana.find((f: any) => f.Fecha.substring(0, 10) === format(day, 'yyyy-MM-dd'));
                    return ficha && ficha.EstatusManualAbrev;
                }).length;

                return completedCount < validatableDays.length;
            });
        }

        return filtered;
    }, [employees, searchTerm, showOnlyNoSchedule, showOnlyIncomplete, dateRange]);

    const tableContainerRef = useRef<HTMLDivElement>(null);

    const getScrollElement = useCallback(() => tableContainerRef.current, []);
    const estimateSize = useCallback(() => ROW_HEIGHT_ESTIMATE, []);

    const rowVirtualizer = useVirtualizer({
        count: filteredEmployees.length,
        getScrollElement,
        estimateSize,
        overscan: 10,
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
            console.error("Error en fetchData:", err);
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

    const handleToggleOpen = useCallback((cellId: string) => {
        setOpenCellId(prev => (prev === cellId ? null : cellId));
    }, []);

    // --- LÓGICA DE ACTUALIZACIÓN (OPTIMISTA Y API) CORREGIDA ---
const handleBulkStatusChange = useCallback(async (updates: { empleadoId: number, fecha: Date, estatus: string | null, comentarios?: string }[]) => {
        const token = getToken();
        if (!token || updates.length === 0) return;
        const originalEmployees = employees;
        const today = startOfToday();

        // 1. ACTUALIZACIÓN OPTIMISTA (TU LÓGICA EXACTA)
        setEmployees(prevEmployees => {
            const updatesMap = new Map<number, { fecha: Date; estatus: string | null; comentarios?: string }[]>();
            updates.forEach(u => {
                if (!updatesMap.has(u.empleadoId)) updatesMap.set(u.empleadoId, []);
                updatesMap.get(u.empleadoId)!.push(u);
            });

            return prevEmployees.map(emp => {
                if (!updatesMap.has(emp.EmpleadoId)) return emp;
                const empUpdates = updatesMap.get(emp.EmpleadoId)!;
                const newFichasSemana = [...emp.FichasSemana];

                empUpdates.forEach(update => {
                    const fechaStr = format(update.fecha, 'yyyy-MM-dd');
                    const idx = newFichasSemana.findIndex(f => f.Fecha.substring(0, 10) === fechaStr);
                    const isFutureDate = isAfter(update.fecha, today);

                    if (update.estatus === null) {
                        // CASO DESHACER
                        if (isFutureDate) {
                            if (idx > -1) newFichasSemana.splice(idx, 1);
                        } else {
                            if (idx > -1) {
                                newFichasSemana[idx] = {
                                    ...newFichasSemana[idx],
                                    EstatusManualAbrev: null,
                                    Comentarios: null,
                                    Estado: 'BORRADOR',
                                    IncidenciaActivaId: null // Limpiamos incidencia optimista
                                };
                            }
                        }
                    } else {
                        // CASO ASIGNAR
                        if (idx > -1) {
                            newFichasSemana[idx] = {
                                ...newFichasSemana[idx],
                                EstatusManualAbrev: update.estatus,
                                Comentarios: update.comentarios ?? newFichasSemana[idx].Comentarios,
                                Estado: 'VALIDADO'
                            };
                        } else {
                            newFichasSemana.push({
                                Fecha: update.fecha.toISOString(),
                                EstatusManualAbrev: update.estatus,
                                Comentarios: update.comentarios,
                                EstatusChecadorAbrev: null,
                                Estado: 'VALIDADO',
                                HoraEntrada: null,
                                HoraSalida: null
                            });
                        }
                    }
                });
                return { ...emp, FichasSemana: newFichasSemana };
            });
        });

        try {
            // 2. PETICIONES AL SERVIDOR
            const responses = await Promise.all(updates.map(u => fetch(`${API_BASE_URL}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ empleadoId: u.empleadoId, fecha: format(u.fecha, 'yyyy-MM-dd'), estatusManual: u.estatus, comentarios: u.comentarios })
            })));

            // 3. SINCRONIZACIÓN REAL (Lectura de respuesta para Incidencias)
            const results = await Promise.all(responses.map(r => r.json()));

            let incidenciasCreadas = 0;
            let incidenciasResueltas = 0;

            results.forEach((res: any) => {
                if (res.data) {
                    const newItem = res.data;
                    
                    // --- CORRECCIÓN CRÍTICA ---
                    // Usamos una lógica que respete el valor NULL explícito
                    let newIncidenciaId = newItem.IncidenciaActivaId;
                    if (newIncidenciaId === undefined) {
                        newIncidenciaId = newItem.incidenciaActivaId;
                    }
                    // --------------------------

                    // Buscar el empleado original para comparar
                    // (Soportamos mayúsculas/minúsculas en el ID también por seguridad)
                    const empId = newItem.EmpleadoId || newItem.empleadoId;
                    const originalEmp = originalEmployees.find(e => e.EmpleadoId === empId);
                    
                    if (originalEmp) {
                        const dateToCheck = (newItem.Fecha || newItem.fecha).substring(0, 10);
                        const originalFicha = originalEmp.FichasSemana.find((f: any) => 
                            f.Fecha.substring(0, 10) === dateToCheck
                        );

                        if (originalFicha) {
                            // ¿Tenía incidencia antes? (Si tiene un ID numérico es true)
                            const hadIncidencia = !!originalFicha.IncidenciaActivaId;
                            
                            // ¿Tiene incidencia ahora? (Si es número es true, si es null es false)
                            const hasIncidenciaNow = typeof newIncidenciaId === 'number';

                            // CASO 1: SE CREÓ (Antes No -> Ahora Sí)
                            if (!hadIncidencia && hasIncidenciaNow) {
                                incidenciasCreadas++;
                            } 
                            // CASO 2: SE RESOLVIÓ (Antes Sí -> Ahora Null explícito)
                            else if (hadIncidencia && newIncidenciaId === null) {
                                incidenciasResueltas++;
                            }
                        }
                    }
                }
            });

            if (incidenciasCreadas > 0) addNotification('Atención', `Se detectaron ${incidenciasCreadas} nueva(s) incidencia(s).`, 'warning');
            
            // Ahora sí debería entrar aquí
            if (incidenciasResueltas > 0) addNotification('Resolución', `Se resolvieron ${incidenciasResueltas} incidencia(s) automáticamente.`, 'success');

            // --- ACTUALIZACIÓN DE ESTADO VISUAL ---
            setEmployees(currentEmployees => {
                const updatedEmployees = [...currentEmployees];

                results.forEach((res: any) => {
                    if (res.data) {
                        // Misma lógica de extracción segura
                        const newItem = res.data;
                        let finalIncidenciaId = newItem.IncidenciaActivaId;
                        if (finalIncidenciaId === undefined) finalIncidenciaId = newItem.incidenciaActivaId;

                        const empId = newItem.EmpleadoId || newItem.empleadoId;
                        const fechaStr = (newItem.Fecha || newItem.fecha).substring(0, 10);
                        
                        const empIndex = updatedEmployees.findIndex(e => e.EmpleadoId === empId);
                        if (empIndex > -1) {
                            const emp = { ...updatedEmployees[empIndex] };
                            const fichas = [...emp.FichasSemana];
                            const fichaIndex = fichas.findIndex(f => f.Fecha.substring(0, 10) === fechaStr);
                            
                            if (fichaIndex > -1) {
                                fichas[fichaIndex] = {
                                    ...fichas[fichaIndex],
                                    IncidenciaActivaId: finalIncidenciaId // Asignamos el valor corregido (null o numero)
                                };
                                emp.FichasSemana = fichas;
                                updatedEmployees[empIndex] = emp;
                            }
                        }
                    }
                });
                return updatedEmployees;
            });

        } catch (err) {
            addNotification('Error', 'Fallaron algunos cambios.', 'error');
            setEmployees(originalEmployees);
        }
    }, [employees, getToken, addNotification]);

    const handleStatusChange = useCallback((empleadoId: number, fecha: Date, newStatus: AttendanceStatusCode | null, newComment?: string) => {
        handleBulkStatusChange([{ empleadoId, fecha, estatus: newStatus, comentarios: newComment }]);
        setOpenCellId(null);
    }, [handleBulkStatusChange]);

    // --- BOTÓN DE ACCIÓN INTELIGENTE (Semana) ---
    const handleWeekAction = (employee: any, isComplete: boolean) => {
        if (isComplete) {
            // DESHACER SEMANA
            setConfirmation({
                isOpen: true,
                title: 'Restaurar Semana',
                message: `La semana de ${employee.NombreCompleto} está completa hasta hoy. ¿Deseas deshacer todas las validaciones y regresar las fichas a Borrador?`,
                confirmText: 'Sí, Restaurar',
                onConfirm: () => executeQuickRevert(employee),
            });
        } else {
            // APROBAR SUGERENCIAS
            setConfirmation({
                isOpen: true,
                title: 'Aprobar Semana',
                message: `¿Deseas aceptar las sugerencias automáticas para ${employee.NombreCompleto}? Esto asignará estatus a los días que aún no tienen validación manual.`,
                confirmText: 'Sí, Aprobar',
                onConfirm: () => executeQuickApprove(employee),
            });
        }
    };

    // const executeQuickApprove = async (employee: any) => {
    //     const token = getToken();
    //     if (!token) return;

    //     setEmployees(prev => prev.map(emp => {
    //         if (emp.EmpleadoId === employee.EmpleadoId) {
    //             const newFichas = emp.FichasSemana.map((f: any) => {
    //                 const isSafe = f.Estado !== 'EN_PROCESO' && f.Estado !== 'BLOQUEADO' && f.Estado !== 'SIN_HORARIO';
    //                 if (f.EstatusChecadorAbrev && !f.EstatusManualAbrev && isSafe) {
    //                     return { ...f, EstatusManualAbrev: f.EstatusChecadorAbrev, Estado: 'VALIDADO' };
    //                 }
    //                 return f;
    //             });
    //             return { ...emp, FichasSemana: newFichas };
    //         }
    //         return emp;
    //     }));

    //     try {
    //         await fetch(`${API_BASE_URL}/attendance/approve-week`, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    //             body: JSON.stringify({ empleadoId: employee.EmpleadoId, weekStartDate: format(dateRange[0], 'yyyy-MM-dd') }),
    //         });
    //         addNotification('Semana Aprobada', `Sugerencias aceptadas para ${employee.NombreCompleto}`, 'success');
    //     } catch (e) {
    //         addNotification('Error', 'No se pudo aprobar la semana.', 'error');
    //         fetchData();
    //     }
    // };
    const executeQuickApprove = async (employee: any) => {
        const today = startOfToday();

        // 1. Identificar candidatos para APROBAR en el periodo actual
        const updates = employee.FichasSemana
            .filter((f: any) => {
                const dateObj = safeDate(f.Fecha);

                // REGLAS DE APROBACIÓN:
                // A. No aprobar fechas futuras (no tienen checadas reales aún)
                if (isAfter(dateObj, today)) return false;

                // B. Solo aprobar si hay una sugerencia del sistema (Checador)
                if (!f.EstatusChecadorAbrev) return false;

                // C. Solo si está pendiente (no tiene estatus manual aún)
                if (f.EstatusManualAbrev) return false;

                // D. Solo si está en estado BORRADOR
                if (f.Estado !== 'BORRADOR') return false;
                // D. No tocar días bloqueados o sin horario
                // if (f.Estado === 'BLOQUEADO' || f.Estado === 'SIN_HORARIO') return false;

                // E. (Opcional) Ignorar descansos si así lo prefieres, 
                // pero usualmente se aprueban si el sistema los sugiere.
                // if (isRestDay(employee.horario, dateObj)) return false; 

                return true;
            })
            .map((f: any) => ({
                empleadoId: employee.EmpleadoId,
                fecha: safeDate(f.Fecha),
                estatus: f.EstatusChecadorAbrev, // <--- APLICAMOS LA SUGERENCIA
                comentarios: null
            }));

        if (updates.length === 0) {
            addNotification('Info', 'No hay sugerencias pendientes aplicables en este periodo.', 'info');
            return;
        }

        // 2. Ejecutar a través del manejador central (usa sp_SaveManual)
        await handleBulkStatusChange(updates);
        addNotification('Aprobado', `Se aplicaron ${updates.length} sugerencias para ${employee.NombreCompleto}`, 'success');
    };
    const executeQuickRevert = async (employee: any) => {
        // 1. Identificar candidatos para RESTAURAR (Deshacer)
        const updates = employee.FichasSemana
            .filter((f: any) => {
                // REGLAS DE RESTAURACIÓN:
                // A. Solo si tiene algo manual que borrar
                if (!f.EstatusManualAbrev) return false;

                // B. solo si está en estado VALIDADO
                if (f.Estado !== 'VALIDADO') return false;

                return true;
            })
            .map((f: any) => ({
                empleadoId: employee.EmpleadoId,
                fecha: safeDate(f.Fecha),
                estatus: null, 
                comentarios: null
            }));

        if (updates.length === 0) {
            addNotification('Info', 'No hay validaciones para restaurar en este periodo.', 'info');
            return;
        }

        // 2. Ejecutar a través del manejador central
        await handleBulkStatusChange(updates);
        addNotification('Restaurado', `Se eliminaron las validaciones de ${employee.NombreCompleto}`, 'success');
    };

    // const executeQuickRevert = async (employee: any) => {
    //     // Enviar NULL a todos los días que tengan estatus manual y no estén bloqueados
    //     const updates = employee.FichasSemana
    //         .filter((f: any) => f.EstatusManualAbrev && f.Estado !== 'BLOQUEADO')
    //         .map((f: any) => ({
    //             empleadoId: employee.EmpleadoId,
    //             fecha: safeDate(f.Fecha),
    //             estatus: null, 
    //             comentarios: null
    //         }));

    //     if (updates.length === 0) {
    //         addNotification('Info', 'No hay nada que restaurar.', 'info');
    //         return;
    //     }

    //     await handleBulkStatusChange(updates);
    //     addNotification('Semana Restaurada', `Se eliminaron las validaciones de ${employee.NombreCompleto}`, 'success');
    // };


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
        //const canApprove = can('reportesAsistencia.approve');

        return (
            <div ref={tableContainerRef} className="overflow-auto relative flex-1 animate-content-fade-in">
                <table className="text-sm text-center border-collapse table-fixed">
                    <thead className="sticky top-0 z-20" style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}>
                        <tr className="bg-slate-50">
                            <th className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm group relative" style={{ width: `${employeeColumnWidth}px` }}>
                                <div className="flex items-center gap-3 flex-1 min-w-0 pr-8 h-full">
                                    <span>Empleado</span>
                                    <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus-within:opacity-100" style={{ opacity: (showOnlyNoSchedule || showOnlyIncomplete) ? 1 : undefined }}>
                                        <Tooltip text={showOnlyNoSchedule ? "Mostrando sin horario • Click para ver todos" : "Filtrar empleados sin horario asignado"}>
                                            <button onClick={() => setShowOnlyNoSchedule(!showOnlyNoSchedule)} className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${showOnlyNoSchedule ? 'text-amber-600 bg-amber-50 ring-1 ring-amber-200' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}><CalendarOff size={16} /></button>
                                        </Tooltip>
                                        <Tooltip text={showOnlyIncomplete ? "Mostrando incompletos • Click para ver todos" : "Filtrar asignaciones pendientes"}>
                                            <button onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)} className={`p-1.5 rounded-md transition-colors flex-shrink-0 ${showOnlyIncomplete ? 'text-sky-600 bg-sky-50 ring-1 ring-sky-200' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'}`}><ListTodo size={16} /></button>
                                        </Tooltip>
                                    </div>
                                    <div onMouseDown={handleResizeMouseDown} className="absolute right-0 top-0 h-full w-2.5 cursor-col-resize group flex items-center justify-center"><GripVertical className="h-5 text-slate-300 group-hover:text-[--theme-500] transition-colors" /></div>
                                </div>
                            </th>
                            {dateRange.map((day, i) => (
                                <th key={day.toISOString()} className={`px-1 py-2 font-semibold text-slate-600 min-w-[6rem] ${isTodayDateFns(day) ? 'bg-sky-100' : 'bg-slate-50'}`}>
                                    <span className="capitalize text-base">{format(day, 'eee', { locale: es })}</span>
                                    <span className="block text-xl font-bold text-slate-800">{format(day, 'dd')}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="animate-content-fade-in">
                        {virtualRows.length === 0 && !isLoading ? (
                            <tr>
                                <td colSpan={dateRange.length + 1} className="text-center py-12 px-6">
                                    <div className="flex flex-col items-center">
                                        <ClipboardCheck size={48} className="text-slate-300" />
                                        <h3 className="mt-4 text-lg font-semibold text-slate-600">No se encontraron empleados</h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Intenta ajustar los filtros de búsqueda o seleccionar un rango de fechas diferente.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            <>
                                {paddingTop > 0 && <tr><td colSpan={dateRange.length + 1} style={{ padding: 0, border: 'none', height: `${paddingTop}px` }}></td></tr>}
                                {virtualRows.map((virtualRow) => {
                                    const emp = filteredEmployees[virtualRow.index];
                                    const defaultSchedule = scheduleCatalog.find(h => h.HorarioId === emp.horario);

                                    // --- CÁLCULO DE PROGRESO (LÓGICA ACTUALIZADA) ---
                                    const generatedFichas = emp.FichasSemana || [];

                                    // --- Lógica para la Barra de Progreso (según solicitud) ---
                                    // 1. Base del cálculo: Total de días en el período activo.
                                    const totalDaysInPeriod = dateRange.length;

                                    // 2. Progreso: Fichas en estado VALIDADO o BLOQUEADO en el período.
                                    const completedForProgress = generatedFichas.filter(f => {
                                        const fichaDateStr = f.Fecha.substring(0, 10);
                                        const isInPeriod = dateRange.some(d => format(d, 'yyyy-MM-dd') === fichaDateStr);
                                        return isInPeriod && (f.Estado === 'VALIDADO' || f.Estado === 'BLOQUEADO');
                                    }).length;

                                    const progress = totalDaysInPeriod > 0 ? (completedForProgress / totalDaysInPeriod) * 100 : 0;

                                    // --- Lógica para el Botón (con estado deshabilitado) ---
                                    const generatedFichasInPeriod = generatedFichas.filter(f => {
                                        const fichaDateStr = f.Fecha.substring(0, 10);
                                        return dateRange.some(d => format(d, 'yyyy-MM-dd') === fichaDateStr);
                                    });

                                    // 1. Contar fichas "Borrador" (condición: Estado='BORRADOR' y HorarioId en la propia ficha).
                                    const draftCount = generatedFichasInPeriod.filter(f => f.Estado === 'BORRADOR' && f.HorarioId).length;

                                    // 2. Contar fichas "Procesadas" (Validadas o Bloqueadas).
                                    const processedCount = generatedFichasInPeriod.filter(f => f.Estado === 'VALIDADO' || f.Estado === 'BLOQUEADO').length;

                                    const hasDrafts = draftCount > 0;
                                    const hasProcessed = processedCount > 0;

                                    // 3. Determinar el estado y apariencia del botón.
                                    // Icono de "Restaurar" se muestra si no hay borradores pero sí hay algo procesado.
                                    const showRevertIcon = !hasDrafts && hasProcessed;
                                    // Se deshabilita si no hay nada que aprobar y nada que restaurar.
                                    const isDisabled = !hasDrafts && !hasProcessed;

                                    // --- LOGS DE DEPURACIÓN (Solo el primer empleado visible para no saturar) ---
                                    if (virtualRow.index === 0) {
                                        console.groupCollapsed(`🔍 DEBUG: ${emp.NombreCompleto}`);
                                        // console.log('📅 Hoy (Sistema):', format(today, 'yyyy-MM-dd'));
                                        console.log('RANGE:', dateRange.map(d => format(d, 'yyyy-MM-dd')));
                                        // console.log('✅ Días que el sistema espera validar (Validatable):', validatableDays.map(d => format(d, 'yyyy-MM-dd')));
                                        // console.log('📊 Conteo:', { Esperados: totalValidatable, Listos: completedCount });
                                        console.log('📈 Progreso:', progress, '%');
                                        //console.log('🔘 Estado Botón:', isComplete ? 'RESTAURAR (Naranja)' : 'APROBAR (Verde)');
                                        console.log('🗂️ Fichas Brutas:', generatedFichas);
                                        console.groupEnd();
                                    }
                                    let birthdayTooltip = "Cumpleaños en este periodo";
                                    if (emp.FechaNacimiento) { try { const parts = emp.FechaNacimiento.substring(0, 10).split('-'); const birthDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])); const formattedBirthDate = format(birthDate, "d 'de' MMMM", { locale: es }); birthdayTooltip = `Cumpleaños: ${formattedBirthDate}`; } catch (e) { } }

                                    return (
                                        <tr key={emp.EmpleadoId} ref={virtualRow.measureElement} className="group" style={{ height: `${virtualRow.size}px` }}>
                                            <td className="p-2 text-left sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm align-top border-b border-slate-100" style={{ width: `${employeeColumnWidth}px` }}>
                                                <div className="w-full" style={{ minWidth: `${EMPLOYEE_CONTENT_MIN_WIDTH}px`, maxWidth: `${EMPLOYEE_CONTENT_MAX_WIDTH}px` }}>
                                                    <div className="flex items-start justify-between w-full">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Tooltip text={emp.NombreCompleto}><p className="font-semibold text-slate-800 truncate ">{emp.NombreCompleto}</p></Tooltip>
                                                                    {defaultSchedule && <Tooltip text={getHorarioTooltip(defaultSchedule)}><span className="text-xs font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{defaultSchedule.Abreviatura || defaultSchedule.HorarioId}</span></Tooltip>}
                                                                    {isBirthdayInPeriod(emp.FechaNacimiento, dateRange) && <Tooltip text={birthdayTooltip}><Cake size={18} className="text-pink-400 shrink-0" /></Tooltip>}
                                                                </div>
                                                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                                                    <Tooltip text="Ver Ficha"><button onClick={() => setViewingEmployeeId(emp.EmpleadoId)} className="p-1 rounded-md text-slate-400 hover:text-[--theme-500] hover:bg-slate-200"><Contact size={18} /></button></Tooltip>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                                <Tooltip text={`ID: ${emp.CodRef}`}><p className="font-mono col-span-1 truncate ">ID: {emp.CodRef}</p></Tooltip>
                                                                <Tooltip text={emp.puesto_descripcion || 'No asignado'}><p className="col-span-1 flex items-center gap-1.5 truncate "><Briefcase size={12} className="text-slate-400" /> {emp.puesto_descripcion || 'No asignado'}</p></Tooltip>
                                                                <Tooltip text={emp.departamento_nombre || 'No asignado'}><p className="col-span-1 flex items-center gap-1.5 truncate "><Building size={12} className="text-slate-400" /> {emp.departamento_nombre || 'No asignado'}</p></Tooltip>
                                                            </div>
                                                        </div>
                                                       
                                                            <Tooltip text={isDisabled ? "Nada que aprobar o restaurar" : (showRevertIcon ? "Restaurar semana (Desaprobar todo)" : "Aprobar sugerencias")}>
                                                                <button
                                                                    onClick={() => handleWeekAction(emp, showRevertIcon)}
                                                                    disabled={isDisabled}
                                                                    className={`
                                                                        p-1 rounded-md opacity-0 group-hover:opacity-100 ml-2 transition-all
                                                                        ${isDisabled
                                                                            ? 'text-slate-300 '
                                                                            : (showRevertIcon
                                                                                ? 'text-orange-500 hover:bg-orange-50 hover:text-orange-700'
                                                                                : 'text-slate-400 hover:text-green-600 hover:bg-green-100'
                                                                            )
                                                                        }
                                                                    `}
                                                                >
                                                                    {showRevertIcon ? <RotateCcw size={20} /> : <ClipboardCheck size={20} />}
                                                                </button>
                                                            </Tooltip>
                                                        
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
                                                        onToggleOpen={() => handleToggleOpen(cellId)}
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
                                {paddingBottom > 0 && <tr><td colSpan={dateRange.length + 1} style={{ padding: 0, border: 'none', height: `${paddingBottom}px` }}></td></tr>}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center gap-2"><h1 className="text-3xl font-bold text-slate-800">Registro de Asistencia </h1><Tooltip text="Gestión de asistencia"><InfoIcon /></Tooltip></header>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
                <AttendanceToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterConfigurations={filterConfigurations} viewMode={viewMode} setViewMode={setViewMode} rangeLabel={rangeLabel} handleDatePrev={handleDatePrev} handleDateNext={handleDateNext} currentDate={currentDate} onDateChange={setCurrentDate} />
                {renderContent()}
            </div>
            <ConfirmationModal confirmation={confirmation} setConfirmation={setConfirmation} />
            {viewingEmployeeId && <EmployeeProfileModal employeeId={viewingEmployeeId as any} onClose={() => setViewingEmployeeId(null)} getToken={getToken} user={user} />}
        </div>
    );
};