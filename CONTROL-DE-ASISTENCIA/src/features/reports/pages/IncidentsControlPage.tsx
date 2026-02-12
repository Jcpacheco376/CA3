// src/features/reports/pages/IncidentsControlPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    RefreshCw, AlertTriangle, BadgeAlert, User, Shield, Hash, Info, 
    Building, Briefcase, Tag, MapPin, Contact, GripVertical, ArrowUpDown, ArrowUp, ArrowDown,
    Filter, CheckCircle, XCircle, Clock, UserCheck, ChevronDown, Check
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { useNotification } from '../../../context/NotificationContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import { AttendanceToolbar } from '../../attendance/AttendanceToolbar';
import { AttendanceToolbarProvider, useAttendanceToolbarContext, FilterConfig } from '../../attendance/AttendanceToolbarContext';
import { Tooltip } from '../../../components/ui/Tooltip';
import { EmployeeProfileModal } from '../../attendance/EmployeeProfileModal';

// --- Componente interno para badges (Sin cambios) ---
const SeverityBadge = ({ severity }: { severity: string }) => {
    const config = {
        'Critica': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', icon: <BadgeAlert size={12}/> },
        'Advertencia': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <AlertTriangle size={12}/> },
        'Info': { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: <Info size={12}/> },
    };
    const style = config[severity as keyof typeof config] || config['Info'];
    
    return (
        <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
            {style.icon} {severity}
        </span>
    );
};

export const IncidentsControlPage = () => {
    return (
        <AttendanceToolbarProvider>
            <IncidentsControlPageContent />
        </AttendanceToolbarProvider>
    );
};

const IncidentsControlPageContent = () => {
    const { getToken, user } = useAuth();
    const { addNotification } = useNotification();
    
    const { 
        filters, dateRange
    } = useAttendanceToolbarContext();

    // Estados de datos
    const [incidents, setIncidents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Estados de UI
    const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

    // --- FILTROS LOCALES (TRIAJE) ---
    const [statusFilter, setStatusFilter] = useState<string[]>([]); 
    const [severityFilter, setSeverityFilter] = useState<string[]>([]); 
    const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);

    // Configuración de Tabla
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'Fecha', direction: 'desc'
    });
    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try { const saved = localStorage.getItem('incidents_col_width'); return saved ? Math.max(250, Math.min(parseInt(saved), 600)) : 350; } catch { return 350; }
    });

    // --- GENERAR LISTA DE GESTORES (DINÁMICO) ---
    // Extraemos usuarios únicos de la lista actual de incidencias para el filtro
const activeAssignees = useMemo(() => {
        const unique = new Map();
        
        incidents.forEach(inc => {
            // Intento robusto de encontrar el ID y el Nombre
            // A veces SQL Server devuelve PascalCase y otras drivers lo pasan a camelCase
            const id = inc.AsignadoAUsuarioId || inc.asignadoAUsuarioId || inc.UsuarioAsignadoId; 
            const name = inc.AsignadoA || inc.asignadoA || inc.AsignadoANombre;

            // Solo agregamos si tenemos ambos datos
            if (id && name) {
                // Convertimos a String para asegurar consistencia en los filtros
                unique.set(String(id), name);
            }
        });

        return Array.from(unique.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [incidents]);

    // --- CONFIGURACIÓN FILTROS PERSONALIZADOS (Se unen a los del Toolbar) ---
    const customFilters: FilterConfig[] = useMemo(() => {
        const configs: FilterConfig[] = [
            {
                id: 'status',
                title: 'Estado',
                icon: <Clock size={16} />,
                options: [
                    { value: 'Pendientes', label: 'Pendientes' },
                    { value: 'Nueva', label: 'Nueva' },
                    { value: 'Asignada', label: 'Asignada' },
                    { value: 'PorAutorizar', label: 'Por Autorizar' },
                    { value: 'Resuelta', label: 'Resueltas' },
                    { value: 'Cancelada', label: 'Canceladas' }
                ],
                selectedValues: statusFilter,
                onChange: (vals) => setStatusFilter(vals as string[]),
                isActive: true,
                selectionMode: 'multiple'
            },
            {
                id: 'severity',
                title: 'Severidad',
                icon: <AlertTriangle size={16} />,
                options: [
                    { value: 'Critica', label: 'Crítica' },
                    { value: 'Advertencia', label: 'Advertencia' },
                    { value: 'Info', label: 'Informativa' }
                ],
                selectedValues: severityFilter,
                onChange: (vals) => setSeverityFilter(vals as string[]),
                isActive: true,
                selectionMode: 'multiple'
            },
            {
                id: 'assignee',
                title: 'Asignado',
                icon: <UserCheck size={16} />,
                options: [
                    { value: 'SinAsignar', label: 'Sin Asignar' },
                    ...activeAssignees.map(u => ({ value: u.id, label: u.name }))
                ],
                selectedValues: assigneeFilter,
                onChange: (vals) => setAssigneeFilter(vals as string[]),
                isActive: true,
                selectionMode: 'multiple'
            }
        ];
        return configs;
    }, [statusFilter, severityFilter, assigneeFilter, activeAssignees]);

    // --- CARGA DE DATOS ---
    const loadIncidents = useCallback(async () => {
        if (!dateRange || dateRange.length === 0) return;
        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        try {
            const queryParams = new URLSearchParams({
                startDate: format(dateRange[0], 'yyyy-MM-dd'),
                endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd')
            }).toString();

            const response = await fetch(`${API_BASE_URL}/incidents?${queryParams}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Error al cargar incidencias.');
            setIncidents(await response.json());
            
        } catch (err: any) {
            addNotification('Error', err.message, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [dateRange, getToken, addNotification]);

    useEffect(() => { loadIncidents(); }, [loadIncidents]);

    // --- FILTRADO Y ORDENAMIENTO (LÓGICA PRINCIPAL) ---
    const processedIncidents = useMemo(() => {
        let data = incidents.filter(inc => {
            // 1. Filtro Texto Global
            if (filters.search) {
                const term = filters.search.toLowerCase();
                const textMatch = inc.EmpleadoNombre?.toLowerCase().includes(term) || inc.EmpleadoCodRef?.toLowerCase().includes(term) || inc.IncidenciaId?.toString().includes(term);
                if (!textMatch) return false;
            }
            
            // 2. Filtro Local: ESTADO
            if (statusFilter.length > 0) {
                const showPendientes = statusFilter.includes('Pendientes');
                const otherSelected = statusFilter.filter(s => s !== 'Pendientes');
                
                const isPendiente = !['Resuelta', 'Cancelada'].includes(inc.Estado);
                const isOtherMatch = otherSelected.includes(inc.Estado);
                
                if (!((showPendientes && isPendiente) || isOtherMatch)) return false;
            }

            // 3. Filtro Local: SEVERIDAD
            if (severityFilter.length > 0) {
                if (!severityFilter.includes(inc.Severidad)) return false;
            }

            // 4. Filtro Local: ASIGNADO A (NUEVO)
            if (assigneeFilter.length > 0) {
                // Obtenemos el ID de la fila actual de forma segura
                const incId = inc.AsignadoAUsuarioId || inc.asignadoAUsuarioId;
                const showUnassigned = assigneeFilter.includes('SinAsignar');
                const specificUsers = assigneeFilter.filter(id => id !== 'SinAsignar');

                const isUnassignedMatch = showUnassigned && !incId;
                // Aseguramos comparación de strings para evitar errores de tipo (number vs string)
                const isUserMatch = incId && specificUsers.includes(String(incId));

                if (!isUnassignedMatch && !isUserMatch) return false;
            }
            
            return true;
        });

        // 5. Ordenamiento
        return data.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            if (sortConfig.key === 'EmpleadoNombre') { aValue = a.EmpleadoNombre || ''; bValue = b.EmpleadoNombre || ''; }
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [incidents, filters.search, sortConfig, statusFilter, severityFilter, assigneeFilter]); // Agregamos assigneeFilter a dependencias

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // ... (Manejo de resize handleResizeMouseDown se mantiene igual) ...
    const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        document.body.classList.add('select-none', 'cursor-col-resize');
        const startX = e.clientX;
        const startWidth = employeeColumnWidth;
        const handleMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = startWidth + (moveEvent.clientX - startX);
            setEmployeeColumnWidth(Math.max(250, Math.min(newWidth, 600)));
        };
        const handleMouseUp = (upEvent: MouseEvent) => {
            document.body.classList.remove('select-none', 'cursor-col-resize');
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            const finalWidth = startWidth + (upEvent.clientX - startX);
            localStorage.setItem('incidents_col_width', Math.max(250, Math.min(finalWidth, 600)).toString());
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp, { once: true });
    };

    const getSortIcon = (key: string) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-[--theme-600]" /> : <ArrowDown size={14} className="text-[--theme-600]" />;
    };

    const handleOpenModal = (incidentId: number) => { setSelectedIncidentId(incidentId); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedIncidentId(null); };
    const formatDateSafe = (dateString: string) => {
        if (!dateString) return '-';
        try { const cleanDate = dateString.substring(0, 10); const date = new Date(cleanDate + 'T12:00:00'); if (isNaN(date.getTime())) return '-'; return format(date, 'dd MMM', { locale: es }); } catch (e) { return '-'; }
    };

    return (
        <div className="space-y-3 animate-fade-in h-full flex flex-col">
            
            {/* CABECERA */}
            <div className="flex justify-between items-center px-1">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        Tablero de Incidencias
                        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full font-medium border border-slate-200">
                            {incidents.length}
                        </span>
                    </h2>
                    <p className="text-slate-500 text-sm">Gestiona discrepancias y excepciones de nómina.</p>
                </div>
            </div>

            {/* FILTROS PRINCIPALES (ATTENDANCE TOOLBAR) */}
            <div className="bg-white rounded-t-lg shadow-sm border border-slate-200 border-b-0 z-40 relative">
                <AttendanceToolbar customFilters={customFilters} />
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col relative">
                <div className="overflow-auto h-full custom-scrollbar">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b tracking-wider sticky top-0 z-10 shadow-sm">
                            <tr>
                                {/* ID, Fecha, Empleado, Severidad, Estado - Igual que antes */}
                                <th className="p-4 w-24 text-center cursor-pointer hover:bg-slate-100" onClick={() => handleSort('IncidenciaId')}><div className="flex items-center justify-center gap-2">ID {getSortIcon('IncidenciaId')}</div></th>
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('Fecha')}><div className="flex items-center gap-2">Fecha {getSortIcon('Fecha')}</div></th>
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('FechaCreacion')}><div className="flex items-center gap-2">Creada {getSortIcon('FechaCreacion')}</div></th>
                                <th className="p-4 font-semibold relative group cursor-pointer select-none hover:bg-slate-100" style={{ width: `${employeeColumnWidth}px` }} onClick={() => handleSort('EmpleadoNombre')}>
                                    <div className="flex items-center gap-2">Empleado {getSortIcon('EmpleadoNombre')}</div>
                                    <div onMouseDown={handleResizeMouseDown} onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-slate-200/50 z-20"><GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" /></div>
                                </th>
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('Severidad')}><div className="flex items-center gap-2">Severidad {getSortIcon('Severidad')}</div></th>
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('Estado')}><div className="flex items-center gap-2">Estado {getSortIcon('Estado')}</div></th>
                                
                                {/* 6. ASIGNADO A */}
                                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('AsignadoA')}>
                                    <div className="flex items-center gap-2">
                                        Asignado A {getSortIcon('AsignadoA')}
                                    </div>
                                </th>
                                <th className="p-4 w-24 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedIncidents.length > 0 ? processedIncidents.map((inc) => (
                                <tr key={inc.IncidenciaId} className="hover:bg-slate-50 transition-colors group">
                                    {/* Celdas ID, Fecha, Empleado, Severidad, Estado - Igual que antes */}
                                    <td className="p-4 text-center font-mono text-slate-400 group-hover:text-[--theme-500]"><div className="flex items-center justify-center gap-1"><Hash size={12} />{inc.IncidenciaId}</div></td>
                                    <td className="p-4 font-medium text-slate-700">{formatDateSafe(inc.Fecha)}</td>
                                    <td className="p-4 text-xs text-slate-500">{formatDateSafe(inc.FechaCreacion)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-between group">
                                            <div className="flex-1 min-w-0">
                                                <Tooltip text={inc.EmpleadoNombre}><span className="font-medium text-slate-900 truncate block">{inc.EmpleadoNombre}</span></Tooltip>
                                                <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                    <p className="font-mono col-span-1 truncate">ID: {inc.EmpleadoCodRef}</p>
                                                    <p className="col-span-1 flex items-center gap-1.5 truncate"><Briefcase size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{inc.Puesto || 'No asignado'}</span></p>
                                                    <p className="col-span-1 flex items-center gap-1.5 truncate"><Building size={12} className="text-slate-400 shrink-0" /> <span className="truncate">{inc.Departamento || 'No asignado'}</span></p>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                <Tooltip text="Ver Ficha de Empleado"><button onClick={() => setViewingEmployeeId(inc.EmpleadoId)} className="p-1 rounded-md text-slate-400 hover:text-[--theme-600] hover:bg-[--theme-50]"><Contact size={18} /></button></Tooltip>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4"><SeverityBadge severity={inc.Severidad} /></td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border
                                            ${inc.Estado === 'Nueva' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                                              inc.Estado === 'Asignada' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                              inc.Estado === 'PorAutorizar' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                              inc.Estado === 'Resuelta' ? 'bg-green-50 text-green-700 border-green-100' :
                                              'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                            {inc.Estado}
                                        </span>
                                    </td>
                                    
                                    <td className="p-4">
                                        {inc.AsignadoA ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <User size={14} className="text-[--theme-400]"/>
                                                    <span className="text-sm font-medium">{inc.AsignadoA}</span>
                                                </div>
                                                {inc.RolAsignado && <span className="text-[10px] text-slate-400 ml-5 bg-slate-100 px-1.5 rounded w-fit">{inc.RolAsignado}</span>}
                                            </div>
                                        ) : <span className="text-xs text-slate-400 italic flex items-center gap-1"><Shield size={12}/> Sin Asignar</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button onClick={() => handleOpenModal(inc.IncidenciaId)} className="text-[--theme-600] hover:text-[--theme-800] font-semibold text-xs hover:underline underline-offset-2 decoration-[--theme-200]">Gestionar</button>
                                    </td>
                                </tr>
                            )) : (
                                !isLoading && (
                                    <tr className="border-none">
                                        <td colSpan={8}>
                                            <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                                                <CheckCircle size={48} className="mb-4 opacity-20" />
                                                <p>Todo limpio. No hay incidencias que coincidan.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
                {isLoading && <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-50"><RefreshCw className="animate-spin text-[--theme-600]" size={32} /></div>}
            </div>

            <IncidentDetailModal isOpen={isModalOpen} onClose={handleCloseModal} incidentId={selectedIncidentId} onRefresh={loadIncidents} />
            {viewingEmployeeId && <EmployeeProfileModal employeeId={viewingEmployeeId as any} onClose={() => setViewingEmployeeId(null)} getToken={getToken} user={user} />}
        </div>
    );
};