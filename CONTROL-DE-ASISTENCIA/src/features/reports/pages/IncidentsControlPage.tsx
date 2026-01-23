// src/features/reports/pages/IncidentsControlPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Play, RefreshCw, AlertTriangle, BadgeAlert, User, Shield, Hash, Info, 
    Building, Briefcase, Tag, MapPin, Contact, GripVertical, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { API_BASE_URL } from '../../../config/api';
import { useNotification } from '../../../context/NotificationContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { IncidentDetailModal } from '../components/IncidentDetailModal';
import { AttendanceToolbar, FilterConfig } from '../../attendance/AttendanceToolbar';
import { AttendanceToolbarProvider, useAttendanceToolbarContext } from '../../attendance/AttendanceToolbarContext';
import { Tooltip } from '../../../components/ui/Tooltip';
import { EmployeeProfileModal } from '../../attendance/EmployeeProfileModal';

// --- Componente interno para badges (sin cambios) ---
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
    const { getToken, user } = useAuth(); // Necesitamos 'user' para los catálogos de filtros
    const { addNotification } = useNotification();
    
    const { 
        filters, setFilters, dateRange
    } = useAttendanceToolbarContext();

    // Estados locales (específicos de esta página)
    const [incidents, setIncidents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const [selectedIncidentId, setSelectedIncidentId] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingEmployeeId, setViewingEmployeeId] = useState<number | null>(null);

    // --- ESTADO PARA ORDENAMIENTO Y REDIMENSIONADO ---
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'Fecha',
        direction: 'desc'
    });

    const [employeeColumnWidth, setEmployeeColumnWidth] = useState(() => {
        try {
            const saved = localStorage.getItem('incidents_col_width');
            return saved ? Math.max(250, Math.min(parseInt(saved), 600)) : 350;
        } catch { return 350; }
    });

    // --- CONFIGURACIÓN DE FILTROS DESPLEGABLES ---
    const filterConfigurations: FilterConfig[] = useMemo(() => {
        const configs: FilterConfig[] = [
            {
                id: 'departamentos',
                title: 'Departamentos',
                icon: <Building />,
                options: user?.Departamentos?.map(d => ({ value: d.DepartamentoId, label: d.Nombre })) || [],
                selectedValues: filters.depts,
                onChange: (vals) => setFilters((f: any) => ({ ...f, depts: vals as number[] })),
                isActive: user?.activeFilters?.departamentos ?? false,
            },
            {
                id: 'gruposNomina',
                title: 'Grupos Nómina',
                icon: <Briefcase />,
                options: user?.GruposNomina?.map(g => ({ value: g.GrupoNominaId, label: g.Nombre })) || [],
                selectedValues: filters.groups,
                onChange: (vals) => setFilters((f: any) => ({ ...f, groups: vals as number[] })),
                isActive: user?.activeFilters?.gruposNomina ?? false,
            },
            {
                id: 'puestos',
                title: 'Puestos',
                icon: <Tag />,
                options: user?.Puestos?.map(p => ({ value: p.PuestoId, label: p.Nombre })) || [],
                selectedValues: filters.puestos,
                onChange: (vals) => setFilters((f: any) => ({ ...f, puestos: vals as number[] })),
                isActive: user?.activeFilters?.puestos ?? false,
            },
            {
                id: 'establecimientos',
                title: 'Establecimientos',
                icon: <MapPin />,
                options: user?.Establecimientos?.map(e => ({ value: e.EstablecimientoId, label: e.Nombre })) || [],
                selectedValues: filters.estabs,
                onChange: (vals) => setFilters((f: any) => ({ ...f, estabs: vals as number[] })),
                isActive: user?.activeFilters?.establecimientos ?? false,
            }
        ];
        return configs.filter(c => c.isActive && c.options.length > 0);
    }, [user, filters, setFilters]);

    // --- CARGA DE DATOS ---
    const loadIncidents = useCallback(async () => {
        if (!dateRange || dateRange.length === 0) return; // Protección

        setIsLoading(true);
        const token = getToken();
        if (!token) return;

        try {
            // Nota: dateRange ahora es un array de fechas [start, ..., end]
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

    // Recargar cuando cambian fechas (el hook actualiza dateRange automáticamente)
    useEffect(() => {
        loadIncidents();
    }, [loadIncidents]);

    // --- FILTRADO Y ORDENAMIENTO ---
    const processedIncidents = useMemo(() => {
        let data = incidents.filter(inc => {
            // 1. Búsqueda por texto (Nombre o ID)
            if (filters.search) {
                const term = filters.search.toLowerCase();
                const textMatch = 
                    inc.EmpleadoNombre?.toLowerCase().includes(term) ||
                    inc.EmpleadoCodRef?.toLowerCase().includes(term) ||
                    inc.IncidenciaId?.toString().includes(term);
                if (!textMatch) return false;
            }
            
            // Nota: Los filtros de departamentos/grupos se aplican idealmente en el backend o aquí si tienes los IDs en 'inc'.
            // Como el backend (SP) ya filtra por usuario permitido, aquí asumimos filtrado por fecha es lo principal.
            
            return true;
        });

        // 2. Ordenamiento
        return data.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Manejo especial para campos específicos si es necesario
            if (sortConfig.key === 'EmpleadoNombre') {
                aValue = a.EmpleadoNombre || '';
                bValue = b.EmpleadoNombre || '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [incidents, filters.search, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

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
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />;
    };

    const runAnalysis = async () => {
        if (!dateRange || dateRange.length === 0) return;

        setIsAnalyzing(true);
        const token = getToken();
        try {
            const response = await fetch(`${API_BASE_URL}/incidents/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    startDate: format(dateRange[0], 'yyyy-MM-dd'), 
                    endDate: format(dateRange[dateRange.length - 1], 'yyyy-MM-dd') 
                })
            });
            
            if (!response.ok) throw new Error('Error al ejecutar el análisis.');
            const result = await response.json();
            addNotification('Análisis Completado', `Se detectaron ${result.IncidenciasGeneradas || 0} nuevas discrepancias.`, 'success');
            await loadIncidents();
        } catch (err: any) {
            addNotification('Error de Análisis', err.message, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // --- MODALES ---
    const handleOpenModal = (incidentId: number) => { setSelectedIncidentId(incidentId); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedIncidentId(null); };
    
    const formatDateSafe = (dateString: string) => {
        if (!dateString) return '-';
        try {
            const cleanDate = dateString.substring(0, 10); 
            const date = new Date(cleanDate + 'T12:00:00'); 
            if (isNaN(date.getTime())) return '-';
            return format(date, 'dd MMM', { locale: es });
        } catch (e) { return '-'; }
    };

    return (
        <div className="space-y-3 animate-fade-in h-full flex flex-col">
            {/* CABECERA Y BOTÓN DE ANÁLISIS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Tablero de Incidencias</h2>
                    <p className="text-slate-500 text-sm">Gestiona discrepancias y excepciones de nómina.</p>
                </div>
                <button 
                    onClick={runAnalysis}
                    disabled={isAnalyzing || isLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold shadow-sm transition-all ${isAnalyzing ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}`}
                >
                    {isAnalyzing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    {isAnalyzing ? 'Analizando...' : 'Ejecutar Análisis'}
                </button>
            </div>

            {/* BARRA DE HERRAMIENTAS UNIFICADA */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <AttendanceToolbar
                    filterConfigurations={filterConfigurations}
                />
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-auto h-full">
                    <table className="w-full text-sm text-left table-fixed">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b tracking-wider sticky top-0 z-10">
                            <tr>
                                {/* 1. ID (PRIORIDAD INCIDENCIA) */}
                                <th className="p-4 w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('IncidenciaId')}>
                                    <div className="flex items-center justify-center gap-2">
                                        ID {getSortIcon('IncidenciaId')}
                                    </div>
                                </th>

                                {/* 2. FECHA */}
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('Fecha')}>
                                    <div className="flex items-center gap-2">
                                        Fecha {getSortIcon('Fecha')}
                                    </div>
                                </th>

                                {/* 3. EMPLEADO (RESIZABLE) */}
                                <th 
                                    className="p-4 font-semibold relative group cursor-pointer select-none hover:bg-slate-100 transition-colors"
                                    style={{ width: `${employeeColumnWidth}px` }}
                                    onClick={() => handleSort('EmpleadoNombre')}
                                >
                                    <div className="flex items-center gap-2">
                                        Empleado
                                        {getSortIcon('EmpleadoNombre')}
                                    </div>
                                    <div
                                        onMouseDown={handleResizeMouseDown}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute right-0 top-0 h-full w-4 cursor-col-resize flex items-center justify-center hover:bg-slate-200/50 transition-colors z-20"
                                    >
                                        <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                    </div>
                                </th>

                                {/* 4. SEVERIDAD */}
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('Severidad')}>
                                    <div className="flex items-center gap-2">
                                        Severidad {getSortIcon('Severidad')}
                                    </div>
                                </th>

                                {/* 5. ESTADO */}
                                <th className="p-4 w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('Estado')}>
                                    <div className="flex items-center gap-2">
                                        Estado {getSortIcon('Estado')}
                                    </div>
                                </th>

                                {/* 6. ASIGNADO A */}
                                <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('AsignadoA')}>
                                    <div className="flex items-center gap-2">
                                        Asignado A {getSortIcon('AsignadoA')}
                                    </div>
                                </th>

                                {/* 7. ACCIÓN */}
                                <th className="p-4 w-24 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedIncidents.length > 0 && processedIncidents.map((inc) => (
                                <tr key={inc.IncidenciaId} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 text-center font-mono text-slate-400 group-hover:text-indigo-500 transition-colors">
                                        <div className="flex items-center justify-center gap-1">
                                            <Hash size={12} />{inc.IncidenciaId}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-700">
                                        {formatDateSafe(inc.Fecha)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-between group">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Tooltip text={inc.EmpleadoNombre}>
                                                        <span className="font-medium text-slate-900 truncate">{inc.EmpleadoNombre}</span>
                                                    </Tooltip>
                                                </div>
                                                <div className="grid grid-cols-3 gap-x-3 text-xs text-slate-500 mt-1 w-full">
                                                    <Tooltip text={`ID: ${inc.EmpleadoCodRef}`}>
                                                        <p className="font-mono col-span-1 truncate">ID: {inc.EmpleadoCodRef}</p>
                                                    </Tooltip>
                                                    <Tooltip text={inc.Puesto || 'No asignado'}>
                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{inc.Puesto || 'No asignado'}</span>
                                                        </p>
                                                    </Tooltip>
                                                    <Tooltip text={inc.Departamento || 'No asignado'}>
                                                        <p className="col-span-1 flex items-center gap-1.5 truncate">
                                                            <Building size={12} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{inc.Departamento || 'No asignado'}</span>
                                                        </p>
                                                    </Tooltip>
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                <Tooltip text="Ver Ficha de Empleado">
                                                    <button
                                                        onClick={() => setViewingEmployeeId(inc.EmpleadoId)}
                                                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <Contact size={18} />
                                                    </button>
                                                </Tooltip>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4"><SeverityBadge severity={inc.Severidad} /></td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border
                                            ${inc.Estado === 'Nueva' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                                            ${inc.Estado === 'Asignada' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                                            ${inc.Estado === 'PorAutorizar' ? 'bg-amber-50 text-amber-700 border-amber-100' : ''}
                                            ${inc.Estado === 'Resuelta' ? 'bg-green-50 text-green-700 border-green-100' : ''}
                                            ${inc.Estado === 'Cancelada' ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}
                                        `}>
                                            {inc.Estado}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {inc.AsignadoA ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-slate-700">
                                                    <User size={14} className="text-indigo-400"/>
                                                    <span className="text-sm font-medium">{inc.AsignadoA}</span>
                                                </div>
                                                {inc.RolAsignado && (
                                                    <span className="text-[10px] text-slate-400 ml-5 bg-slate-100 px-1.5 rounded w-fit">
                                                        {inc.RolAsignado}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400 italic flex items-center gap-1">
                                                <Shield size={12}/> Sin Asignar
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => handleOpenModal(inc.IncidenciaId)}
                                            className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs hover:underline underline-offset-2 decoration-indigo-200"
                                        >
                                            Gestionar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            
                            {processedIncidents.length === 0 && !isLoading && (
                                <tr className="border-none">
                                    <td colSpan={7}>
                                        <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                                            <AlertTriangle size={48} className="mb-4 opacity-20" />
                                            <p>{incidents.length === 0 ? "No hay incidencias en este periodo." : "No se encontraron resultados con los filtros actuales."}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <IncidentDetailModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                incidentId={selectedIncidentId}
                onRefresh={loadIncidents}
            />

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