// src/features/attendance/SchedulePage.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { API_BASE_URL } from '../../config/api';
import { format, startOfWeek, endOfWeek, addDays, subDays, getDay, addMonths, subMonths, addWeeks, subWeeks, startOfMonth, endOfMonth, isToday as isTodayDateFns, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Briefcase, Building, Cake, GripVertical, Contact, InfoIcon as Info } from 'lucide-react';
import { AttendanceToolbar } from './AttendanceToolbar';
import { ScheduleCell } from './ScheduleCell';
import { EmployeeProfileModal } from './EmployeeProfileModal';
import { Tooltip, InfoIcon } from '../../components/ui/Tooltip';


const COLUMN_WIDTH_STORAGE_KEY = 'schedule_employee_column_width';
const MIN_COLUMN_WIDTH = 240;
const MAX_COLUMN_WIDTH = 10000;
const EMPLOYEE_CONTENT_MIN_WIDTH = 220;
const EMPLOYEE_CONTENT_MAX_WIDTH = 500;
const DEFAULT_COLUMN_WIDTH = 384;

export const SchedulePage = () => {
    const { getToken, user, can } = useAuth();
    const { addNotification } = useNotification();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [employees, setEmployees] = useState<any[]>([]);
    const [scheduleCatalog, setScheduleCatalog] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [dragInfo, setDragInfo] = useState<{ employeeId: number; dayIndex: number; scheduleId: string | null } | null>(null);
    const [draggedCells, setDraggedCells] = useState<string[]>([]);
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

    const { dateRange, rangeLabel } = useMemo(() => {
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
        const headers = { 'Authorization': `Bearer ${token}` };
        const startDate = format(dateRange[0], 'yyyy-MM-dd');
        const endDate = format(dateRange[dateRange.length - 1], 'yyyy-MM-dd');

        try {
            const [assignmentsRes, schedulesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/schedules/assignments?startDate=${startDate}&endDate=${endDate}`, { headers }),
                fetch(`${API_BASE_URL}/api/schedules`, { headers })
            ]);

            if (!assignmentsRes.ok) throw new Error(`Error ${assignmentsRes.status} al cargar asignaciones.`);
            if (!schedulesRes.ok) throw new Error(`Error ${schedulesRes.status} al cargar catálogo de horarios.`);
            
            const assignmentsData = await assignmentsRes.json();
            
            // --- INICIO DE DEPURACIÓN ---
            console.groupCollapsed("===== DEPURANDO DATOS DE SCHEDULE PAGE =====");
            console.log("Datos de Horarios recibidos:", JSON.stringify(assignmentsData, null, 2));
            if (assignmentsData.length > 0) {
                console.log("Ejemplo del primer empleado:", assignmentsData[0]);
                console.log("Propiedades disponibles:", Object.keys(assignmentsData[0]));
            }
            console.groupEnd();
            // --- FIN DE DEPURACIÓN ---

            setScheduleCatalog(await schedulesRes.json());
            setEmployees(assignmentsData);

        } catch (err: any) { setError(err.message); } 
        finally { setIsLoading(false); }
    }, [dateRange, user, getToken, canRead]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleBulkScheduleChange = async (updates: { empleadoId: number, fecha: Date, horarioId: string | null }[]) => {
        if (!canAssign) {
            addNotification('Acceso Denegado', 'No tienes permiso para asignar horarios.', 'error');
            return;
        }
        const token = getToken();
        if (!token || updates.length === 0) return;

        const originalEmployees = JSON.parse(JSON.stringify(employees));
        
        setEmployees(prev => {
            const newEmployees = JSON.parse(JSON.stringify(prev));
            updates.forEach(({ empleadoId, fecha, horarioId }) => {
                const empIndex = newEmployees.findIndex((e: any) => e.EmpleadoId === empleadoId);
                if (empIndex > -1) {
                    const scheduleIndex = newEmployees[empIndex].HorariosAsignados.findIndex((h: any) => format(new Date(h.Fecha), 'yyyy-MM-dd') === format(fecha, 'yyyy-MM-dd'));
                    if (scheduleIndex > -1) {
                        const employee = newEmployees[empIndex];
                        const newHorario = horarioId === null ? employee.horario_defecto : horarioId;
                        newEmployees[empIndex].HorariosAsignados[scheduleIndex].HorarioAplicable = newHorario;
                        newEmployees[empIndex].HorariosAsignados[scheduleIndex].EsTemporal = horarioId !== null;
                    }
                }
            });
            return newEmployees;
        });

        try {
            const res = await fetch(`${API_BASE_URL}/api/schedules/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(updates),
            });
            if (!res.ok) throw new Error('El servidor rechazó la actualización.');
            addNotification('Guardado', `${updates.length} asignacion(es) guardada(s).`, 'success');
        } catch (err: any) {
            addNotification('Error al Guardar', 'No se pudieron guardar los cambios. Reestableciendo.', 'error');
            setEmployees(originalEmployees);
        }
    };

    const handleToggleOpen = (cellId: string | null) => {
        setOpenCellId(prev => (prev === cellId ? null : cellId));
    };

    const handleDragStart = (employeeId: number, dayIndex: number, scheduleId: string | null) => {
        if (!canAssign) return;
        setOpenCellId(null);
        setDragInfo({ employeeId, dayIndex, scheduleId });
    };

    const handleDragEnter = (targetEmpleadoId: number, targetDayIndex: number) => {
        if (!dragInfo) return;
        const newDraggedCells: string[] = [];
        const empIds = filteredEmployees.map(e => e.EmpleadoId);
        const startEmpIndex = empIds.indexOf(dragInfo.employeeId);
        const endEmpIndex = empIds.indexOf(targetEmpleadoId);
        if (startEmpIndex === -1 || endEmpIndex === -1) return;

        const startDayIndex = dragInfo.dayIndex;
        const endDayIndex = targetDayIndex;

        for (let i = Math.min(startEmpIndex, endEmpIndex); i <= Math.max(startEmpIndex, endEmpIndex); i++) {
            for (let j = Math.min(startDayIndex, endDayIndex); j <= Math.max(startDayIndex, endDayIndex); j++) {
                newDraggedCells.push(`${empIds[i]}-${j}`);
            }
        }
        setDraggedCells(newDraggedCells);
    };
    
    const handleDragEnd = () => {
        if (!dragInfo || draggedCells.length === 0) { setDragInfo(null); setDraggedCells([]); return; }
        
        const updates = draggedCells
            .map(cellId => {
                const [empleadoIdStr, dayIndexStr] = cellId.split('-');
                const empleadoId = parseInt(empleadoIdStr, 10);
                const dayIndex = parseInt(dayIndexStr, 10);
                return { empleadoId, fecha: dateRange[dayIndex], horarioId: dragInfo.scheduleId };
            })
            .filter(Boolean);

        if(updates.length > 0){
            handleBulkScheduleChange(updates);
        }
        setDragInfo(null);
        setDraggedCells([]);
    };
    
    const filteredEmployees = useMemo(() => {
        const searchWords = searchTerm.toLowerCase().split(' ').filter(word => word);
        return employees.filter(emp => {
            const departmentMatch = selectedDepartment === 'all' || String(emp.departamento_id) === selectedDepartment;
            const payrollGroupMatch = selectedPayrollGroup === 'all' || String(emp.grupo_nomina_id) === selectedPayrollGroup;
            if (!departmentMatch || !payrollGroupMatch) return false;
            if (searchWords.length === 0) return true;
            const targetText = (emp.NombreCompleto + ' ' + emp.CodRef).toLowerCase();
            return searchWords.every(word => targetText.includes(word));
        });
    }, [employees, searchTerm, selectedDepartment, selectedPayrollGroup]);

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

    const isBirthdayInPeriod = (birthDateStr: string, period: Date[]): boolean => {
        if (!birthDateStr || period.length === 0) return false;
        const birthDate = new Date(birthDateStr);
        const today = new Date();
        const birthDateThisYear = new Date(Date.UTC(today.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate()));
    
        return isWithinInterval(birthDateThisYear, {
            start: period[0],
            end: period[period.length - 1]
        });
    };

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center p-16 text-slate-500 flex items-center justify-center gap-2"> <Loader2 className="animate-spin" /> Cargando... </div>;
        }
        if (error) {
            return <div className="p-16 text-center"> <p className="font-semibold text-red-600">Error al Cargar</p> <p className="text-slate-500 text-sm mt-1">{error}</p> </div>;
        }
        return (
            <div className="overflow-auto relative flex-1" onMouseUp={handleDragEnd}>
                <table className="text-sm text-center border-collapse table-fixed">
                    <thead className="sticky top-0 z-20">
                        <tr className="bg-slate-50">
                            <th className="p-2 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-30 shadow-sm" style={{ width: `${employeeColumnWidth}px` }}>
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
                    <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((emp) => (
                            <tr key={emp.EmpleadoId} className="group">
                                <td className="p-2 text-left sticky left-0 bg-white group-hover:bg-slate-50 z-10 shadow-sm align-top">
                                    <div className="w-full" style={{ minWidth: `${EMPLOYEE_CONTENT_MIN_WIDTH}px`, maxWidth: `${EMPLOYEE_CONTENT_MAX_WIDTH}px` }}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <p className="font-semibold text-slate-800 truncate" title={emp.NombreCompleto}>{emp.NombreCompleto}</p>
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
                                                     <Tooltip text={`ID: ${emp.CodRef}`}>
                                                        <p className="font-mono col-span-1 truncate">ID: {emp.CodRef}</p>
                                                     </Tooltip>
                                                     <Tooltip text={emp.puesto_descripcion || 'No asignado'}>
                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                            <Briefcase size={12} className="text-slate-400 shrink-0"/> 
                                                            <span className="truncate">{emp.puesto_descripcion || 'No asignado'}</span>
                                                        </p>
                                                     </Tooltip>
                                                     <Tooltip text={emp.departamento_nombre || 'No asignado'}>
                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                            <Building size={12} className="text-slate-400 shrink-0"/> 
                                                            <span className="truncate">{emp.departamento_nombre || 'No asignado'}</span>
                                                        </p>
                                                     </Tooltip>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                {dateRange.map((day, dayIndex) => {
                                    const cellId = `${emp.EmpleadoId}-${dayIndex}`;
                                    const scheduleData = emp.HorariosAsignados.find((h: any) => format(new Date(h.Fecha), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'));
                                    return (
                                        <ScheduleCell
                                            key={cellId}
                                            cellId={cellId}
                                            isOpen={openCellId === cellId}
                                            onToggleOpen={handleToggleOpen}
                                            scheduleData={scheduleData}
                                            onScheduleChange={(newScheduleId: string | null) => handleBulkScheduleChange([{
                                                empleadoId: emp.EmpleadoId,
                                                fecha: day,
                                                horarioId: newScheduleId
                                            }])}
                                            scheduleCatalog={scheduleCatalog}
                                            isToday={isTodayDateFns(day)}
                                            canAssign={canAssign}
                                            onDragStart={(scheduleId: string | null) => handleDragStart(emp.EmpleadoId, dayIndex, scheduleId)}
                                            onDragEnter={() => handleDragEnter(emp.EmpleadoId, dayIndex)}
                                            isBeingDragged={draggedCells.includes(cellId)}
                                            viewMode={viewMode}
                                        />
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <header className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-slate-800">Programador de Horarios</h1>
                <Tooltip text="Asigna horarios temporales a los empleados para días específicos. Ideal para roles rotativos.">
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
                {renderContent()}
            </div>
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

